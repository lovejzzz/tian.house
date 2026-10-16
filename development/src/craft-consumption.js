import {definition} from './inventory.js';
import {drainableUses} from './drainable.js';
import {foodState,foodCurrentUses} from './food-use.js';
const f=Math.fround;
const int=n=>Number.isNaN(n)?0:Math.max(-2147483648,Math.min(2147483647,Math.trunc(n)))||0;
export function craftItemUses(item,p=definition(item.type).properties){return p.ItemType==='base:food'?foodCurrentUses(foodState(item,p)):p.ItemType==='base:drainable'?drainableUses(item,p):item.currentUses??1;}
export function craftRelativeScale(input,type){
 const qualified=s=>(s.includes('.')?s:`Base.${s}`).toLowerCase(),index=(input.resolvedItems??input.items).findIndex(t=>qualified(t)===qualified(type));
 const amount=f(index<0?1:input.itemAmounts[index]??input.amount),common=f(input.amount);
 return common===0||amount===0?1:f(amount/common);
}
// Commit already selected/applied item bindings. This does not select materials,
// run child resource consumption, award XP, or create recipe outputs. Callers
// supply retained-tool processing separately and preserve their application order.
export function consumeCraftInputs(inv,bindings,{variableRatio=1,consumedItemIds,onKeepInput}={}){
 for(const {input}of bindings){
  if(!input.resolvedItems&&(input.acceptsAnyItem||(input.itemTags.length&&input.amount!==1)))throw Error('Recipe selectors require resolved item types before consumption');
  if(input.mode==='Keep'&&input.flags.some(flag=>flag.startsWith('MayDegrade'))&&!onKeepInput)throw Error('Retained-tool wear handler required');
 }
 const remaining=bindings.map(({input})=>f(int(input.amount)*(input.amount!==input.maxAmount?f(variableRatio):1)));
 const ids=consumedItemIds??[...new Set(bindings.flatMap(b=>b.itemIds))],items=new Map(ids.map(id=>[id,inv.state.items[id]])),trace=[];
 for(const id of ids)if(!items.get(id))throw Error(`Applied recipe item missing: ${id}`);
 for(const id of ids){const item=items.get(id),p=definition(item.type).properties;
  for(let index=0;index<bindings.length;index++){
   const {input,itemIds}=bindings[index];if(!itemIds.includes(id))continue;
   const count=input.flags.includes('ItemCount');
   if(!count&&(input.hasConsumeFromItem||item.fluid)){trace.push({id,index,skipped:'resource-consumption'});continue;}
   if(input.mode==='Keep')onKeepInput?.(item,input);
   if(!(remaining[index]>f(.00001)))continue;
   const scale=craftRelativeScale(input,item.type),ceiling=f(Math.ceil(remaining[index]));
   const requested=count?craftItemUses(item,p):Math.min(int(f(ceiling*scale)),int(ceiling));
   const destroy=input.mode==='Destroy'||(input.flags.includes('DontReplace')&&(p.ReplaceOnUse!=null||p.ReplaceOnDeplete!=null));
   const result=inv.useCraftItem(id,requested,{keep:input.mode==='Keep',destroy});
   remaining[index]=f(remaining[index]-f((count?1:result.used)/scale));
   trace.push({id,index,requested,...result,remainingInput:remaining[index]});
  }
 }
 return {remaining,trace};
}
