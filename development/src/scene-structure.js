import {validateRoofFloorIntersections} from './roof-runtime.js';
import {compileRoofVolumes} from './scene-roof-volumes.js';
import {validateGroundSupport} from './ground-support.js';
import {hasOpeningProfile} from './window-profile.js';
import {validateThreshold,validateThresholdSupports} from './door-threshold.js';
import {resolveWallFinishes} from './wall-finishes.js';
import {fixedGlazing} from './fixed-glazing.js';
import {compilePolygonRoomGeometry} from './scene-polygon-rooms.js';
import {wallEdgeEndpoints} from './polygon-footprint.js';
import {roomPolygonGeometry,roomsOverlap,roomBoundaryRuns,roomCells,roomContains,footprintEdges,validateFootprint,enclosedFootprint,cellBounds} from './room-footprint.js';
import {compileRoomRoofs} from './scene-roofs.js';
import {containsCell,validateFloorOpenings,validateOpeningContents} from './scene-floor-openings.js';
import {compileVerticalLinks} from './scene-stairs.js';
import {compileSceneObjects} from './scene-objects.js';
import {validateSceneDocument,compileLegacyScene} from './scene-document.js';
import {validateHousePlan} from './workshop-model.js';
import {doorOpening,windowOpening} from './wall-joins.js';

const edgeKey=(level,axis,x,y)=>`${level}:${axis}:${x}:${y}`;
const fail=message=>{throw Error(message);};
export function validateStructure(scene){
 validateSceneDocument(scene);
 const levels=new Map(scene.levels.map(l=>[l.id,l])),walls=new Map(),edges=new Set();
 for(const wall of scene.walls){
  if(!levels.has(wall.levelId)||!['N','W','D+','D-'].includes(wall.axis)||![wall.x,wall.y].every(Number.isInteger)||wall.x<scene.bounds[0]||wall.x>=scene.bounds[2]||wall.y<scene.bounds[1]||wall.y>=scene.bounds[3]||typeof wall.tile!=='string')fail('Invalid wall edge');
  const key=edgeKey(wall.levelId,wall.axis,wall.x,wall.y);if(edges.has(key))fail('Another wall already occupies this edge');edges.add(key);walls.set(wall.id,wall);
 }
 for(const wall of scene.walls)if(wall.axis.startsWith('D')){if(!wall.independent&&!scene.rooms.some(r=>r.wallIds?.includes(wall.id)))fail('Diagonal walls must belong to a polygon room or independent path');if(wallEdgeEndpoints(wall).some(([x,y])=>x>=scene.bounds[2]||y>=scene.bounds[3]))fail('Diagonal wall leaves the lot');}
 const occupiedRoomCells=new Set();
 for(const room of scene.rooms){
  if(!levels.has(room.levelId)||!Array.isArray(room.rect)||room.rect.length!==4||!room.rect.every(Number.isInteger)||room.rect[0]>=room.rect[2]||room.rect[1]>=room.rect[3]||typeof room.floorTile!=='string'||!Array.isArray(room.wallIds))fail('Invalid room');
  validateFootprint(room);validateFloorOpenings(scene,room);
  const [x0,y0,x1,y1]=room.rect;
  if((x1-x0)*(y1-y0)>50000||occupiedRoomCells.size+roomCells(room).length>50000)fail('Scene exceeds 50000 room cells');
  if(x0<scene.bounds[0]||y0<scene.bounds[1]||x1>=scene.bounds[2]||y1>=scene.bounds[3])fail('Room must leave space for its boundary walls');
  for(const [x,y]of roomCells(room)){const key=`${room.levelId}:${x}:${y}`;occupiedRoomCells.add(key);}
  const expected=new Set(footprintEdges(room).map(e=>edgeKey(room.levelId,e.axis,e.x,e.y)));
  if(new Set(room.wallIds).size!==expected.size||room.wallIds.length!==expected.size)fail('Incomplete room boundary');
  for(const id of room.wallIds){const wall=walls.get(id);if(!wall||!expected.delete(edgeKey(wall.levelId,wall.axis,wall.x,wall.y)))fail('Invalid room boundary');}
 }
 for(let i=0;i<scene.rooms.length;i++)for(let j=i+1;j<scene.rooms.length;j++)if(scene.rooms[i].levelId===scene.rooms[j].levelId&&roomsOverlap(scene.rooms[i],scene.rooms[j]))fail('Rooms cannot overlap');
 const occupied=new Set();for(const opening of scene.openings){
  if(!walls.has(opening.hostWallId)||occupied.has(opening.hostWallId)||!['door','window','passage'].includes(opening.kind)||(opening.kind==='passage'?opening.tile!==undefined:typeof opening.tile!=='string'))fail('Invalid or overlapping opening');occupied.add(opening.hostWallId);validateThreshold(opening.threshold);if(opening.threshold&&opening.kind!=='door')fail('Only doors can have a threshold');
 }
 return scene;
}

