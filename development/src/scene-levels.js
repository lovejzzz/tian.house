import {roomCells,roomContains,roomsOverlap} from './room-footprint.js';
// Copy the architectural layout, preserving shared edges and opening hosts.
// Furniture and vertical circulation remain explicit, independent operations.
export function copyLevelLayout(scene,{fromLevelId,toIndex,copyId}){
 const source=scene.levels.find(l=>l.id===fromLevelId);
 if(!source)throw Error('Source floor not found');
 if(!Number.isInteger(toIndex)||toIndex===source.index)throw Error('Choose a different floor');
 if(typeof copyId!=='string'||!copyId)throw Error('A copy ID is required');
 const rooms=scene.rooms.filter(r=>r.levelId===source.id);
 if(!rooms.length)throw Error('The source floor has no editable rooms');
 let target=scene.levels.find(l=>l.index===toIndex);
 if(!target){target={id:copyId+':level',index:toIndex,elevation:null,height:null};scene.levels.push(target);}
 if(scene.rooms.some(r=>r.levelId===target.id&&rooms.some(s=>roomsOverlap(s,r))))throw Error('The current floor already has rooms in this area');
 const wallIds=new Set(rooms.flatMap(r=>r.wallIds)),walls=scene.walls.filter(w=>wallIds.has(w.id));
 const id=old=>copyId+':'+old;
 scene.walls.push(...walls.map(w=>({...structuredClone(w),id:id(w.id),levelId:target.id})));
 scene.rooms.push(...rooms.map(r=>({...structuredClone(r),roof:undefined,id:id(r.id),levelId:target.id,wallIds:r.wallIds.map(id),...(r.floorOpenings?{floorOpenings:r.floorOpenings.map(h=>({...structuredClone(h),id:id(h.id)}))}:{})})));
 scene.openings.push(...scene.openings.filter(o=>wallIds.has(o.hostWallId)).map(o=>({...structuredClone(o),id:id(o.id),hostWallId:id(o.hostWallId),...(o.assemblyId?{assemblyId:id(o.assemblyId)}:{})})));
 return scene;
}

// Raise a flat roof and create an editable shell in one structural transaction.
// The existing upper level identity remains stable for stair links and fixtures.
export function addUpperRoom(scene,{roomId,id,name,wallN,wallW}){
 const room=scene.rooms.find(r=>r.id===roomId);
 if(!room||room.roof?.kind!=='flat')throw Error('Choose a room with a flat roof');
 if(typeof id!=='string'||!id||scene.rooms.some(r=>r.id===id))throw Error('Choose a new room ID');
 const source=scene.levels.find(l=>l.id===room.levelId),target=scene.levels.find(l=>l.index===source.index+1);
 if(!target)throw Error('The roof has no upper level');
 if(scene.rooms.some(r=>r.levelId===target.id&&roomsOverlap(room,r)))throw Error('The floor above already has rooms in this area');
 const walls=room.wallIds.map(wid=>scene.walls.find(w=>w.id===wid));
 const copies=walls.map(w=>{
  const copy={...structuredClone(w),id:id+':'+w.id,levelId:target.id};delete copy.locked;
  const tile=(w.materialAxis||w.axis)==='W'?wallW:wallN;
  if(tile){copy.tile=tile;delete copy.finishes;}
  return copy;
 });
 const upper={id,name:name||'Upper room',levelId:target.id,rect:[...room.rect],
  ...(room.cells?{cells:structuredClone(room.cells)}:{}),
  ...(room.polygon?{polygon:structuredClone(room.polygon)}:{}),
  floorTile:room.roof.tile,wallIds:copies.map(w=>w.id),roof:structuredClone(room.roof)};
 delete room.roof;scene.walls.push(...copies);scene.rooms.push(upper);
 return scene;
}
