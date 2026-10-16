import test from 'node:test';import assert from 'node:assert/strict';
import {migrateHousePlan} from '../src/scene-document.js';
import {editIndependentWalls} from '../src/scene-walls.js';
import {roomFromWalls,compileStructuralScene,addRectangularRoom,mergeRooms,splitRoom,moveRoomEdge} from '../src/scene-structure.js';
import {roomCells,roomContains,enclosedFootprint,validateFootprint} from '../src/room-footprint.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {roofCells} from '../src/scene-roofs.js';
import {validateFloorOpenings} from '../src/scene-floor-openings.js';
const props={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},wall_9:{WindowN:'',WallN:'',wall:''},window:{windowN:''},blends_natural_01_16:{}};
const base=()=>{const s=migrateHousePlan({version:1,squares:[],items:[]},[0,0,20,20]);s.levels.push({id:'ground',index:0,height:null,elevation:null});return s;};
const outline=[[2,2],[8,2],[8,4],[5,4],[5,7],[2,7],[2,2]];
const walls=()=>editIndependentWalls(base(),{type:'walls.draw',pathId:'outline',levelId:'ground',points:outline,wallN:'wall_1',wallW:'wall_0'});
const fill={type:'room.enclose',id:'L',name:'L room',levelId:'ground',x:3,y:3,floorTile:'floor'};
test('closed L walls become one room without filling the notch or replacing opening hosts',()=>{
 const source=walls();source.openings.push({id:'window',hostWallId:source.walls[0].id,kind:'window',tile:'window'});
 const room=roomFromWalls(source,fill),plan=compileStructuralScene(room,props);
 assert.equal(room.rooms.length,1);assert.equal(room.rooms[0].cells.length,21);assert.equal(roomContains(room.rooms[0],6,5),false);
 assert.deepEqual(room.walls,source.walls);assert.deepEqual(room.openings,source.openings);
 assert.equal(plan.squares.filter(s=>s.tiles.includes('floor')).length,21);assert.ok(!plan.squares.some(s=>s.x===6&&s.y===5));
 assert.equal(roofCells({...room.rooms[0],roof:{kind:'flat',tile:'floor'}},1).length,21);
 const upper={...room.rooms[0],levelId:'upper',floorOpenings:[{id:'hole',rect:[4,3,7,6]}]};assert.throws(()=>validateFloorOpenings({levels:[{id:'upper',index:1}]},upper),/inside one room/);
});
test('unclosed perimeter and disconnected imported room cells are rejected',()=>{
 const scene=walls();scene.walls.pop();assert.throws(()=>enclosedFootprint(scene,'ground',3,3),/Close the wall/);
 assert.throws(()=>validateFootprint({rect:[2,2,6,6],cells:[[2,2],[5,5]]}),/connected/);
});
test('L room permits a separate room inside its bounding-box notch and rejects real overlaps',()=>{
 const scene=roomFromWalls(walls(),fill),params={id:'notch',levelId:'ground',rect:[5,4,8,7],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'};
 const added=addRectangularRoom(scene,params);assert.equal(added.rooms.length,2);assert.doesNotThrow(()=>compileStructuralScene(added,props));
 assert.throws(()=>addRectangularRoom(scene,{...params,rect:[4,4,8,7]}),/overlap/);
 const merged=mergeRooms(added,{roomId:'L',otherRoomId:'notch'});assert.equal(merged.rooms.length,1);assert.equal(roomCells(merged.rooms[0]).length,30);
});
test('normal model and commands share enclosure, undo and persistence semantics',()=>{
 const source=walls();source.legacy.squares=[];for(let x=0;x<20;x++)for(let y=0;y<20;y++)source.legacy.squares.push({id:`grass:${x},${y}`,value:{x,y,z:0,room:-1,tiles:['blends_natural_01_16']}});
 const plan=compileStructuralScene(source,props),model=new StructuredWorkshopModel({...plan,sceneDocument:source},source.bounds,props);
 model.begin('Enclose');assert.equal(model.structure(fill).ok,true);model.commit();
 assert.equal(model.roomAt(3,3,0).id,'L');assert.equal(model.roomAt(6,5,0),undefined);
 model.undo();assert.equal(model.scene.rooms.length,0);model.redo();assert.equal(model.roomAt(3,3,0).id,'L');
 const reopened=new StructuredWorkshopModel(JSON.parse(JSON.stringify(model.plan)),source.bounds,props);assert.equal(reopened.roomAt(3,3,0).id,'L');assert.equal(reopened.roomAt(6,5,0),undefined);
});

test('L room partitions preserve its notch and normalize rectangular halves',()=>{const scene=roomFromWalls(walls(),fill),split=splitRoom(scene,{roomId:'L',axis:'y',coordinate:4,newRoomId:'bottom'});assert.equal(split.rooms.length,2);assert.equal(split.rooms.reduce((n,r)=>n+roomCells(r).length,0),21);assert.ok(split.rooms.every(r=>!r.cells));assert.doesNotThrow(()=>compileStructuralScene(split,props));});

test('moving the concave wall expands only its run and retains the wall and opening identity',()=>{
 const scene=roomFromWalls(walls(),fill),host=scene.walls.find(w=>w.axis==='W'&&w.x===5&&w.y===5);scene.openings.push({id:'windowW',kind:'window',tile:'windowW',hostWallId:host.id});
 const next=moveRoomEdge(scene,{roomId:'L',wallId:host.id,coordinate:6});assert.equal(roomCells(next.rooms[0]).length,24);assert.equal(roomContains(next.rooms[0],5,5),true);assert.equal(roomContains(next.rooms[0],6,5),false);assert.equal(next.walls.find(w=>w.id===host.id).x,6);assert.deepEqual(next.openings,scene.openings);
 assert.doesNotThrow(()=>compileStructuralScene(next,{...props,windowW:{windowW:''},wall_8:{WindowW:'',WallW:'',wall:''}}));
 assert.throws(()=>moveRoomEdge(scene,{roomId:'L',wallId:host.id,coordinate:2}),/cross another wall/);assert.equal(host.x,5);
});
test('a shared concave boundary transfers floor cells between rooms without overlaps',()=>{
 let scene=roomFromWalls(walls(),fill);scene=addRectangularRoom(scene,{id:'notch',levelId:'ground',rect:[5,4,8,7],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'});
 const wall=scene.walls.find(w=>w.axis==='W'&&w.x===5&&w.y===5),next=moveRoomEdge(scene,{roomId:'L',wallId:wall.id,coordinate:6});
 assert.deepEqual(next.rooms.map(r=>roomCells(r).length),[24,6]);assert.doesNotThrow(()=>compileStructuralScene(next,props));
});
test('concave boundary hits and lock enforcement use the actual segment',async()=>{
 const {roomEdgeHit}=await import('../src/workshop-room-hit.js'),{applySceneOperation}=await import('../src/scene-session.js');const scene=roomFromWalls(walls(),fill),r=scene.rooms[0];
 const hit=roomEdgeHit([r],'ground',(x,y)=>({x:x*30,y:y*30}),{x:150,y:165});assert.deepEqual(hit.edge,{axis:'W',x:5,y:4});assert.equal(hit.side,'east');
 r.locked=true;const wall=scene.walls.find(w=>w.axis==='W'&&w.x===5&&w.y===5);assert.throws(()=>applySceneOperation(scene,{type:'room.edgeMove',roomId:'L',wallId:wall.id,coordinate:6}),/Locked room/);
});

test('boundary drags measure displacement from the grabbed edge without floor-rounding dead zones',async()=>{
 const {boundaryDragCoordinate}=await import('../src/workshop-room-hit.js');assert.equal(boundaryDragCoordinate({wallId:'w',side:'east',coordinate:5},{gridX:4.999,gridY:7},{gridX:5.999,gridY:7}),6);
 const {applySceneOperation}=await import('../src/scene-session.js'),scene=roomFromWalls(walls(),fill),wall=scene.walls.find(w=>w.axis==='W'&&w.x===5&&w.y===5);
 scene.objects.push({id:'lamp',assetId:'lampW',levelId:'ground',x:5,y:5,parts:[{dx:0,dy:0,tile:'lampW'}],wallMounts:[{part:0,wallId:wall.id}]});
 const next=applySceneOperation(scene,{type:'room.edgeMove',roomId:'L',wallId:wall.id,coordinate:6});assert.equal(next.objects[0].x,6);assert.equal(next.objects[0].wallMounts[0].wallId,wall.id);
});

test('rectangular partial shared boundary can reshape its larger neighbor and reverse without losing hosts',()=>{
 const params=(id,rect)=>({id,rect,levelId:'ground',floorTile:'floor',wallN:'wall_1',wallW:'wall_0'});
 let scene=addRectangularRoom(base(),params('large',[2,2,6,8]));scene=addRectangularRoom(scene,params('small',[6,4,9,7]));
 const host=scene.walls.find(w=>w.axis==='W'&&w.x===6&&w.y===5);scene.openings.push({id:'shared-window',hostWallId:host.id,kind:'window',tile:'windowW'});
 const moved=moveRoomEdge(scene,{roomId:'small',wallId:host.id,coordinate:7});assert.deepEqual(moved.rooms.map(r=>roomCells(r).length),[27,6]);assert.ok(moved.rooms[0].cells);assert.equal(moved.openings[0].hostWallId,host.id);
 const returned=moveRoomEdge(moved,{roomId:'large',wallId:host.id,coordinate:6});assert.deepEqual(returned.rooms.map(r=>r.rect),scene.rooms.map(r=>r.rect));assert.ok(returned.rooms.every(r=>!r.cells));assert.deepEqual(returned.openings,scene.openings);
 assert.doesNotThrow(()=>compileStructuralScene(returned,{...props,windowW:{windowW:''},wall_8:{WindowW:'',WallW:'',wall:''}}));
});
test('legacy room.resize delegates to the same shared boundary geometry as direct edge moves',async()=>{
 const {moveRoomBoundary}=await import('../src/scene-structure.js');let scene=roomFromWalls(walls(),fill);scene=addRectangularRoom(scene,{id:'notch',levelId:'ground',rect:[5,4,8,7],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'});
 const host=scene.walls.find(w=>w.axis==='W'&&w.x===5&&w.y===4);
 assert.deepEqual(moveRoomBoundary(scene,{roomId:'notch',side:'west',coordinate:6}),moveRoomEdge(scene,{roomId:'notch',wallId:host.id,coordinate:6}));
});