// Grid-aligned first slice: each edge is a single source cell. Adjacent rooms
// reference the same wall entity; an opening therefore belongs to both rooms.
export function addRectangularRoom(scene,{id,name,levelId,rect,floorTile,wallN,wallW,floorOpenings,cells}){
 const next=structuredClone(scene),level=next.levels.find(l=>l.id===levelId);
 if(!level)fail('Choose an existing floor');
 if(!Array.isArray(rect)||rect.length!==4||!rect.every(Number.isInteger))fail('Invalid room rectangle');
 const [x0,y0,x1,y1]=rect;if(x0>=x1||y0>=y1||x1-x0>100||y1-y0>100)fail('Invalid room size');
 const footprint={rect,cells};validateFootprint(footprint);if(next.rooms.some(r=>r.levelId===levelId&&roomsOverlap(footprint,r)))fail('Rooms cannot overlap');
 const byEdge=new Map(next.walls.map(w=>[edgeKey(w.levelId,w.axis,w.x,w.y),w]));
 const wallIds=[],ids=new Set([...next.levels,...next.walls,...next.rooms,...next.openings,...next.objects,...next.verticalLinks,...next.references,...next.views,...next.legacy.squares,...next.legacy.items,...next.legacy.vehicles].map(e=>e.id));
 const edge=(axis,x,y)=>{const key=edgeKey(levelId,axis,x,y);let wall=byEdge.get(key);if(!wall){let wallId=`wall:${key}`,n=1;while(ids.has(wallId))wallId=`wall:${key}:${n++}`;ids.add(wallId);wall={id:wallId,levelId,axis,x,y,tile:axis==='N'?wallN:wallW};next.walls.push(wall);byEdge.set(key,wall);}wallIds.push(wall.id);};
 for(const e of footprintEdges(footprint))edge(e.axis,e.x,e.y);
 next.rooms.push({id,name,levelId,rect:[...rect],...(cells&&cells.length!==(x1-x0)*(y1-y0)?{cells:structuredClone(cells)}:{}),floorTile,wallIds,...(floorOpenings?{floorOpenings:structuredClone(floorOpenings)}:{})});
 validateStructure(next);return next;
}
export function compileStructuralScene(scene,properties,options={}){
 validateStructure(scene);
 scene=resolveWallFinishes(scene,properties,options);
 const base=structuredClone(scene);base.rooms=[];base.walls=[];base.openings=[];base.objects=[];base.verticalLinks=[];delete base.roofVolumes;const sourceItems=base.legacy.items;base.legacy.items=[];
 const plan=compileLegacyScene(base),squares=new Map(plan.squares.map(s=>[`${s.x},${s.y},${s.z}`,s])),levels=new Map(scene.levels.map(l=>[l.id,l.index]));
 delete plan.roofGeometry;
 const roofGeometry=compileRoofVolumes(scene,properties);if(roofGeometry.length)plan.roofGeometry=roofGeometry;
 delete plan.polygonGeometry; // Rebuild this cache only from authoritative room/wall entities.
 const legacyFloors=new Set(plan.squares.filter(s=>s.tiles.some(t=>'solidfloor'in(properties[t]||{})&&!t.startsWith('blends_'))).map(s=>`${s.x},${s.y},${s.z}`));
 const square=(x,y,z)=>{const key=`${x},${y},${z}`;let s=squares.get(key);if(!s){s={x,y,z,room:0,tiles:[]};squares.set(key,s);plan.squares.push(s);}return s;};
 for(const room of scene.rooms){
  if(!('solidfloor'in (properties[room.floorTile]||{})))fail('Room material must be a supported floor');
  const [x0,y0,x1,y1]=room.rect,z=levels.get(room.levelId);
  for(const [x,y]of roomCells(room)){
   const s=square(x,y,z);if(room.floorOpenings?.some(h=>containsCell(h.rect,x,y)))continue;
   // Two polygon rooms may share disjoint pieces of a cell. The authoritative
   // overlap check ran above; legacy floors still cannot be overwritten.
   const legacyFloor=legacyFloors.has(`${x},${y},${z}`);
   const partial=room.polygon&&!roomPolygonGeometry(room).byCell.get(`${x},${y}`).full;
   if(legacyFloor&&!(partial&&z===0))fail('Room overlaps an existing legacy floor');
   if(!partial)s.tiles=s.tiles.filter(t=>!t.startsWith('blends_'));
   if(!s.tiles.includes(room.floorTile)){if(partial)s.tiles.push(room.floorTile);else s.tiles.unshift(room.floorTile);}s.room=0;
  }
 }
 if(scene.walls.some(w=>w.axis.startsWith('D'))||scene.rooms.some(r=>r.polygon)||scene.openings.some(o=>o.threshold||hasOpeningProfile(properties[o.tile])))plan.polygonGeometry=compilePolygonRoomGeometry(scene,properties);
 const openings=new Map(scene.openings.map(o=>[o.hostWallId,o]));
 for(const wall of scene.walls){
  if(!('Wall'+(wall.materialAxis||wall.axis) in (properties[wall.tile]||{})))fail('Wall material does not match its direction');
  const wallZ=levels.get(wall.levelId);if(wall.independent){const neighbors=[[wall.x,wall.y],[wall.x-(wall.axis==='W'?1:0),wall.y-(wall.axis==='N'?1:0)]];if(!neighbors.some(([x,y])=>squares.get(`${x},${y},${wallZ}`)?.tiles.some(t=>!('FloorOverlay'in (properties[t]||{})||properties[t]?.MoveType==='FloorRug')&&('solidfloor'in (properties[t]||{})||t.startsWith('floors_')||wallZ===0&&t.startsWith('blends_')))))fail('Independent walls need an adjacent supported floor');}
  if(wall.axis.startsWith('D'))continue;
  const s=square(wall.x,wall.y,wallZ);
  if(s.tiles.some(t=>['Wall','DoorWall','Window','door','window'].some(k=>k+wall.axis in (properties[t]||{}))))fail('Wall overlaps a legacy structure');
  const opening=openings.get(wall.id);if(!opening){s.tiles.push(wall.tile);continue;}
  if(opening.kind==='passage')continue; // Keep the editable host, remove its physical surface.
  const props=properties[opening.tile]||{};
  if(opening.kind==='window'&&fixedGlazing(props,wall.axis)){s.tiles.push(opening.tile);continue;}
  if(!(opening.kind+wall.axis in props))fail('Opening asset does not match its wall');
  if(opening.threshold||hasOpeningProfile(props))continue; // Drawn and blocked by derived wall geometry.
  const frame=opening.kind==='door'?doorOpening(wall.tile,wall.axis,properties):windowOpening(wall.tile,wall.axis,properties);
  if(!frame)fail('Wall material has no matching opening');s.tiles.push(frame,opening.tile);
 }
 compileRoomRoofs(scene,plan,properties);
 plan.items=sourceItems.map(e=>structuredClone(e.value));
 const result=compileSceneObjects(scene,compileVerticalLinks(scene,plan,properties),properties);validateRoofFloorIntersections(result,properties);validateOpeningContents(scene,result,properties);validateThresholdSupports(result,properties);validateGroundSupport(result,properties,scene);return validateHousePlan(result,scene.bounds);
}

