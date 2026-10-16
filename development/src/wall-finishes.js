import {hasOpeningProfile} from './window-profile.js';
import {doorOpening,windowOpening} from './wall-joins.js';
import {fixedGlazing} from './fixed-glazing.js';
import {wallEdgeEndpoints} from './polygon-footprint.js';
import {roomContainsPoint} from './room-footprint.js';

// Sides use the directed edge's left/right half-plane, not a room index or
// avatar position. Shared walls therefore have two stable, independent faces.
export function roomWallSide(room,wall){
 if(!room?.wallIds?.includes(wall.id))throw Error('Wall does not belong to this room');
 const [a,b]=wallEdgeEndpoints(wall),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;
 const positive=roomContainsPoint(room,x-dy/length*.1,y+dx/length*.1),negative=roomContainsPoint(room,x+dy/length*.1,y-dx/length*.1);
 if(positive===negative)throw Error('Cannot resolve the room side of this wall');
 return positive?'positive':'negative';
}
export function visibleWallSide(wall){
 const [a,b]=wallEdgeEndpoints(wall);
 return (b[0]-a[0])-(b[1]-a[1])>=0?'positive':'negative';
}
export function validateWallFinishes(wall,properties){
 if(wall.finishes===undefined)return;
 if(!wall.finishes||Array.isArray(wall.finishes)||typeof wall.finishes!=='object'||Object.keys(wall.finishes).some(k=>!['positive','negative'].includes(k)))throw Error('Invalid wall finishes');
 for(const tile of Object.values(wall.finishes))if(typeof tile!=='string'||!('Wall'+(wall.materialAxis||wall.axis) in (properties[tile]||{})))throw Error('Wall finish must match its material direction');
}
export function finishWall(scene,operation,properties){
 const wall=scene.walls.find(w=>w.id===operation.id);if(!wall)throw Error('Wall not found');
 let side=operation.side;
 if(side==='room'||side==='outside'){
  const room=scene.rooms.find(r=>r.id===operation.roomId),inside=roomWallSide(room,wall);
  side=side==='room'?inside:inside==='positive'?'negative':'positive';
 }
 if(!['positive','negative'].includes(side))throw Error('Choose a wall face');
 wall.finishes={...wall.finishes,[side]:operation.tile};validateWallFinishes(wall,properties);return scene;
}
export function resolveWallFinishes(scene,properties,{finishRoomId}={}){
 const room=finishRoomId===undefined?null:scene.rooms.find(r=>r.id===finishRoomId);
 if(finishRoomId!==undefined&&!room)throw Error('Choose a room for finish inspection');
 for(const wall of scene.walls){
  validateWallFinishes(wall,properties);const opening=scene.openings.find(o=>o.hostWallId===wall.id),axis=wall.materialAxis||wall.axis;
  if(opening&&wall.finishes&&!fixedGlazing(properties[opening.tile]||{},axis)&&!(hasOpeningProfile(properties[opening.tile])))for(const tile of Object.values(wall.finishes))if(!(opening.kind==='door'?doorOpening(tile,axis,properties):windowOpening(tile,axis,properties)))throw Error('Wall finish has no matching opening');
 }
 if(!scene.walls.some(w=>w.finishes))return scene;
 const next=structuredClone(scene);
 for(const wall of next.walls){const side=room?.wallIds.includes(wall.id)?roomWallSide(room,wall):visibleWallSide(wall);wall.tile=wall.finishes?.[side]??wall.tile;}
 return next;
}
