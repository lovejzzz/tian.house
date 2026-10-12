// 42.21 DrainableComboItem arithmetic uses Java float at every operation.
const f=Math.fround;
const javaInt=n=>Number.isNaN(n)?0:Math.max(-2147483648,Math.min(2147483647,Math.trunc(n)));
export function drainableMaxUses(delta){return javaInt(Math.floor(f(1/f(delta))));}
export function drainableUsesFromFraction(fraction,delta){
 const clamped=Math.min(1,Math.max(0,f(fraction))),quotient=f(clamped/f(delta));
 // Math.round(float) rounds ties toward positive infinity, then saturates to int.
 return javaInt(Math.floor(quotient+.5));
}
export function drainableFraction(uses,delta){return f(f(uses)*f(delta));}
export function itemUseDelta(properties){return f(Number(properties.UseDelta??.03125));}
export function drainableUses(item,properties){return item.currentUses??drainableMaxUses(itemUseDelta(properties));}

// updateWeight mutates actualWeight and weight differently; preserve both and
// preserve old values on no-op paths. All arithmetic is binary32.
export function updateDrainableWeight(previous,{fullWeight,emptyWeight=0,hasReplacement=false,replacementWeight,fraction}){
 const state={...previous},full=f(fullWeight),empty=f(emptyWeight),amount=f(fraction);
 const interpolate=base=>Math.max(0,f(f(f(full-f(base))*amount)+f(base)));
 if(hasReplacement){
  if(amount>=1)return {actualWeight:Math.max(0,full),weight:Math.max(0,full),customWeight:true};
  if(replacementWeight!==undefined){state.actualWeight=interpolate(replacementWeight);state.weight=state.actualWeight;state.customWeight=true;}
 }
 if(empty!==0){state.actualWeight=interpolate(empty);state.customWeight=true;}
 return state;
}
export function validateDrainableWeight(item,properties){
 const state=item.drainableWeight;if(state===undefined)return;
 if(properties.ItemType!=='base:drainable'||!state||typeof state!=='object'||typeof state.customWeight!=='boolean'||['actualWeight','weight'].some(key=>!Number.isFinite(state[key])||state[key]<0))throw Error('Invalid drainable item weight state');
}
