const f=Math.fround;
const javaInt=n=>Number.isNaN(n)?0:Math.max(-2147483648,Math.min(2147483647,Math.trunc(n)))||0;
export const foodFloatFields=['hunger','boredom','unhappy','thirst','painReduction','endurance','stress','fatigue','calories','carbohydrates','proteins','lipids'];
export const foodIntFields=['fluReduction','foodSickness','poisonPower'];
export function foodMaxUses(state){return state.baseHunger===0?1:javaInt(Math.abs(f(f(state.baseHunger)*100)));}
export function foodCurrentUses(state){return state.baseHunger===0?state.uses:javaInt(Math.abs(f(f(state.hunger)*100)));}
export function foodSicknessChange(state){
 const divisor=state.burnt?3:state.age>=state.offAge&&state.age<state.offAgeMax?1.3:state.age>=state.offAgeMax?2.2:1;
 return javaInt(divisor===1&&state.cooked?f(f(state.foodSickness)*f(1.3)):f(f(state.foodSickness)/f(divisor)));
}
export function multiplyFoodValues(state,factor){
 const out={...state};factor=f(factor);
 for(const key of foodFloatFields)out[key]=f(f(state[key])*factor);
 for(const key of foodIntFields)out[key]=javaInt(f(f(key==='foodSickness'?foodSicknessChange(state):state[key])*factor));
 return out;
}
export function setFoodCurrentUses(state,requested){
 requested=Math.max(0,requested);
 if(state.baseHunger===0)return {...state,uses:requested};
 const consumed=f(f(foodCurrentUses(state)-requested)/100),factor=f(1-Math.abs(f(consumed/f(state.hunger))));
 return multiplyFoodValues(state,factor);
}
export function foodState(item,p){
 const context={age:f((item.ageHours??0)/24),burnt:!!item.burnt,cooked:!!item.cooked};
 if(item.foodValues)return {...item.foodValues,...context};
 const state={baseHunger:f(f(Number(p.HungerChange??0))/100),uses:item.currentUses??1,offAge:Number(p.DaysFresh??1000000000),offAgeMax:Number(p.DaysTotallyRotten??1000000000),...context};
 const mapping={hunger:'HungerChange',boredom:'BoredomChange',unhappy:'UnhappyChange',thirst:'ThirstChange',painReduction:'PainReduction',endurance:'EnduranceChange',stress:'StressChange',fatigue:'FatigueChange',calories:'Calories',carbohydrates:'Carbohydrates',proteins:'Proteins',lipids:'Lipids',fluReduction:'FluReduction',foodSickness:'FoodSicknessChange',poisonPower:'PoisonPower'};
 for(const [key,property]of Object.entries(mapping)){const n=f(Number(p[property]??0));state[key]=['hunger','thirst','endurance','stress','fatigue'].includes(key)?f(n/100):n;}
 // Legacy portion has already been consumed. Reconstruct stored values without
 // applying age-dependent getter modifiers a second time during migration.
 if(item.portion!==1){for(const key of foodFloatFields)state[key]=f(state[key]*f(item.portion));for(const key of foodIntFields)state[key]=javaInt(f(state[key]*f(item.portion)));}
 return state;
}
export function validateFoodState(item,p){
 const state=item.foodValues;if(state===undefined)return;
 if(p.ItemType!=='base:food'||!state||[...foodFloatFields,...foodIntFields,'baseHunger','uses','age','offAge','offAgeMax'].some(key=>!Number.isFinite(state[key]))||typeof state.cooked!=='boolean'||typeof state.burnt!=='boolean'||[...foodIntFields,'uses'].some(key=>!Number.isInteger(state[key])||state[key]<-2147483648||state[key]>2147483647))throw Error('Invalid food usage state');
}
