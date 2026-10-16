import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {World} from '../src/world.js';import {Visibility} from '../src/visibility.js';
import {straightStairEntry} from '../src/scene-return-stairs.js';import {installCafeAssets} from '../src/cafe-assets.js';
const props={floor:{solidfloor:''},n:{WallN:''},w:{WallW:''}},atlas={regions:{}};installCafeAssets(props,atlas);
function setup(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,30,30],props);for(const z of [0,1])assert.equal(m.structure({type:'room.add',room:{id:'r'+z,name:'Floor',levelId:'level:'+z,z,rect:[1,1,28,28],floorTile:'floor',wallN:'n',wallW:'w'}}).ok,true);return m;}
test('open passage removes the physical wall while preserving its host, save and undo on both axes',()=>{
 for(const axis of ['N','W']){
 const m=setup();assert.equal(m.structure({type:'walls.draw',pathId:'partition',levelId:'level:0',points:axis==='N'?[[8,8],[9,8]]:[[8,8],[8,9]],wallN:'n',wallW:'w'}).ok,true);
 const wall=m.scene.walls.find(w=>w.independent),before=m.export(),a=axis==='N'?[8.5,7.5]:[7.5,8.5],b=[8.5,8.5],world=new World({playableBounds:m.bounds},props);
 world.setHousePlan(before);assert.equal(world.canStep(...a,...b,0),false);
 m.begin('Open passage');assert.equal(m.structure({type:'opening.add',opening:{id:'pass',hostWallId:wall.id,kind:'passage'}}).ok,true);m.commit();
 world.setHousePlan(m.export());assert.equal(world.canStep(...a,...b,0),true);assert.equal(new Visibility(world).lineTo({x:a[0],y:a[1],z:0},...b),true);assert.ok(m.scene.walls.some(w=>w.id===wall.id));
 assert.deepEqual(new StructuredWorkshopModel(m.export(),m.bounds,props).export(),m.export());
 m.undo();assert.deepEqual(m.export(),before);m.redo();assert.equal(m.scene.openings[0].kind,'passage');
 assert.equal(m.structure({type:'opening.remove',id:'pass'}).ok,true);world.setHousePlan(m.export());assert.equal(world.canStep(...a,...b,0),false);
 }
});
test('stair exit passage permits ascent but cannot be filled while the staircase uses it',()=>{
 const m=setup();assert.equal(m.structure({type:'walls.draw',pathId:'exit',levelId:'level:1',points:[[13,8],[13,9]],wallN:'n',wallW:'w'}).ok,true);const wall=m.scene.walls.find(w=>w.independent);
 assert.equal(m.structure({type:'opening.add',opening:{id:'exit',hostWallId:wall.id,kind:'passage'}}).ok,true);
 const result=m.place(straightStairEntry('E',5),8,8,0);assert.equal(result.ok,true,result.reason);
 assert.equal(m.structure({type:'walls.draw',pathId:'below-exit',levelId:'level:0',points:[[13,8],[13,9]],wallN:'n',wallW:'w'}).ok,true);
 const world=new World({playableBounds:m.bounds},props);world.setHousePlan(m.export());const path=world.returnStairs[0].path,actor={x:path.bottom.x+.5,y:path.bottom.y+.5,z:0};for(const c of [...path.cells,path.top])world.move(actor,c.x+.5-actor.x,c.y+.5-actor.y);assert.equal(actor.z,1);assert.ok(Math.abs(actor.x-13.5)<1e-8);
 for(const c of [...path.cells].reverse().concat(path.bottom))world.move(actor,c.x+.5-actor.x,c.y+.5-actor.y);assert.equal(actor.z,0);assert.ok(Math.abs(actor.x-path.bottom.x-.5)<1e-8);
 const before=m.export(),fill=m.structure({type:'opening.remove',id:'exit'});assert.equal(fill.ok,false);assert.match(fill.reason,/landing/);assert.deepEqual(m.export(),before);
});