export function moveRoomBoundary(scene,{roomId,side,coordinate}){
 const room=scene.rooms.find(r=>r.id===roomId),index={west:0,north:1,east:2,south:3}[side];
 if(!room)fail('Room not found');if(index===undefined||!Number.isInteger(coordinate))fail('Choose a wall side and a grid coordinate');
 const runs=roomBoundaryRuns(room).filter(r=>r.side===side&&r.coordinate===room.rect[index]);
 if(runs.length!==1)fail('Choose a specific wall segment for this boundary');
 const run=runs[0],wall=scene.walls.find(w=>room.wallIds.includes(w.id)&&w.axis===run.axis&&(run.axis==='W'?w.x:w.y)===run.coordinate&&(run.axis==='W'?w.y:w.x)===run.start);
 return moveRoomEdge(scene,{roomId,wallId:wall?.id,coordinate});
}

function roomMaterials(scene,room){return Object.fromEntries(['N','W'].map(axis=>['wall'+axis,scene.walls.find(w=>room.wallIds.includes(w.id)&&w.axis===axis).tile]));}
function pruneRoomWalls(scene,previous){const owned=new Set(previous.rooms.flatMap(r=>r.wallIds)),required=new Set(scene.rooms.flatMap(r=>r.wallIds));scene.walls=scene.walls.filter(w=>!owned.has(w.id)||required.has(w.id));const retained=new Set(scene.walls.map(w=>w.id));scene.openings=scene.openings.filter(o=>retained.has(o.hostWallId));return validateStructure(scene);}
export function splitRoom(scene,{roomId,axis,coordinate,newRoomId}){
 validateStructure(scene);const original=scene.rooms.find(r=>r.id===roomId);if(!original)fail('Room not found');
 if(original.polygon)fail('Use polygon outline editing to reshape this room');
 if(original.roof)fail('Remove the room roof before splitting its footprint');
 const dim=axis==='x'?0:axis==='y'?1:-1;if(dim<0||!Number.isInteger(coordinate)||coordinate<=original.rect[dim]||coordinate>=original.rect[dim+2])fail('Place the partition inside the selected room');
 if(typeof newRoomId!=='string'||!newRoomId||newRoomId===roomId)fail('Provide a new room identity');
 if(original.floorOpenings?.some(h=>h.rect[dim]<coordinate&&h.rect[dim+2]>coordinate))fail('Move or fill the floor opening before splitting through it');
 const ac=roomCells(original).filter(p=>p[dim]<coordinate),bc=roomCells(original).filter(p=>p[dim]>=coordinate),a=cellBounds(ac),b=cellBounds(bc);
 let next=structuredClone(scene);next.rooms=next.rooms.filter(r=>r.id!==roomId);const materials=roomMaterials(scene,original);
 next=addRectangularRoom(next,{...original,...materials,rect:a,cells:ac,floorOpenings:original.floorOpenings?.filter(h=>h.rect[dim+2]<=coordinate)});next=addRectangularRoom(next,{...original,...materials,id:newRoomId,name:original.name+' · 2',rect:b,cells:bc,floorOpenings:original.floorOpenings?.filter(h=>h.rect[dim]>=coordinate)});
 return pruneRoomWalls(next,scene);
}
export function mergeRooms(scene,{roomId,otherRoomId}){
 validateStructure(scene);const a=scene.rooms.find(r=>r.id===roomId),b=scene.rooms.find(r=>r.id===otherRoomId);if(!a||!b||a===b||a.levelId!==b.levelId)fail('Choose two rooms on the same floor');
 if(a.polygon||b.polygon)fail('Polygon room merge is not implemented yet');
 if(a.roof||b.roof)fail('Remove the room roofs before merging their footprints');
 const vertical=a.rect[1]===b.rect[1]&&a.rect[3]===b.rect[3]&&(a.rect[2]===b.rect[0]||b.rect[2]===a.rect[0]),horizontal=a.rect[0]===b.rect[0]&&a.rect[2]===b.rect[2]&&(a.rect[3]===b.rect[1]||b.rect[3]===a.rect[1]);
 if(!a.wallIds.some(id=>b.wallIds.includes(id)))fail('These rooms must share a wall');
 let next=structuredClone(scene);next.rooms=next.rooms.filter(r=>r.id!==a.id&&r.id!==b.id);const rect=[Math.min(a.rect[0],b.rect[0]),Math.min(a.rect[1],b.rect[1]),Math.max(a.rect[2],b.rect[2]),Math.max(a.rect[3],b.rect[3])];
 next=addRectangularRoom(next,{...a,...roomMaterials(scene,a),rect,...(!vertical&&!horizontal||a.cells||b.cells?{cells:[...roomCells(a),...roomCells(b)]}:{}),floorOpenings:[...(a.floorOpenings||[]),...(b.floorOpenings||[])]});return pruneRoomWalls(next,scene);
}


