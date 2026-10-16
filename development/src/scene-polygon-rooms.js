import {hasOpeningProfile} from './window-profile.js';
import {roomWallSide} from './wall-finishes.js';
import {normalizeFootprintPolygon,chamferRectangle,wallEdgeEndpoints} from './polygon-footprint.js';
import {roomCells,roomCoversCell,roomPolygonGeometry,footprintEdges,validateFootprint} from './room-footprint.js';
import {validateStructure} from './scene-structure.js';
import {roofCells} from './scene-roofs.js';
import {diagonalOpening} from './diagonal-openings.js';

const edgeKey=w=>[w.levelId,w.axis,w.x,w.y].join(':');
const rectangle=vertices=>[Math.min(...vertices.map(p=>p[0])),Math.min(...vertices.map(p=>p[1])),Math.max(...vertices.map(p=>p[0])),Math.max(...vertices.map(p=>p[1]))];

// Pure structural edit shared by editor gestures and public build commands.
// Rendering and runtime consume compiler geometry derived from these entities.
export function reshapePolygonRoom(scene,{roomId,vertices}){
 validateStructure(scene);
 const room=scene.rooms.find(r=>r.id===roomId);if(!room)throw Error('Choose an editable room');
 const polygon=normalizeFootprintPolygon(vertices,{bounds:scene.bounds}),rect=rectangle(polygon);
 const next=structuredClone(scene),updated=next.rooms.find(r=>r.id===roomId);
 updated.rect=rect;updated.polygon=polygon;delete updated.cells;validateFootprint(updated);
 const targetEdges=footprintEdges(updated),nextKeys=new Set(targetEdges.map(e=>edgeKey({...e,levelId:room.levelId})));
 const oldWalls=scene.walls.filter(w=>room.wallIds.includes(w.id)),otherOwned=new Set(scene.rooms.filter(r=>r.id!==roomId).flatMap(r=>r.wallIds));
 const removed=oldWalls.filter(w=>!nextKeys.has(edgeKey(w))&&!otherOwned.has(w.id)),removedIds=new Set(removed.map(w=>w.id));
 if(scene.openings.some(o=>removedIds.has(o.hostWallId)))throw Error('Move doors and windows before cutting their supporting wall');
 if(scene.objects.some(o=>o.wallMounts?.some(m=>removedIds.has(m.wallId))))throw Error('Move wall fixtures before cutting their supporting wall');
 const z=scene.levels.find(l=>l.id===room.levelId).index;
 const losesCell=(x,y)=>roomCoversCell(room,x,y)&&!roomCoversCell(updated,x,y);
 if(scene.objects.some(o=>o.levelId===room.levelId&&o.parts.some(p=>losesCell(o.x+p.dx,o.y+p.dy))))throw Error('Move furnishings out of the cut floor first');
 if([...scene.legacy.items,...scene.legacy.vehicles].some(e=>e.value.z===z&&losesCell(Math.floor(e.value.x),Math.floor(e.value.y))))throw Error('Move supplies and vehicles out of the cut floor first');
 const spawn=scene.legacy.metadata.spawn;if(spawn?.z===z&&losesCell(Math.floor(spawn.x),Math.floor(spawn.y)))throw Error('Move the entry point out of the cut floor first');
 if(scene.verticalLinks.some(l=>[l.fromLevelId,l.toLevelId].includes(room.levelId)&&[-1,0,1,2].some(i=>losesCell(l.x+(l.axis==='W'?i:0),l.y+(l.axis==='N'?i:0)))))throw Error('Move stairs and their landing out of the cut floor first');
 // Legacy furniture has no entity footprint; conservatively protect an affected
 // tile record. Ground/room floor layers are dealt with during compilation.
 if(scene.legacy.squares.some(e=>e.value.z===z&&losesCell(e.value.x,e.value.y)&&e.value.tiles.some(t=>!t.startsWith('blends_'))))throw Error('Clear legacy structures and furnishings from the cut floor first');
 if(room.roof){
  if(room.roof.kind!=='flat')throw Error('Use a flat roof before changing its polygon footprint');
  const before=new Set(roofCells(room,z+1).filter(c=>c.full!==false).map(c=>c.x+','+c.y)),after=new Set(roofCells(updated,z+1).filter(c=>c.full!==false).map(c=>c.x+','+c.y));
  const losesRoof=(x,y)=>before.has(x+','+y)&&!after.has(x+','+y),levels=new Map(scene.levels.map(l=>[l.id,l.index]));
  const contents=[...scene.legacy.items,...scene.legacy.vehicles,...scene.legacy.squares].map(e=>e.value);
  if(contents.some(v=>v.z===z+1&&losesRoof(Math.floor(v.x),Math.floor(v.y)))||spawn?.z===z+1&&losesRoof(Math.floor(spawn.x),Math.floor(spawn.y))||scene.objects.some(o=>levels.get(o.levelId)===z+1&&o.parts.some(p=>losesRoof(o.x+p.dx,o.y+p.dy)))||scene.verticalLinks.some(l=>[l.fromLevelId,l.toLevelId].some(id=>levels.get(id)===z+1)&&[-1,0,1,2].some(i=>losesRoof(l.x+(l.axis==='W'?i:0),l.y+(l.axis==='N'?i:0)))))throw Error('Move rooftop contents and stairs out of the cut roof first');
 }
 next.walls=next.walls.filter(w=>!removedIds.has(w.id));
 const byEdge=new Map(next.walls.map(w=>[edgeKey(w),w]));
 const allIds=new Set([...next.levels,...next.rooms,...next.walls,...next.openings,...next.objects,...next.verticalLinks,...next.views,...next.references,...next.references.flatMap(r=>r.annotations||[]),...next.rooms.flatMap(r=>[...(r.roof?[r.roof]:[]),...(r.floorOpenings||[])]),...next.legacy.squares,...next.legacy.items,...next.legacy.vehicles].map(e=>e.id));
 const material=axis=>oldWalls.find(w=>w.axis===axis)?.tile||oldWalls.find(w=>w.materialAxis===axis)?.tile;
 updated.wallIds=targetEdges.map(e=>{
  const key=edgeKey({...e,levelId:room.levelId});let wall=byEdge.get(key);
  if(!wall){let id='wall:'+key,n=1;while(allIds.has(id))id='wall:'+key+':'+n++;allIds.add(id);const materialAxis=e.axis==='W'||e.axis==='D-'?'W':'N',tile=material(materialAxis);if(!tile)throw Error('Keep a source wall material for each orientation');wall={id,levelId:room.levelId,...e,tile,...(e.axis.startsWith('D')?{materialAxis}:{} )};const source=oldWalls.filter(w=>(w.materialAxis||w.axis)===materialAxis).sort((a,b)=>(Math.abs(a.x-e.x)+Math.abs(a.y-e.y))-(Math.abs(b.x-e.x)+Math.abs(b.y-e.y)))[0];
   if(source?.finishes){const oldSide=roomWallSide(room,source),newSide=roomWallSide({...updated,wallIds:[wall.id]},wall);wall.finishes={};for(const side of ['positive','negative'])if(source.finishes[side]!==undefined)wall.finishes[side===oldSide?newSide:newSide==='positive'?'negative':'positive']=source.finishes[side];}
   next.walls.push(wall);byEdge.set(key,wall);}
  return wall.id;
 });
 validateStructure(next);return next;
}
export function chamferRoom(scene,{roomId,corner,distance}){
 const room=scene.rooms.find(r=>r.id===roomId);if(!room)throw Error('Choose an editable room');
 if(room.polygon||room.cells)throw Error('Choose a rectangular room for a corner cut; use outline editing for other shapes');
 return reshapePolygonRoom(scene,{roomId,vertices:chamferRectangle(room.rect,corner,distance)});
}

