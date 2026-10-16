import {drainableUses} from './drainable.js';
import {definition} from './inventory.js';
import {skillBook,ordinaryLiterature} from './reading.js';
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
// Group display only. Every timed transfer still addresses one real instance.
export function inventoryRows(items,equipment={},containers={}){
 const groups=new Map(),equipped=new Set(Object.values(equipment)),owners=new Set(Object.values(containers).map(c=>c.owner));
 for(const item of items){const {id,container,...state}=item,key=equipped.has(id)||owners.has(id)?id:JSON.stringify(stable(state));let row=groups.get(key);if(!row)groups.set(key,row={item,count:0});row.count++;}
 return [...groups.values()];
}
export function inventoryUseLabel(item){
 const p=definition(item.type).properties;
 if(p.ItemType==='base:weapon'||p.ItemType==='base:container')return 'Equip';
 if(skillBook(p)||ordinaryLiterature(p))return 'Read';
 if(p.CanBandage||p.CantEat)return null;
 if(item.fluid?.amount>0)return 'Drink';
 if(p.ItemType==='base:food'&&p.HungerChange)return 'Eat';
 return null;
}

export function inventoryRemainingLabel(item,count=1){
 if(item.fluid)return Math.round(item.fluid.amount*1000)+' / '+Math.round(item.fluid.capacity*1000)+' mL'+(count>1?' each':'');
 const properties=definition(item.type).properties;
 if(properties.ItemType!=='base:drainable')return '';
 const uses=drainableUses(item,properties);
 return uses+' '+(uses===1?'use':'uses')+' remaining'+(count>1?' each':'');
}
