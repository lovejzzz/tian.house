import {objectOffset} from './scene-object-offset.js';
import {validateWallMounts,wallMountKind} from './scene-wall-mounts.js';
import {WorkshopModel} from './workshop-model.js';
import {PolygonRuntime} from './polygon-runtime.js';

export function objectClosure(scene,ids){
 const selected=new Set(ids);if(!selected.size||[...selected].some(id=>!scene.objects.some(o=>o.id===id)))throw Error('Choose existing objects');
 let changed=true;while(changed){changed=false;for(const o of scene.objects)if(o.hostId&&selected.has(o.hostId)&&!selected.has(o.id)){selected.add(o.id);changed=true;}}
 return selected;
}
export function nudgeSceneObjects(scene,{ids,dx,dy,relativeToHost=false}){
 if(![dx,dy].every(v=>Number.isFinite(v)&&Math.abs(v)<=.5))throw Error('Use a fine movement of at most half a grid cell');
 const selected=objectClosure(scene,ids),next=structuredClone(scene);
 for(const o of next.objects.filter(o=>selected.has(o.id))){
  if(o.wallMounts?.length)throw Error('Wall fixtures follow their supporting wall');
  if(o.hostId&&!selected.has(o.hostId)&&!relativeToHost)throw Error('Move the supporting object with its mounted items, or request relativeToHost fine adjustment');

  const old=objectOffset(o);o.placementOffset=[Math.round((old[0]+dx)*1e6)/1e6,Math.round((old[1]+dy)*1e6)/1e6];objectOffset(o);
 }
 return next;
}
export function moveSceneObjects(scene,{ids,dx,dy}){
 if(![dx,dy].every(Number.isInteger))throw Error('Move objects by whole grid cells');
 const selected=objectClosure(scene,ids),next=structuredClone(scene),levels=new Map(scene.levels.map(l=>[l.id,l.index]));
 for(const item of next.legacy.items)if(item.value.storageTile&&scene.objects.some(o=>selected.has(o.id)&&o.parts.some(p=>item.value.x===o.x+p.dx&&item.value.y===o.y+p.dy&&item.value.z===levels.get(o.levelId)&&item.value.storageTile===p.tile))){item.value.x+=dx;item.value.y+=dy;}
 for(const o of next.objects)if(selected.has(o.id)){
  if(o.wallMounts?.length)throw Error('Move the supporting wall with its fixtures');
  if(o.hostId&&!selected.has(o.hostId))throw Error('Move the supporting object with its mounted items');
  o.x+=dx;o.y+=dy;
 }
 return next;
}
export function copySceneObjects(scene,{ids,dx,dy,copyId}){
 if(![dx,dy].every(Number.isInteger)||typeof copyId!=='string'||!copyId.trim())throw Error('Provide a copy identity and whole grid displacement');
 const selected=objectClosure(scene,ids),next=structuredClone(scene),levels=new Map(scene.levels.map(l=>[l.id,l.index]));
 const remap=id=>copyId+':'+id;
 for(const original of scene.objects)if(selected.has(original.id)){
  if(original.wallMounts?.length)throw Error('Place another fixture on its supporting wall');
  if(original.hostId&&!selected.has(original.hostId))throw Error('Copy the supporting object with its mounted items');
  const o=structuredClone(original);o.id=remap(o.id);o.x+=dx;o.y+=dy;
  if(o.hostId)o.hostId=remap(o.hostId);if(o.groupId)o.groupId=remap(o.groupId);next.objects.push(o);
 }
 for(const item of scene.legacy.items)if(item.value.storageTile&&scene.objects.some(o=>selected.has(o.id)&&o.parts.some(p=>item.value.x===o.x+p.dx&&item.value.y===o.y+p.dy&&item.value.z===levels.get(o.levelId)&&item.value.storageTile===p.tile))){const clone=structuredClone(item);clone.id=remap(clone.id);clone.value.x+=dx;clone.value.y+=dy;next.legacy.items.push(clone);}
 return next;
}
export function removeSceneObjects(scene,{ids}){
 const selected=objectClosure(scene,ids),next=structuredClone(scene),levels=new Map(scene.levels.map(l=>[l.id,l.index]));
 // Keep stocked supplies as loose items when their container is removed.
 for(const item of next.legacy.items)if(item.value.storageTile&&scene.objects.some(o=>selected.has(o.id)&&o.parts.some(p=>item.value.x===o.x+p.dx&&item.value.y===o.y+p.dy&&item.value.z===levels.get(o.levelId)&&item.value.storageTile===p.tile)))delete item.value.storageTile;
 next.objects=next.objects.filter(o=>!selected.has(o.id));
 return next;
}
export function compileSceneObjects(scene,plan,properties){
 if(!scene.objects.length)return plan;
 const model=new WorkshopModel({...plan,items:[]},scene.bounds,properties),geometry=new PolygonRuntime(plan.polygonGeometry),remaining=[...scene.objects],done=new Set(),levels=new Map(scene.levels.map(l=>[l.id,l.index]));
 for(const o of remaining){objectOffset(o);
  if(typeof o.assetId!=='string'||typeof o.assetVersion!=='string'||![o.x,o.y].every(Number.isInteger)||!levels.has(o.levelId)||!Array.isArray(o.parts)||!o.parts.length||o.parts.length>100||o.parts.some(p=>![p.dx,p.dy].every(Number.isInteger)||Math.abs(p.dx)>100||Math.abs(p.dy)>100||!properties[p.tile]))throw Error('Invalid object instance');
  validateWallMounts(scene,o,properties);
  if(o.hostId&&!scene.objects.some(h=>h.id===o.hostId))throw Error('Object support is missing');
 }
 while(remaining.length){
  const index=remaining.findIndex(o=>!o.hostId||done.has(o.hostId));if(index<0)throw Error('Object support cycle');const o=remaining.splice(index,1)[0],z=levels.get(o.levelId);
  const footprint=new Set(o.parts.map(p=>(o.x+p.dx)+','+(o.y+p.dy)));
  for(const p of o.parts)for(const [axis,dx,dy]of [['W',1,0],['N',0,1]]){
   const x=o.x+p.dx+dx,y=o.y+p.dy+dy;if(!footprint.has(x+','+y))continue;
   const structural=scene.walls.some(w=>w.levelId===o.levelId&&w.axis===axis&&w.x===x&&w.y===y),legacy=model.square(x,y,z)?.tiles.some(t=>['Wall','door','Window','window','collide'].some(k=>k+axis in (properties[t]||{})));
   if(structural||legacy)throw Error('Furniture cannot span across a wall');
  }

  for(const part of o.parts){
   const x=o.x+part.dx,y=o.y+part.dy,sq=model.square(x,y,z),p=properties[part.tile];
   if(!o.wallMounts?.length&&plan.polygonGeometry?.walls.some(w=>w.axis.startsWith('D')&&w.z===z&&w.x===x&&w.y===y))throw Error('Keep furniture clear of diagonal walls');
   if(!wallMountKind(p)&&p.TianMount!=='ceiling'&&(!geometry.floorCoversCell(sq?.tiles.filter(t=>model.isFloor(t))||[],x,y,z)||sq.tiles.includes('workshop_pool_water')))throw Error('Place objects on a supported floor');
   if(p.TianMount==='table'){
    const host=scene.objects.find(h=>h.id===o.hostId);if(!host||!host.parts.some(h=>host.x+h.dx===x&&host.y+h.dy===y&&'IsTable'in properties[h.tile]))throw Error('Tabletop object must reference its supporting furniture');
   }
   if(!p.TianMount&&('solid'in p||'solidtrans'in p)&&sq.tiles.some(t=>'solid'in (properties[t]||{})||'solidtrans'in (properties[t]||{})))throw Error('Objects overlap; leave room for the whole group');
  }
  const result=model.place({parts:o.parts},o.x,o.y,z);if(!result.ok)throw Error(result.reason);done.add(o.id);
 }
 const result=model.export();result.items=structuredClone(plan.items);return result;
}