// Derived values are never authoritative and never stored back into the scene.
// The same payload will feed floor masks, wall rendering and runtime boundaries.
export function compilePolygonRoomGeometry(scene,properties){
 validateStructure(scene);const floors=[],walls=[],levels=new Map(scene.levels.map(l=>[l.id,l.index]));
 for(const room of scene.rooms){if(!room.polygon)continue;if(!('solidfloor'in(properties[room.floorTile]||{})))throw Error('Room material must be a supported floor');
  const z=levels.get(room.levelId);for(const cell of roomPolygonGeometry(room).cells){if(room.floorOpenings?.some(h=>cell.x>=h.rect[0]&&cell.x<h.rect[2]&&cell.y>=h.rect[1]&&cell.y<h.rect[3]))continue;floors.push({roomId:room.id,x:cell.x,y:cell.y,z,tile:room.floorTile,full:cell.full,area:cell.area,polygons:structuredClone(cell.polygons)});}
 }
 for(const wall of scene.walls){const sourceOpening=scene.openings.find(o=>o.hostWallId===wall.id);if(sourceOpening?.kind==='passage')continue;if(!wall.axis.startsWith('D')&&!sourceOpening?.threshold&&!hasOpeningProfile(properties[sourceOpening?.tile]))continue;const materialAxis=wall.materialAxis||wall.axis;if(!['N','W'].includes(materialAxis)||!('Wall'+materialAxis in(properties[wall.tile]||{})))throw Error('Diagonal wall needs a matching source material plane');const [a,b]=wallEdgeEndpoints(wall),opening=diagonalOpening({...wall,materialAxis},sourceOpening,properties);walls.push({id:wall.id,x:wall.x,y:wall.y,z:levels.get(wall.levelId),axis:wall.axis,tile:wall.tile,materialAxis,a,b,length:Math.hypot(b[0]-a[0],b[1]-a[1]),...(opening?{opening}:{})});}
 return {version:1,floors,walls};
}
