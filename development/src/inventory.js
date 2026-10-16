import {itemEnglishName} from './english.js';
import {catalogCraftRegistry,resolveCraftItemInput} from './craft-resolve.js';
import {initializeRecipeMagazine} from './recipe-knowledge.js';
import {ordinaryCraftUse} from './item-use.js';
import {drainableMaxUses,itemUseDelta,drainableUses,drainableFraction,updateDrainableWeight,validateDrainableWeight} from './drainable.js';
import {copyDepletionCondition,validateDepletionTarget} from './depletion.js';
import {foodState,foodCurrentUses,setFoodCurrentUses,multiplyFoodValues,validateFoodState} from './food-use.js';
import {initializeComic} from './comic-identity.js';
import {initializeModelIndex,validateModelState} from './item-model-state.js';
// Instance identities and container graph. Catalog data are source-static;
// individual rules require separately recorded source-runtime comparisons.
export const ALIASES={water:'Base.WaterBottle',beans:'Base.TinnedBeans',cereal:'Base.Cereal',bandage:'Base.Bandage',bat:'Base.BaseballBat',axe:'Base.Axe',knife:'Base.KitchenKnife',plank:'Base.Plank',nails:'Base.Nails',hammer:'Base.Hammer',rag:'Base.RippedSheets',seeds:'Base.TomatoSeed',book:'Base.BookCarpentry1',lighter:'Base.Lighter',rawfood:'Base.Steak',meal:'Base.Steak',pen:'Base.BluePen',opener:'Base.TinOpener',backpack:'Base.Bag_Schoolbag'};
let definitions={},craftRegistry;
export function resolveInventoryCraftInput(input){if(!craftRegistry)throw Error('Item catalog is not loaded');return resolveCraftItemInput(input,craftRegistry);}
export function setItemCatalog(catalog){if(catalog.schema_version!==1||!catalog.items)throw Error('Invalid item catalog');definitions=catalog.items;craftRegistry=catalogCraftRegistry(definitions);}
export function itemType(type){return ALIASES[type]||type;}
export function definition(type){const d=definitions[itemType(type)];if(!d)throw Error(`Missing item definition: ${type}`);if(d.unresolved_override)throw Error(`Unresolved item definition conflict: ${type}`);d.name=itemEnglishName({...d,type:itemType(type)});return d;}
export function inventoryState(){return {nextId:1,items:{},containers:{player:{id:'player',name:'Inventory',capacity:50,items:[],owner:null}},equipment:{}};}
const ok=()=>({ok:true}),fail=reason=>({ok:false,reason});
export class Inventory{
 constructor(state,{modelRandom,literatureRandom}={}){this.state=state;this.modelRandom=modelRandom;this.literatureRandom=literatureRandom;}
 container(id,name=id,capacity=50,owner=null){if(!this.state.containers[id])this.state.containers[id]={id,name,capacity,owner,items:[]};return this.state.containers[id];}
 list(id='player'){return (this.state.containers[id]?.items||[]).map(i=>this.state.items[i]);}
 root(id){const seen=new Set();while(this.state.containers[id]?.owner){if(seen.has(id))throw Error('Container cycle');seen.add(id);id=this.state.items[this.state.containers[id].owner]?.container;}return id;}
 create(type,container='player',overrides={}){type=itemType(type);const d=definition(type),p=d.properties,id=`item-${this.state.nextId++}`;
  const c=this.state.containers[container];if(!c)throw Error('The destination container does not exist');
  const fluid=d.components?.find(c=>c.header==='component FluidContainer');
  const fields=Object.fromEntries((fluid?.values||[]).filter(v=>v.includes('=')).map(v=>v.split('=').map(s=>s.trim())));
  const item={id,type,container,condition:Number(p.ConditionMax)||10,portion:1,fluid:fluid?{type:'Water',amount:0,capacity:Number(fields.Capacity)||1}:null,favorite:false,ageHours:0,...(p.HeadCondition!==undefined?{headCondition:Number(p.HeadCondition)}:{}),...overrides};
  item.id=id;item.type=type;item.container=container;
  if(p.ItemType==='base:drainable'&&item.currentUses===undefined)item.currentUses=drainableMaxUses(itemUseDelta(p));
  if(p.ItemType==='base:drainable'&&item.drainableWeight===undefined)item.drainableWeight=this.updatedDrainableWeight(item,p);
  if(p.ItemType==='base:food'&&item.foodValues===undefined)item.foodValues=foodState(item,p);
  initializeModelIndex(item,p,this.modelRandom);
  initializeComic(item,p,d.name,this.literatureRandom);
  // Caller-provided instance state must never override identity/type/ownership.
  item.id=id;item.type=type;item.container=container;initializeRecipeMagazine(item,p);this.state.items[id]=item;c.items.push(id);
  if(p.ItemType==='base:container')this.container(id,d.name,Number(p.Capacity)||0,id);
  return item;
 }
 count(type,container='player'){return this.list(container).filter(i=>i.type===itemType(type)).length;}
 useCraftItem(id,requested=1,options={}){
  const item=this.state.items[id];if(!item)return {used:0,remaining:0,remove:false};
  const p=definition(item.type).properties;
  if(!Number.isInteger(requested)||requested<0||requested>2147483647)throw Error('Invalid crafting use count');
  const drainable=p.ItemType==='base:drainable',food=p.ItemType==='base:food',foodBefore=food?foodState(item,p):null,current=food?foodCurrentUses(foodBefore):drainable?drainableUses(item,p):item.currentUses??1;
  const result=ordinaryCraftUse(current,requested,{...options,disappearOnUse:p.DisappearOnUse!==false});
  let replacement,properties;
  if(drainable&&result.remaining<=0&&p.ReplaceOnDeplete){
   replacement=p.ReplaceOnDeplete.includes('.')?p.ReplaceOnDeplete:`${item.type.split('.')[0]}.${p.ReplaceOnDeplete}`;
   // Resolve before mutation so an unsupported catalog cannot silently lose items.
   properties=definition(replacement).properties;validateDepletionTarget(properties);
  }
  if(food&&!options.keep){
   const next=setFoodCurrentUses(foodBefore,result.remaining);
   result.remaining=foodCurrentUses(next);result.remove=!!options.destroy||(result.remaining<=0&&p.DisappearOnUse!==false);
   if(!result.remove)validateFoodState({foodValues:next},p);
   item.foodValues=next;
   if(next.baseHunger!==0)item.portion=Math.max(0,Math.min(1,Math.fround(next.hunger/next.baseHunger)));
  }else if(!food)item.currentUses=result.remaining;
  if(drainable&&!options.keep)item.drainableWeight=this.updatedDrainableWeight(item,p);
  // Native UseItem creates depletion outputs before removing the consumed item.
  // This is independent of keep/destroy; an already empty kept item can replace.
  if(replacement)for(let i=0;i<Number(properties.Count??1);i++){
   const output=this.create(replacement,item.container);
   copyDepletionCondition(item,output,p,properties);
  }
  if(result.remove)this.remove(id);return result;
 }
 find(type,container='player'){return this.list(container).find(i=>i.type===itemType(type));}
 updatedDrainableWeight(item,p=definition(item.type).properties){
  const fullWeight=Math.fround(Number(p.Weight??0)),hasReplacement=p.ReplaceOnDeplete!==undefined&&p.ReplaceOnDeplete!==null;
  const type=hasReplacement?(p.ReplaceOnDeplete.includes('.')?p.ReplaceOnDeplete:`${item.type.split('.')[0]}.${p.ReplaceOnDeplete}`):null;
  const replacement=type?definitions[type]:undefined;
  return updateDrainableWeight(item.drainableWeight??{actualWeight:fullWeight,weight:fullWeight,customWeight:false},{fullWeight,emptyWeight:Number(p.WeightEmpty??0),hasReplacement,replacementWeight:replacement?Number(replacement.properties.Weight??0):undefined,fraction:drainableFraction(drainableUses(item,p),itemUseDelta(p))});
 }
 actualWeight(item){const p=definition(item.type).properties,base=p.ItemType==='base:drainable'?(item.drainableWeight??this.updatedDrainableWeight(item,p)).actualWeight:Number(p.Weight||0)*item.portion;return base+(item.fluid?.amount||0)+(this.state.containers[item.id]?this.weight(item.id):0);}
 // Plain-item multiplier observed in native 42.21.0; bag override derived
 // from InventoryContainer.getEquippedWeight, still awaiting bag UI parity.
 carriedWeight(item){if(!Object.values(this.state.equipment).includes(item.id))return this.actualWeight(item);const contents=this.state.containers[item.id]?this.weight(item.id):0,p=definition(item.type).properties;
  return (this.actualWeight(item)-contents)*.3+contents*(1-Math.max(0,Math.min(100,Number(p.WeightReduction)||0))/100);}
 encumbrance(){return this.list().reduce((n,i)=>n+this.carriedWeight(i),0);}
 unequip(id){for(const[slot,value]of Object.entries(this.state.equipment))if(value===id)delete this.state.equipment[slot];return ok();}
 weight(container='player'){return this.list(container).reduce((n,i)=>n+this.actualWeight(i),0);}
 canTransfer(id,dest){const item=this.state.items[id],target=this.state.containers[dest];if(!item||!target)return fail('Item or container does not exist');if(item.container===dest)return fail('The item is already in this container');if(item.favorite&&this.root(dest)!=='player')return fail('Unfavorite this item before moving it out of your inventory');
  let cursor=dest;const seen=new Set();while(this.state.containers[cursor]?.owner){if(cursor===id)return fail('A container cannot go inside itself or a child container');if(seen.has(cursor))return fail('Container cycle');seen.add(cursor);cursor=this.state.items[this.state.containers[cursor].owner]?.container;}
  if(dest===id)return fail('A container cannot go inside itself');
  // Enforce every enclosing container, accounting for moves inside that subtree.
  cursor=dest;while(cursor){const c=this.state.containers[cursor];let source=item.container,alreadyInside=false;const visited=new Set();
   while(source){if(source===cursor){alreadyInside=true;break;}if(visited.has(source))return fail('Container cycle');visited.add(source);const owner=this.state.containers[source]?.owner;source=owner?this.state.items[owner]?.container:null;}
   if(!alreadyInside&&this.weight(cursor)+this.actualWeight(item)>c.capacity+1e-7)return fail('Not enough container capacity');cursor=c.owner?this.state.items[c.owner]?.container:null;
  }return ok();
 }
 transfer(id,dest){const checked=this.canTransfer(id,dest);if(!checked.ok)return checked;const item=this.state.items[id],src=this.state.containers[item.container];src.items.splice(src.items.indexOf(id),1);this.state.containers[dest].items.push(id);item.container=dest;for(const[slot,equipped]of Object.entries(this.state.equipment))if(equipped===id)delete this.state.equipment[slot];return ok();}
 remove(id){const item=this.state.items[id];if(!item)return false;if(this.state.containers[id]?.items.length)throw Error('Cannot remove a nonempty container');const c=this.state.containers[item.container];c.items.splice(c.items.indexOf(id),1);delete this.state.items[id];delete this.state.containers[id];for(const[k,v]of Object.entries(this.state.equipment))if(v===id)delete this.state.equipment[k];return true;}
 equip(id,slot='primary'){const item=this.state.items[id];if(!item||item.container!=='player')return fail('Move this item to your inventory first');if(!['primary','secondary','back'].includes(slot))return fail('Invalid equipment slot');const p=definition(item.type).properties;if(slot==='back'&&p.CanBeEquipped!=='base:back')return fail('This item cannot be worn on your back');const prior=this.state.equipment[slot];if(prior&&prior!==id&&this.state.equipment.primary===prior&&this.state.equipment.secondary===prior){delete this.state.equipment.primary;delete this.state.equipment.secondary;}this.state.equipment[slot]=id;if(slot==='primary'&&p.TwoHandWeapon)this.state.equipment.secondary=id;return ok();}
 consumeFood(id,fraction=1){const item=this.state.items[id];if(!item||item.container!=='player')return fail('Item does not exist');const p=definition(item.type).properties;if(p.ItemType!=='base:food'||p.CantEat||!p.HungerChange)return fail('This item cannot be eaten directly');const used=Math.min(item.portion,fraction);if(!(used>0&&used<=1))return fail('Invalid portion');const before=foodState(item,p),thirst=-before.thirst*100*used/item.portion;item.foodValues=multiplyFoodValues(before,Math.fround((item.portion-used)/item.portion));item.portion-=used;const hunger=-Number(p.HungerChange)*used;if(item.portion<1e-7){const replacement=p.ReplaceOnUse;this.remove(id);if(replacement)this.create(replacement);}return {ok:true,hunger,thirst};}
}
export function validateInventory(state){if(!state||!Number.isSafeInteger(state.nextId)||state.nextId<1||!state.items||!state.containers?.player||!state.equipment)throw Error('Invalid saved inventory structure');const inv=new Inventory(state),seen=new Set();
 for(const[id,c]of Object.entries(state.containers)){if(c.id!==id||!Array.isArray(c.items)||!Number.isFinite(c.capacity)||c.capacity<0)throw Error('Invalid saved container');if(c.owner&&(!state.items[c.owner]||c.owner!==id))throw Error('Invalid container owner');for(const uid of c.items){const item=state.items[uid];if(seen.has(uid)||!item||item.id!==uid||item.container!==id)throw Error('Duplicate item or invalid ownership');seen.add(uid);const itemDef=definition(item.type);validateModelState(item,itemDef.properties);validateDrainableWeight(item,itemDef.properties);validateFoodState(item,itemDef.properties);if(item.currentUses!==undefined&&(!Number.isInteger(item.currentUses)||item.currentUses<-2147483648||item.currentUses>2147483647))throw Error("Invalid item uses");if(item.groundOffset&&(!c.ground||!['x','y','z'].every(k=>Number.isFinite(item.groundOffset[k]))||['x','y'].some(k=>item.groundOffset[k]<0||item.groundOffset[k]>1)))throw Error('Invalid ground item coordinates');for(const k of ['worldXRotation','worldYRotation','worldZRotation','worldScale'])if(item[k]!==undefined&&!Number.isFinite(item[k]))throw Error('Invalid item model transform');if(item.headCondition!==undefined&&(!Number.isInteger(item.headCondition)||item.headCondition<0||itemDef.properties.HeadCondition===undefined||item.headCondition>Number(itemDef.properties.HeadConditionMax??itemDef.properties.ConditionMax??10)))throw Error('Invalid item head condition');if(item.condition>(Number(itemDef.properties.ConditionMax)||10))throw Error('Item condition exceeds its maximum');for(const f of ['condition','portion','ageHours'])if(!Number.isFinite(item[f])||item[f]<0)throw Error('Invalid item state');if(item.portion>1)throw Error('Invalid item portion');if(item.fluid&&(!Number.isFinite(item.fluid.amount)||!Number.isFinite(item.fluid.capacity)||item.fluid.amount<0||item.fluid.amount>item.fluid.capacity))throw Error('Invalid fluid state');if(!/^item-\d+$/.test(uid)||Number(uid.slice(5))>=state.nextId)throw Error('Invalid item sequence number');}inv.root(id);}
 if(seen.size!==Object.keys(state.items).length)throw Error('Orphaned item');for(const[slot,id]of Object.entries(state.equipment))if(!['primary','secondary','back'].includes(slot)||state.items[id]?.container!=='player')throw Error('Invalid equipment ownership');return state;
}
