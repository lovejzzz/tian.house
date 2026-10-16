import {definition} from './inventory.js';
// Fractions are of what is left on the real item, not its original serving.
export function mealFraction(item,share){
 const properties=definition(item.type).properties;
 if(properties.ItemType!=='base:food'||properties.CantEat||!properties.HungerChange||![1,.5,.25].includes(share))return null;
 const remaining=item.portion??1;
 return Number.isFinite(remaining)&&remaining>0?remaining*share:null;
}
export function portionLabel(item){
 if(!(item.portion>0&&item.portion<.9999))return '';
 return `${Math.round(item.portion*100)}% remaining`;
}
export function applianceTemperatureChoices(current){
 return [...new Set([100,160,180,200,220,250,current].filter(v=>Number.isFinite(v)&&v>=50&&v<=300))].sort((a,b)=>a-b);
}
