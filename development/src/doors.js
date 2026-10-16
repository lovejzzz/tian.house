import {definition} from './inventory.js';
import {barricadePresent} from './barricades.js';

// ItemContainer.haveThisKeyId descends into key rings, not arbitrary bags.
export function doorKey(inventory,keyId,container='player',seen=new Set()){
 if(!Number.isInteger(keyId)||seen.has(container))return null;
 seen.add(container);
 for(const item of inventory.list(container)){
  const props=definition(item.type).properties;
  if(props.ItemType==='base:key'&&item.keyId===keyId)return item;
  if(item.type.split('.').at(-1)==='KeyRing'||String(props.Tags||'').split(';').includes('base:keyring')){
   const key=doorKey(inventory,keyId,item.id,seen);if(key)return key;
  }
 }
 return null;
}

// Room IDs in the imported map are cell-local. Missing squares are unknown,
// whereas room -1 is the source's null room (including roofed outdoor squares).
function room(world,x,y,z){const sq=world.square(x,y,z);if(!sq)return undefined;return sq.room===-1?null:Number.isInteger(sq.room)?`${Math.floor(x/256)},${Math.floor(y/256)}:${sq.room}`:undefined;}
export function doorInside(world,obj,actor){
 if('forceLocked'in obj.props||world.isExterior(actor.x,actor.y,actor.z))return false;
 if(obj.polygonWall)return actor.z===obj.z;
 const north='doorN'in obj.props||obj.props.type==='doorN';
 const current=room(world,actor.x,actor.y,actor.z);
 return current!==undefined&&(current===room(world,obj.x,obj.y,obj.z)||current===room(world,obj.x-(north?0:1),obj.y-(north?1:0),obj.z));
}

// Ordinary single-player door lock transitions from IsoDoor.ToggleDoorActual.
// Random initial locks, multi-tile obstruction and sounds are separate obligations.
export function doorToggle(world,obj,actor,inventory){
 const state=world.state(obj.x,obj.y,obj.z,obj.tile),props=obj.props;
 if(state.destroyed)return {ok:false,reason:'The door is destroyed'};
 if(barricadePresent(state.barricade)||Object.values(state.barricades||{}).some(barricadePresent))return {ok:false,reason:'The door is barricaded'};
 const hoppable='HoppableN'in props||'HoppableW'in props;
 const inside=doorInside(world,obj,actor),key=doorKey(inventory,state.keyId);
 let locked=state.locked??('forceLocked'in props),lockedByKey=state.lockedByKey??('forceLocked'in props);
 if(hoppable||inside){locked=false;lockedByKey=false;}
 if(locked&&!lockedByKey&&Number.isInteger(state.keyId)&&state.keyId!==-1)lockedByKey=true;
 if(!state.open&&(lockedByKey||state.CustomLock===true)){
  if(!key)return {ok:false,reason:'The door is locked',patch:{locked,lockedByKey}};
  locked=false;lockedByKey=false;
 }
 let allowLocked=!!key;
 if('GarageDoor'in props){
  const north='doorN'in props||props.type==='doorN',value=north?actor.y:actor.x,edge=north?obj.y:obj.x;
  allowLocked='InteriorSide'in props?value>=edge:value<edge;
 }
 if(locked&&!allowLocked&&!state.open)return {ok:false,reason:'The door is locked',patch:{locked,lockedByKey}};
 if(state.obstructed)return {ok:false,reason:'The door is obstructed',patch:{locked,lockedByKey}};
 return {ok:true,patch:{open:!state.open,locked:false,lockedByKey:false}};
}