export function removeRoom(scene,{roomId}){
 validateStructure(scene);const room=scene.rooms.find(r=>r.id===roomId);if(!room)fail('Room not found');
 const z=scene.levels.find(l=>l.id===room.levelId).index,[x0,y0,x1,y1]=room.rect;
 const inside=(x,y)=>roomContains(room,x,y);
 if(scene.objects.some(o=>o.levelId===room.levelId&&o.parts.some(p=>inside(o.x+p.dx,o.y+p.dy))))fail('Move the room furnishings before removing this room');
 const spawn=scene.legacy.metadata.spawn;if(spawn?.z===z&&inside(spawn.x,spawn.y))fail('Move the entry point before removing this room');
 if([...scene.legacy.items,...scene.legacy.vehicles].some(e=>e.value.z===z&&inside(e.value.x,e.value.y)))fail('Move supplies and vehicles before removing this room');
 if(scene.verticalLinks.some(l=>(l.fromLevelId===room.levelId||l.toLevelId===room.levelId)&&[0,1,2,-1].some(i=>inside(l.x+(l.axis==='W'?i:0),l.y+(l.axis==='N'?i:0)))))fail('Move the connected staircase before removing this room');
 const next=structuredClone(scene);next.rooms=next.rooms.filter(r=>r.id!==roomId);return pruneRoomWalls(next,scene);
}

