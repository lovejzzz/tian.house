import {roomCells} from './room-footprint.js';
import {fixtureAxis} from './furnishing.js';
import {orientationFamilies} from './catalog-variants.js';
export const wallMountKind=p=>['wall','window'].includes(p?.TianMount)?p.TianMount:null;
export function bindWallMounts(scene,entry,x,y,levelId,properties){
 return entry.parts.map((part,index)=>{
  const p=properties[part.tile]||{},kind=wallMountKind(p),axis=fixtureAxis(p);if(!kind)throw Error('Keep wall fixtures separate from freestanding furniture');
  const wall=scene.walls.find(w=>w.levelId===levelId&&w.axis===axis&&w.x===x+part.dx&&w.y===y+part.dy);if(!wall)throw Error('Attach this to an editable wall');
  const opening=scene.openings.find(o=>o.hostWallId===wall.id);if(p.TianOpeningCompatible==='window'&&opening?.kind==='door')throw Error('Keep the sill clear of doorways');if(kind==='window'&&opening?.kind!=='window')throw Error('Attach drapes to an editable window');
  return {part:index,wallId:wall.id,...(kind==='window'?{openingId:opening.id}:{})};
 });
}
export function captureWallMountHosts(scene){
 return scene?{walls:new Map(scene.walls.map(w=>[w.id,{...w}])),objects:new Set(scene.objects.map(o=>o.id)),fixtures:scene.objects.filter(o=>o.wallMounts?.length).map(o=>structuredClone(o)),levels:new Map(scene.levels.map(l=>[l.id,l.index]))}:null;
}
export function followWallMounts(before,next){
 if(!before)return next;
 const walls=new Map(next.walls.map(w=>[w.id,w])),openings=new Set(next.openings.map(o=>o.id)),removed=new Set();
 for(const o of next.objects){if(!before.objects.has(o.id)||!o.wallMounts?.length)continue;
  if(o.wallMounts.some(m=>!walls.has(m.wallId)||m.openingId&&!openings.has(m.openingId))){removed.add(o.id);continue;}
  const shifts=o.wallMounts.map(m=>{const old=before.walls.get(m.wallId),wall=walls.get(m.wallId);return old?[wall.x-old.x,wall.y-old.y]:[0,0];});
  if(shifts.some(v=>v[0]!==shifts[0][0]||v[1]!==shifts[0][1]))throw Error('Move all walls supporting this fixture together');
  o.x+=shifts[0][0];o.y+=shifts[0][1];
 }
 let changed=true;while(changed){changed=false;for(const o of next.objects)if(o.hostId&&removed.has(o.hostId)&&!removed.has(o.id)){removed.add(o.id);changed=true;}}
 next.objects=next.objects.filter(o=>!removed.has(o.id));
 // Stock belongs to the fixture, not its previous grid square. Rehosting or
 // moving a supporting wall carries it; removing the fixture releases it.
 for(const item of next.legacy.items){const v=item.value;if(!v.storageTile)continue;
  for(const old of before.fixtures||[]){const part=old.parts.findIndex(p=>p.tile===v.storageTile&&old.x+p.dx===v.x&&old.y+p.dy===v.y&&before.levels.get(old.levelId)===v.z);if(part<0)continue;
   const updated=next.objects.find(o=>o.id===old.id),p=updated?.parts[part];if(!p){delete v.storageTile;break;}
   v.x=updated.x+p.dx;v.y=updated.y+p.dy;v.z=next.levels.find(l=>l.id===updated.levelId).index;v.storageTile=p.tile;break;
  }
 }
 return next;
}
export function validateWallMounts(scene,o,properties){
 const mounted=o.parts.some(p=>wallMountKind(properties[p.tile]));
 if(!mounted&&!o.wallMounts)return;
 if(!mounted||o.hostId||!Array.isArray(o.wallMounts)||o.wallMounts.length!==o.parts.length)throw Error('Wall fixture must reference all its supports');
 const seen=new Set();for(const m of o.wallMounts){
  if(!Number.isInteger(m.part)||seen.has(m.part)||!o.parts[m.part])throw Error('Invalid wall fixture support');seen.add(m.part);
  const part=o.parts[m.part],p=properties[part.tile],kind=wallMountKind(p),axis=fixtureAxis(p),wall=scene.walls.find(w=>w.id===m.wallId);
  if(!kind||!wall||wall.levelId!==o.levelId||wall.axis!==axis||wall.x!==o.x+part.dx||wall.y!==o.y+part.dy)throw Error('Wall fixture must stay attached to its supporting wall');
  if(p.TianOpeningCompatible==='window'&&scene.openings.some(v=>v.hostWallId===wall.id&&v.kind==='door'))throw Error('Keep the sill clear of doorways');
  if(kind==='window'&&!scene.openings.some(v=>v.id===m.openingId&&v.hostWallId===wall.id&&v.kind==='window'))throw Error('Window covering must reference its window');
 }
}

