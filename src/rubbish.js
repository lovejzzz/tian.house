import {definition} from './inventory.js?v=1d7ffb1877ce';
import {drainableUses} from './drainable.js?v=1d7ffb1877ce';
import {foodFreshness} from './food-storage.js?v=1d7ffb1877ce';
import {KEPT_CARE_ITEMS} from './daily-care.js?v=1d7ffb1877ce';
// Household rubbish routine with real inventory instances: carried rubbish goes
// into a bin (a `container=bin` tile), the bin's contents are tied into an
// imported bin bag, and the full bag is carried out to an outdoor bin. Nothing
// is deleted: rubbish stays physically somewhere, as in a lived-in home.
export const BIN_BAG='Base.Garbagebag',BIN_BAG_BOX='Base.Garbagebag_box';
export const isRubbishBin=object=>object?.props?.container==='bin';
// Full bin bags belong in an outdoor bin, not back in the kitchen pedal bin.
export const isOutdoorBin=object=>isRubbishBin(object)&&object.props.TianOutdoorBin==='true';
// A tied bin bag full of rubbish is itself carried rubbish; other bags/containers are not.
const fullBinBag=(inventory,item)=>item?.type===BIN_BAG&&inventory.list(item.id).length>0;
const carriedLoose=(inventory,item)=>{const equipped=new Set(Object.values(inventory.state.equipment));const owners=new Set(Object.values(inventory.state.containers).map(c=>c.owner).filter(Boolean));
 return item&&item.container==='player'&&!item.favorite&&!equipped.has(item.id)&&(!owners.has(item.id)||fullBinBag(inventory,item));};
// Only genuine rubbish is offered: junk (empty cans, wrappers) and spoiled food
// (burnt or rotten), not tools, edible food, full bottles, washable dirty bandages
// or household consumables PZ files under Junk (toothbrush, toothpaste, toilet
// paper). Fill and spoil state are part of the stack identity, so a full bottle
// never goes out with the empties and a fresh apple never joins a rotten one.
export function isRubbish(item,inventory=null,{outdoor=true}={}){if(!item)return false;if(item.type===BIN_BAG)return outdoor&&!!inventory&&fullBinBag(inventory,item);const p=definition(item.type).properties,tags=String(p.Tags||'');
 if(item.fluid&&item.fluid.amount>0)return false;if(KEPT_CARE_ITEMS.has(item.type))return false;
 if(p.ItemType==='base:food')return !!item.burnt||foodFreshness(item)==='Rotten';
 return p.DisplayCategory==='Junk'||/base:(emptycan|garbage|trash)\b/.test(tags);}
const stackKey=item=>JSON.stringify([item.type,item.fluid?.amount??null,item.condition??null,!!item.burnt,item.burnt?null:foodFreshness(item)]);
export function rubbishStack(inventory,item,options={}){if(!carriedLoose(inventory,item)||!isRubbish(item,inventory,options))return [];const key=stackKey(item);return inventory.list('player').filter(i=>carriedLoose(inventory,i)&&isRubbish(i,inventory,options)&&stackKey(i)===key).map(i=>i.id);}
export function planDiscard(inventory,binId,ids){
 const bin=inventory.state.containers[binId];if(!bin)return {ok:false,reason:'This bin is not available'};
 let free=bin.capacity-inventory.weight(binId);const fitting=[];
 for(const id of ids){const item=inventory.state.items[id];if(!carriedLoose(inventory,item))continue;const w=inventory.actualWeight(item);if(w>free+1e-9)break;free-=w;fitting.push(id);}
 if(!fitting.length)return {ok:false,reason:ids.length?'The bin is full — tie the bag and take it out':'Nothing to throw away'};
 return {ok:true,ids:fitting,left:ids.length-fitting.length};
}
export function completeDiscard(inventory,binId,ids){
 let moved=0;for(const id of ids){const item=inventory.state.items[id];if(!carriedLoose(inventory,item))continue;if(inventory.transfer(id,binId).ok)moved++;}
 return {ok:moved>0,moved,reason:moved?null:'Nothing was thrown away'};
}
// A fresh bag comes from a carried empty bag first, then from a carried box of bags.
export function planBagging(inventory,binId){
 const items=inventory.list(binId);if(!items.length)return {ok:false,reason:'The bin is empty'};
 const carried=inventory.list('player');
 const bag=carried.find(i=>i.type===BIN_BAG&&!inventory.list(i.id).length&&!i.favorite);
 const box=carried.find(i=>i.type===BIN_BAG_BOX&&drainableUses(i,definition(i.type).properties)>0);
 if(!bag&&!box)return {ok:false,reason:'Carry a bin bag or a box of bin bags'};
 return {ok:true,bagId:bag?.id??null,boxId:bag?null:box.id,count:items.length};
}
export function completeBagging(inventory,binId){
 const plan=planBagging(inventory,binId);if(!plan.ok)return plan;
 let bagId=plan.bagId;
 if(!bagId){const used=inventory.useCraftItem(plan.boxId,1);if(!used.used)return {ok:false,reason:'The box of bin bags is empty'};bagId=inventory.create(BIN_BAG,'player').id;}
 let moved=0;for(const item of [...inventory.list(binId)]){if(inventory.transfer(item.id,bagId).ok)moved++;else break;}
 return {ok:true,bagId,moved,left:inventory.list(binId).length};
}
