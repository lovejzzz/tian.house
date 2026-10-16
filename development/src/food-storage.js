import {definition} from './inventory.js';
// Effective age uses imported spoilage thresholds. Cooling rates are a provisional
// gameplay approximation, not a calibrated refrigerator thermal simulation.
export function foodFreshness(item){
 const p=definition(item.type).properties;if(p.ItemType!=='base:food'||item.burnt)return null;
 const age=(item.ageHours??0)/24,fresh=Number(p.DaysFresh??Infinity),rotten=Number(p.DaysTotallyRotten??Infinity);
 if(age>=rotten)return 'Rotten';if(age>=fresh)return 'Stale';
 return Number.isFinite(fresh)||Number.isFinite(rotten)?'Fresh':null;
}
export function advanceFoodAge(inventory,minutes,{electricity=true,containerKind=()=>null}={}){
 if(!(minutes>0)||!Number.isFinite(minutes))return;
 const rates=new Map();
 for(const item of Object.values(inventory.state.items)){
  const p=definition(item.type).properties;if(p.ItemType!=='base:food'||(!Number.isFinite(Number(p.DaysFresh))&&!Number.isFinite(Number(p.DaysTotallyRotten))))continue;
  const root=inventory.root(item.container);let rate=rates.get(root);
  if(rate===undefined){const kind=containerKind(root);rate=electricity?(kind==='freezer'?.02:kind==='fridge'?.2:1):1;rates.set(root,rate);}
  item.ageHours=(item.ageHours??0)+minutes/60*rate;
 }
}
// Use the stored world object's source tile, including namespaced tile IDs. No
// name-based guessing: unrecognized containers age at ambient rate.
export function storedContainerKind(world,id){
 const match=/^world:-?\d+,-?\d+,-?\d+:(.+)$/.exec(id);
 return match?world.props?.(match[1])?.container:null;
}
