import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {compileStructuralScene} from '../src/scene-structure.js';
import {roomWallSide,visibleWallSide} from '../src/wall-finishes.js';
import {installMasonryAssets} from '../src/masonry-assets.js';
import {installArchitecturalAssets} from '../src/architectural-assets.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
const props={floor:{solidfloor:''},doorN:{doorN:''},doorW:{doorW:''}},atlas={regions:{}};installMasonryAssets(props,atlas);installArchitecturalAssets(props,atlas);
const tile=(style,axis)=>`tian_masonry_${style}_${axis==='N'?1:0}`;
function model(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,30,30],props);add(m,'a',[4,4,10,10]);return m;}
function add(m,id,rect){assert.equal(m.structure({type:'room.add',room:{id,name:id,levelId:'level:0',z:0,rect,floorTile:'floor',wallN:tile('navy','N'),wallW:tile('navy','W')}}).ok,true);}
function paint(m,id,style,side='room'){const r=m.structure({type:'room.finish',roomId:id,side,wallN:tile(style,'N'),wallW:tile(style,'W')});assert.equal(r.ok,true,r.reason);}
test('room-facing material is independent on all four boundaries and inspection does not mutate the export',()=>{
 const m=model();paint(m,'a','chalk');const room=m.scene.rooms[0],before=m.export();
 for(const wall of m.scene.walls){assert.equal(wall.finishes[roomWallSide(room,wall)],tile('chalk',wall.axis));assert.equal(wall.tile,tile('navy',wall.axis));const sq=m.square(wall.x,wall.y,0);assert.ok(sq.tiles.includes(tile(roomWallSide(room,wall)===visibleWallSide(wall)?'chalk':'navy',wall.axis)));}
 const inspected=compileStructuralScene(m.scene,props,{finishRoomId:'a'});for(const wall of m.scene.walls)assert.ok(inspected.squares.find(s=>s.x===wall.x&&s.y===wall.y).tiles.includes(tile('chalk',wall.axis)));
 assert.deepEqual(m.export(),before);assert.deepEqual(new StructuredWorkshopModel(before,m.bounds,props).export(),before);
});
test('adjacent rooms retain separate finishes on the same shared wall and undo restores both sides',()=>{
 const m=model();add(m,'b',[10,4,16,10]);paint(m,'a','chalk');const before=m.export();m.begin('Paint second room');paint(m,'b','weathered');m.commit();const changed=m.export(),wall=m.scene.walls.find(w=>w.axis==='W'&&w.x===10&&w.y===5);
 assert.equal(wall.finishes.positive,tile('chalk','W'));assert.equal(wall.finishes.negative,tile('weathered','W'));
 m.undo();assert.deepEqual(m.export(),before);m.redo();assert.deepEqual(m.export(),changed);
});
test('both face compilations preserve ordinary door and profiled window hosts and surrounds',()=>{
 const m=model(),hosts=m.scene.walls.filter(w=>w.axis==='N'&&w.y===10).slice(1,3);
 for(const [i,w]of hosts.entries())assert.equal(m.structure({type:'opening.add',opening:{id:'o'+i,hostWallId:w.id,kind:i?'window':'door',tile:i?'tian_tall_steel_window_N_0':'doorN'}}).ok,true);
 const openings=structuredClone(m.scene.openings);paint(m,'a','chalk');paint(m,'a','weathered','outside');
 for(const [options,style]of [[{},'weathered'],[{finishRoomId:'a'},'chalk']]){const p=compileStructuralScene(m.scene,props,options);assert.ok(p.squares.find(s=>s.x===hosts[0].x&&s.y===hosts[0].y).tiles.includes(`tian_masonry_${style}_11`));assert.equal(p.polygonGeometry.walls.find(w=>w.id===hosts[1].id).tile,tile(style,'N'));}
 assert.deepEqual(m.scene.openings,openings);
});
test('invalid or wrong-axis finishes fail without changing live scene',()=>{
 const m=model(),wall=m.scene.walls.find(w=>w.axis==='N'),before=m.export();
 for(const op of [{type:'wall.finish',id:wall.id,side:'positive',tile:'floor'},{type:'wall.finish',id:wall.id,side:'positive',tile:tile('chalk','W')},{type:'wall.finish',id:wall.id,side:'room',roomId:'missing',tile:tile('chalk','N')},{type:'room.finish',roomId:'a',side:'room',wallN:tile('chalk','N')}]){assert.equal(m.structure(op).ok,false);assert.deepEqual(m.export(),before);}
 const invalid=structuredClone(m.scene);invalid.walls[0].finishes={mystery:tile('chalk','N')};assert.throws(()=>compileStructuralScene(invalid,props),/Invalid wall finishes/);
});
test('moving a boundary extends finishes without losing the original wall identity',()=>{
 const m=model();paint(m,'a','chalk');const old=m.scene.walls.find(w=>w.axis==='N'&&w.y===10);assert.equal(m.structure({type:'room.edgeMove',roomId:'a',wallId:old.id,coordinate:12}).ok,true);
 for(const wall of m.scene.walls){assert.equal(wall.finishes[roomWallSide(m.scene.rooms[0],wall)],tile('chalk',wall.axis));}
 assert.equal(m.scene.walls.find(w=>w.id===old.id).y,12);
});
test('chamfered diagonal walls inherit the room-facing finish on the correct half-plane',()=>{
 for(const corner of ['NW','NE','SW','SE']){
  const m=model();paint(m,'a','chalk');paint(m,'a','weathered','outside');const r=m.structure({type:'room.chamfer',roomId:'a',corner,distance:2});assert.equal(r.ok,true,r.reason);
  for(const wall of m.scene.walls.filter(w=>w.axis.startsWith('D'))){const inside=roomWallSide(m.scene.rooms[0],wall);assert.equal(wall.finishes[inside],tile('chalk',wall.materialAxis));assert.equal(wall.finishes[inside==='positive'?'negative':'positive'],tile('weathered',wall.materialAxis));}
 }
});
test('locked room finishes reject painting and copied levels retain both faces',()=>{
 const m=model();paint(m,'a','chalk');paint(m,'a','weathered','outside');assert.equal(m.structure({type:'entities.lock',ids:['a'],locked:true}).ok,true);const before=m.export();assert.equal(m.structure({type:'wall.finish',id:m.scene.walls[0].id,side:'positive',tile:tile('navy','N')}).ok,false);assert.deepEqual(m.export(),before);
 assert.equal(m.structure({type:'entities.lock',ids:['a'],locked:false}).ok,true);assert.equal(m.structure({type:'level.copyLayout',fromLevelId:'level:0',toIndex:1,copyId:'up'}).ok,true);
 for(const wall of m.scene.walls.filter(w=>w.levelId==='level:0'))assert.deepEqual(m.scene.walls.find(w=>w.id==='up:'+wall.id).finishes,wall.finishes);
});