export function roomFromWalls(scene,{id,name,levelId,x,y,floorTile}){
 const cells=enclosedFootprint(scene,levelId,x,y),rect=cellBounds(cells);
 return addRectangularRoom(scene,{id,name,levelId,rect,cells,floorTile});
}

export function moveRoomEdge(scene,{roomId,wallId,coordinate}){
 validateStructure(scene);
 const selected=scene.rooms.find(r=>r.id===roomId),anchor=scene.walls.find(w=>w.id===wallId);
 if(!selected||!selected.wallIds.includes(wallId)||!anchor||!Number.isInteger(coordinate))fail('Choose a room boundary and a grid coordinate');
 if(selected.polygon)fail('Use polygon outline editing to reshape this room');
 const vertical=anchor.axis==='W',old=vertical?anchor.x:anchor.y,along=vertical?anchor.y:anchor.x;
 const run=roomBoundaryRuns(selected).find(r=>r.axis===anchor.axis&&r.coordinate===old&&r.start<=along&&r.end>along);
 if(!run)fail('Choose an existing room boundary');if(coordinate===old)return structuredClone(scene);
 const axisIndex=vertical?0:1;if(coordinate<scene.bounds[axisIndex]||coordinate>=scene.bounds[axisIndex+2])fail('The move would leave the lot');
 const moving=scene.walls.filter(w=>w.levelId===anchor.levelId&&w.axis===anchor.axis&&(vertical?w.x:w.y)===old&&(vertical?w.y:w.x)>=run.start&&(vertical?w.y:w.x)<run.end),movingIds=new Set(moving.map(w=>w.id));
 const low=Math.min(old,coordinate),high=Math.max(old,coordinate);
 if(scene.walls.some(w=>w.levelId===anchor.levelId&&w.axis===anchor.axis&&!movingIds.has(w.id)&&(vertical?w.x:w.y)>=low&&(vertical?w.x:w.y)<=high&&(vertical?w.y:w.x)>=run.start&&(vertical?w.y:w.x)<run.end))fail('The moved boundary would cross another wall');
 const next=structuredClone(scene);
 for(const room of next.rooms){
  const supports=moving.filter(w=>room.wallIds.includes(w.id));if(!supports.length)continue;
  const cells=new Map(roomCells(room).map(p=>[p.join(','),p]));
  for(const w of supports){
   const positive=roomContains(room,w.x,w.y),remove=(coordinate>old)===positive,t=vertical?w.y:w.x;
   for(let n=low;n<high;n++){
    const p=vertical?[n,t]:[t,n],key=p.join(',');
    if(remove){if(!cells.delete(key))fail('The moved boundary would cross a room gap');}
    else{if(cells.has(key))fail('The moved boundary would overlap its room');cells.set(key,p);}
   }
  }
  if(!cells.size)fail('The move would collapse a room');
  room.cells=[...cells.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);room.rect=cellBounds(room.cells);validateFootprint(room);
  if(room.cells.length===(room.rect[2]-room.rect[0])*(room.rect[3]-room.rect[1]))delete room.cells;
 }
 for(const w of next.walls)if(movingIds.has(w.id)){if(vertical)w.x=coordinate;else w.y=coordinate;}
 const oldOwned=new Set(scene.rooms.flatMap(r=>r.wallIds)),original=new Map(scene.walls.map(w=>[w.id,w])),byEdge=new Map(next.walls.map(w=>[edgeKey(w.levelId,w.axis,w.x,w.y),w])),required=new Set();
 const ids=new Set([...next.levels,...next.walls,...next.rooms,...next.openings,...next.objects,...next.verticalLinks,...next.references,...next.views,...next.legacy.squares,...next.legacy.items,...next.legacy.vehicles].map(e=>e.id));
 for(const room of next.rooms){
  const materials=room.wallIds.map(id=>original.get(id));room.wallIds=footprintEdges(room).map(e=>{
   const key=edgeKey(room.levelId,e.axis,e.x,e.y);let wall=byEdge.get(key);
   if(!wall){const candidates=materials.filter(w=>w.axis===e.axis).sort((a,b)=>(Math.abs(a.x-e.x)+Math.abs(a.y-e.y))-(Math.abs(b.x-e.x)+Math.abs(b.y-e.y)));let id=`wall:${key}`,n=1;while(ids.has(id))id=`wall:${key}:${n++}`;ids.add(id);wall={id,levelId:room.levelId,...e,tile:candidates[0].tile,...(candidates[0].finishes?{finishes:structuredClone(candidates[0].finishes)}:{})};byEdge.set(key,wall);}
   required.add(wall.id);return wall.id;
  });
 }
 next.walls=[...byEdge.values()].filter(w=>required.has(w.id)||!oldOwned.has(w.id));
 const retained=new Set(next.walls.map(w=>w.id));if(next.openings.some(o=>!retained.has(o.hostWallId)))fail('This move would remove a door or window; move that opening first');
 if(next.objects.some(o=>o.wallMounts?.some(m=>!retained.has(m.wallId))))fail('Move wall fixtures before shortening their supporting wall');
 validateStructure(next);return next;
}