export function rehostWallFixture(scene,op,catalog,properties){
 const next=structuredClone(scene),o=next.objects.find(o=>o.id===op.id),entry=catalog.find(e=>e.id===op.assetId);
 if(o?.hostId&&o.parts.every(p=>properties[p.tile]?.TianMount==='table')){
  if(!entry||!(entry.id===o.assetId||(orientationFamilies(catalog,properties).get(o.assetId)||[]).some(e=>e.id===entry.id)))throw Error('Choose a verified orientation of this fixture');
  if(![op.x,op.y].every(Number.isInteger)||!next.levels.some(l=>l.id===op.levelId))throw Error('Choose a valid fixture position');
  if(next.objects.some(child=>child.hostId===o.id))throw Error('Move the mounted assembly together');
  const host=next.objects.find(h=>h.id!==o.id&&h.levelId===op.levelId&&entry.parts.every(p=>h.parts.some(t=>h.x+t.dx===op.x+p.dx&&h.y+t.dy===op.y+p.dy&&'IsTable'in(properties[t.tile]||{}))));
  if(!host)throw Error('Choose a supporting table or counter');
  const oldLevel=next.levels.find(l=>l.id===o.levelId).index,newLevel=next.levels.find(l=>l.id===op.levelId).index;
  for(const item of next.legacy.items)if(item.value.z===oldLevel&&o.parts.some(p=>item.value.x===o.x+p.dx&&item.value.y===o.y+p.dy&&item.value.storageTile===p.tile)){item.value.x+=op.x-o.x;item.value.y+=op.y-o.y;item.value.z=newLevel;const i=o.parts.findIndex(p=>p.tile===item.value.storageTile);item.value.storageTile=entry.parts[i]?.tile||entry.parts[0].tile;}
  Object.assign(o,{x:op.x,y:op.y,levelId:op.levelId,assetId:entry.id,parts:structuredClone(entry.parts),hostId:host.id});return next;
 }
 if(!o?.wallMounts?.length)throw Error('Choose an attached fixture');
 if(!entry||!(orientationFamilies(catalog,properties).get(o.assetId)||[]).some(e=>e.id===entry.id))throw Error('Choose a verified orientation of this fixture');
 if(![op.x,op.y].every(Number.isInteger)||!next.levels.some(l=>l.id===op.levelId))throw Error('Choose a valid fixture position');
 o.x=op.x;o.y=op.y;o.levelId=op.levelId;o.assetId=entry.id;o.parts=structuredClone(entry.parts);o.wallMounts=bindWallMounts(next,entry,o.x,o.y,o.levelId,properties);return next;
}

export function wallFixtureSide(scene,object,wall,properties){
 const face=properties[object.parts[0].tile]?.TianWallSide;
 if(face==='front')return 1;if(face==='opposite')return -1;
 const cells=new Set((scene.rooms||[]).filter(r=>r.levelId===object.levelId).flatMap(r=>roomCells(r).map(([x,y])=>`${x},${y}`)));
 return !cells.has(`${wall.x},${wall.y}`)&&cells.has(`${wall.x-(wall.axis==='W'?1:0)},${wall.y-(wall.axis==='N'?1:0)}`)?-1:1;
}
export function flipWallFixtureSide(scene,{ids},catalog,properties){
 if(!Array.isArray(ids)||!ids.length)throw Error('Select a wall fixture');let next=structuredClone(scene);
 for(const id of ids){const o=next.objects.find(o=>o.id===id);if(!o?.wallMounts?.length)throw Error('Select a wall fixture');validateWallMounts(next,o,properties);const wall=next.walls.find(w=>w.id===o.wallMounts[0].wallId),side=wallFixtureSide(next,o,wall,properties)===1?'opposite':'front';
 const entry=(orientationFamilies(catalog,properties).get(o.assetId)||[]).find(e=>properties[e.source]?.TianWallSide===side&&fixtureAxis(properties[e.source])===wall.axis);if(!entry)throw Error('This fixture has no verified opposite wall face');
 next=rehostWallFixture(next,{id,assetId:entry.id,x:o.x,y:o.y,levelId:o.levelId},catalog,properties);
 }return next;
}
