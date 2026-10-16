import {roomCoversCell} from './room-footprint.js';
export const containsCell=(rect,x,y)=>x>=rect[0]&&x<rect[2]&&y>=rect[1]&&y<rect[3];
export function editFloorOpening(scene,operation){
 const room=scene.rooms.find(r=>r.id===operation.roomId);if(!room)throw Error('Choose an editable room');
 if(operation.type==='floorOpening.add'){
  if(scene.levels.find(l=>l.id===room.levelId)?.index<=0)throw Error('Floor openings require an upper floor');
  room.floorOpenings??=[];room.floorOpenings.push(structuredClone(operation.opening));
 }else{const i=room.floorOpenings?.findIndex(h=>h.id===operation.id)??-1;if(i<0)throw Error('Floor opening not found');room.floorOpenings.splice(i,1);}
 return scene;
}
export function validateFloorOpenings(scene,room){
 if(room.floorOpenings===undefined)return;
 if(!Array.isArray(room.floorOpenings)||room.floorOpenings.length>1000)throw Error('Invalid floor openings');
 if(scene.levels.find(l=>l.id===room.levelId)?.index<=0&&room.floorOpenings.length)throw Error('Floor openings require an upper floor');
 const occupied=new Set();for(const h of room.floorOpenings){const r=h.rect,b=room.rect;if(!Array.isArray(r)||r.length!==4||!r.every(Number.isInteger)||r[0]>=r[2]||r[1]>=r[3]||r[0]<b[0]||r[1]<b[1]||r[2]>b[2]||r[3]>b[3])throw Error('Keep the floor opening inside one room');for(let x=r[0];x<r[2];x++)for(let y=r[1];y<r[3];y++){if(!roomCoversCell(room,x,y))throw Error('Keep the floor opening inside one room');const key=x+','+y;if(occupied.has(key))throw Error('Floor openings cannot overlap');occupied.add(key);}}
}
export function validateOpeningContents(scene,plan){
 const openedWalls=new Set(scene.openings.map(o=>o.hostWallId));
 for(const room of scene.rooms){const z=scene.levels.find(l=>l.id===room.levelId).index;for(const h of room.floorOpenings||[]){
  const inside=o=>o.z===z&&containsCell(h.rect,o.x,o.y);
  // North/west boundary sprites are stored in the void's cell even though their
  // geometry lies on its edge. Only authoritative, unopened structural edges
  // qualify; compilation has already checked the adjacent floor support.
  const boundaryTiles=new Map();
  for(const w of scene.walls){
   if(w.levelId!==room.levelId||openedWalls.has(w.id)||!containsCell(h.rect,w.x,w.y))continue;
   if(!(w.axis==='N'&&w.y===h.rect[1]||w.axis==='W'&&w.x===h.rect[0]))continue;
   const key=w.x+','+w.y;let tiles=boundaryTiles.get(key);if(!tiles)boundaryTiles.set(key,tiles=new Set());tiles.add(w.tile);
  }
  if(plan.items.some(inside)||plan.vehicles?.some(inside)||plan.spawn&&inside(plan.spawn))throw Error('Move items, vehicles or the entrance before opening this floor');
  if(plan.squares.some(s=>inside(s)&&s.tiles.some(t=>!t.startsWith('blends_')&&!boundaryTiles.get(s.x+','+s.y)?.has(t))))throw Error('Clear objects and stairs from the floor opening first');
 }}
}
