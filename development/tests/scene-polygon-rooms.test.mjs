import {roofCells} from '../src/scene-roofs.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {migrateHousePlan,exportSceneDocument,importSceneDocument} from '../src/scene-document.js';
import {addRectangularRoom,validateStructure,compileStructuralScene} from '../src/scene-structure.js';
import {applySceneOperation,SceneSession} from '../src/scene-session.js';
import {chamferRoom,reshapePolygonRoom,compilePolygonRoomGeometry} from '../src/scene-polygon-rooms.js';
import {roomContainsPoint,roomCoversCell,roomsOverlap} from '../src/room-footprint.js';
const props={floor:{solidfloor:''},wallN:{WallN:''},wallW:{WallW:''},window:{windowN:''}};
function base(){let s=migrateHousePlan({version:1,squares:[],items:[]},[0,0,30,30]);s.levels.push({id:'ground',index:0,height:null,elevation:null});return addRectangularRoom(s,{id:'room',name:'Room',levelId:'ground',rect:[2,2,10,9],floorTile:'floor',wallN:'wallN',wallW:'wallW'});}
const cut=s=>chamferRoom(s,{roomId:'room',corner:'NW',distance:3});

test('chamfer preserves unaffected wall and opening identities and serializes authoritative vertices',()=>{
 const original=base(),host=original.walls.find(w=>w.axis==='N'&&w.x===7&&w.y===2);original.openings.push({id:'window',kind:'window',hostWallId:host.id,tile:'window'});const before=structuredClone(original),next=cut(original);
 assert.deepEqual(original,before);assert.equal(next.rooms[0].id,'room');assert.deepEqual(next.openings,original.openings);assert.deepEqual(next.walls.find(w=>w.id===host.id),host);
 assert.equal(next.walls.filter(w=>w.axis==='D-').length,3);assert.equal(next.rooms[0].wallIds.length,27);
 assert.equal(roomContainsPoint(next.rooms[0],2.2,2.2),false);assert.equal(roomContainsPoint(next.rooms[0],4.8,2.8),true);assert.equal(roomCoversCell(next.rooms[0],4,2),false);assert.equal(roomCoversCell(next.rooms[0],5,2),true);
 const reopened=importSceneDocument(exportSceneDocument(next));assert.deepEqual(reopened,next);assert.doesNotThrow(()=>validateStructure(reopened));
 const geometry=compilePolygonRoomGeometry(reopened,props);assert.equal(geometry.walls.length,3);assert.equal(geometry.floors.reduce((n,c)=>n+c.area,0),51.5);assert.ok(geometry.walls.every(w=>w.length===Math.SQRT2&&w.materialAxis==='W'));
});
test('cut refuses lost door/window and wall fixture supports, locks, contents and circulation without changing input',()=>{
 const fixtures=[s=>s.openings.push({id:'opening',kind:'window',hostWallId:s.walls.find(w=>w.x===2&&w.y===2).id,tile:'window'}),s=>s.objects.push({id:'lamp',levelId:'ground',x:2,y:2,parts:[{dx:0,dy:0,tile:'lamp'}],wallMounts:[{part:0,wallId:s.walls.find(w=>w.x===2&&w.y===2).id}]}),s=>s.objects.push({id:'chair',levelId:'ground',x:4,y:2,parts:[{dx:0,dy:0,tile:'chair'}]}),s=>s.legacy.metadata.spawn={x:2.5,y:2.5,z:0},s=>s.verticalLinks.push({id:'stairs',fromLevelId:'ground',toLevelId:'upper',x:3,y:2,axis:'N'}),s=>s.legacy.items.push({id:'supply',value:{x:2,y:2,z:0,type:'Base.WaterBottleFull'}})];
 for(const fixture of fixtures){const s=base();fixture(s);const before=structuredClone(s);assert.throws(()=>cut(s),/Move/);assert.deepEqual(s,before);}
 const locked=base();locked.rooms[0].locked=true;assert.throws(()=>applySceneOperation(locked,{type:'room.chamfer',roomId:'room',corner:'NW',distance:3}),/Locked/);
});
test('outline editing reuses diagonal identities and restores the rectangular perimeter without inventing diagonal replacements',()=>{
 const initial=cut(base()),diagonal=initial.walls.filter(w=>w.axis==='D-');const again=reshapePolygonRoom(initial,{roomId:'room',vertices:[...initial.rooms[0].polygon].reverse()});assert.deepEqual(again,initial);
 const restored=reshapePolygonRoom(initial,{roomId:'room',vertices:[[2,2],[10,2],[10,9],[2,9]]});assert.equal(restored.walls.length,30);assert.ok(restored.walls.every(w=>!diagonal.some(d=>d.id===w.id)));
 const g=compilePolygonRoomGeometry(restored,props);assert.equal(g.walls.length,0);assert.equal(g.floors.length,56);assert.ok(g.floors.every(c=>c.full));
});
test('two room halves may share a grid cell and diagonal wall without actual overlap',()=>{
 let s=base();s=reshapePolygonRoom(s,{roomId:'room',vertices:[[2,2],[8,2],[8,8]]});
 const second={id:'other',name:'Other',levelId:'ground',rect:[2,2,8,8],polygon:[[2,2],[8,8],[2,8]],floorTile:'floor',wallIds:[]};
 const {edges}=roomGeometry(second);
 for(const e of edges){let wall=s.walls.find(w=>w.axis===e.axis&&w.x===e.x&&w.y===e.y);if(!wall){wall={id:'second:'+e.axis+':'+e.x+':'+e.y,levelId:'ground',axis:e.axis,x:e.x,y:e.y,tile:e.axis==='N'?'wallN':'wallW',...(e.axis.startsWith('D')?{materialAxis:'W'}:{})};s.walls.push(wall);}second.wallIds.push(wall.id);}s.rooms.push(second);
 assert.equal(roomsOverlap(...s.rooms),false);assert.doesNotThrow(()=>validateStructure(s));assert.equal(s.rooms[0].wallIds.filter(id=>second.wallIds.includes(id)).length,6);
 const overlap={...second,polygon:[[2,2],[8,2],[8,8],[2,8]]};assert.equal(roomsOverlap(s.rooms[0],overlap),true);
});
import {compilePolygonFootprint as roomGeometryRaw} from '../src/polygon-footprint.js';
const roomGeometry=r=>roomGeometryRaw(r.polygon);
test('partial floors cannot support whole-cell holes and malformed dual footprints are rejected',()=>{
 const s=base();s.levels[0].index=1;const next=cut(s);next.rooms[0].floorOpenings=[{id:'hole',rect:[4,2,5,3]}];assert.throws(()=>validateStructure(next),/inside one room/);
 delete next.rooms[0].floorOpenings;assert.ok(roofCells({...next.rooms[0],roof:{kind:'flat',tile:'floor'}},2).some(c=>!c.full));assert.throws(()=>roofCells({...next.rooms[0],roof:{kind:'gable',axis:'X',source:'roofs_30_08'}},2),/flat roof/);next.rooms[0].cells=[[2,2]];assert.throws(()=>validateStructure(next),/one authoritative/);
});
test('public session commits polygon rooms through normal history and persisted reopening',async()=>{
 const s=base(),snapshot={scene:s,undo:[],redo:[],receipts:[]};let saved;const repository={save:async v=>{saved=structuredClone(v);}},session=new SceneSession(snapshot,props,repository),request={sceneId:s.id,requestId:'cut',baseRevision:0,operations:[{type:'room.chamfer',roomId:'room',corner:'NW',distance:3}]};
 assert.equal(session.preview(request).ok,true);assert.equal((await session.execute(request)).ok,true);assert.equal(session.compile().polygonGeometry.walls.length,3);
 const reopened=new SceneSession(saved,props,repository);assert.deepEqual(reopened.compile(),session.compile());
 assert.equal((await reopened.execute({sceneId:s.id,requestId:'undo',baseRevision:1,action:'undo'})).ok,true);assert.equal(reopened.compile().polygonGeometry,undefined);
 assert.equal((await reopened.execute({sceneId:s.id,requestId:'redo',baseRevision:2,action:'redo'})).ok,true);assert.equal(reopened.compile().polygonGeometry.walls.length,3);
});


