// Source-static InventoryItem.damageCheck(addedChance, scale, false) ordering.
// Callers supply setters because head/general damage can synchronously break and
// replace an item. This component does not own those world/inventory effects.
const f=Math.fround;
const javaInt=value=>Number.isNaN(value)?0:Math.max(-2147483648,Math.min(2147483647,Math.trunc(value)));
export function wearDenominator(lowerChance,scale,addedChance=0){
 return javaInt(f(f(f(lowerChance)*f(Math.max(0,scale)))+f(addedChance)));
}
function succeeds(denominator,nextInt){return denominator<=0||nextInt(denominator)===0;}
export function damageCheck({lowerChance,addedChance=0,scale=1,sharpness,head,reduceCondition},nextInt){
 scale=f(Math.max(0,scale));let changed=false;
 if(sharpness){
  const n=(2*wearDenominator(lowerChance,f(scale/2),Math.trunc(addedChance/2)))|0;
  if(succeeds(n,nextInt)){sharpness.reduce();changed=true;}
 }
 if(head){
  const chance=javaInt(f(f(lowerChance)*f(head.lowerChanceMultiplier)));
  if(succeeds(wearDenominator(chance,scale,addedChance),nextInt)){head.reduce();changed=true;}
 }
 if(succeeds(wearDenominator(lowerChance,scale,addedChance),nextInt)){reduceCondition();return true;}
 return changed;
}