test('public compilation keeps ground outside partial floors and emits physical diagonal walls without fake N/W blockers',()=>{
 const s=base();for(let x=0;x<15;x++)for(let y=0;y<15;y++)s.legacy.squares.push({id:`grass:${x},${y}`,value:{x,y,z:0,room:-1,tiles:['blends_natural_01_16']}});
 s.legacy.metadata.polygonGeometry={stale:true};
 const next=cut(s),p=compileStructuralScene(next,{...props,blends_natural_01_16:{solidfloor:''}});
 assert.deepEqual(p.squares.find(q=>q.x===4&&q.y===2).tiles,['blends_natural_01_16','floor']);
 assert.deepEqual(p.squares.find(q=>q.x===2&&q.y===2).tiles,['blends_natural_01_16']);
 assert.ok(!p.squares.find(q=>q.x===5&&q.y===3).tiles.includes('blends_natural_01_16'));
 assert.equal(p.polygonGeometry.stale,undefined);assert.equal(p.polygonGeometry.walls.length,3);assert.equal(p.polygonGeometry.floors.filter(f=>!f.full).length,3);
 assert.deepEqual(p.squares.find(q=>q.x===3&&q.y===3).tiles,['blends_natural_01_16','floor']);
 const reopened=importSceneDocument(exportSceneDocument(next));assert.deepEqual(compileStructuralScene(reopened,{...props,blends_natural_01_16:{solidfloor:''}}),p);
});
