import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {returnStairEntry} from '../src/scene-return-stairs.js';
import {World} from '../src/world.js';
const bounds=[0,0,25,25],entry=returnStairEntry('W','left');
const props={floor:{solidfloor:''},n:{WallN:''},w:{WallW:''},chair:{solid:''},...Object.fromEntries(entry.parts.map(p=>[p.tile,{solidfloor:'',TianReturnStair:''}]))};
function setup(upper=true){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},bounds,props);for(const z of upper?[0,1]:[0]){m.begin('Room');assert.equal(m.structure({type:'room.add',room:{id:'r'+z,name:'Room',levelId:'level:'+z,z,rect:[1,1,22,22],floorTile:'floor',wallN:'n',wallW:'w'}}).ok,true);m.commit();}return m;}
const link={id:'return',kind:'stairs',shape:'return',assetId:entry.id,axis:'W',handedness:'left',run:3,x:5,y:5,fromLevelId:'level:0',toLevelId:'level:1'};
test('return link derives shaft and runtime path; reconstruction, removal and undo retain the source floor',()=>{
 const m=setup();m.begin('Return stair');assert.equal(m.structure({type:'stairs.add',link}).ok,true);m.commit();assert.equal(m.plan.returnStairs.length,1);
 for(let x=5;x<9;x++)for(let y=5;y<7;y++)assert.ok(!m.square(x,y,1).tiles.includes('floor'));
 const saved=m.export(),reopened=new StructuredWorkshopModel(saved,bounds,props);assert.deepEqual(reopened.export(),saved);
 const world=new World({playableBounds:bounds},props);world.setHousePlan(saved);const route=world.returnStairs[0].path,actor={x:route.bottom.x+.5,y:route.bottom.y+.5,z:0};
 for(const c of [...route.cells,route.top])world.move(actor,c.x+.5-actor.x,c.y+.5-actor.y);assert.equal(actor.z,1);
 m.begin('Remove');assert.equal(m.structure({type:'stairs.remove',id:link.id}).ok,true);m.commit();assert.equal(m.plan.returnStairs,undefined);assert.ok(m.square(6,6,1).tiles.includes('floor'));m.undo();assert.deepEqual(m.export(),saved);
});
test('return stairs reject missing landings, blocked headroom and internal partitions atomically',()=>{
 const m=setup(false),before=m.export();assert.equal(m.structure({type:'stairs.add',link}).ok,false);assert.deepEqual(m.export(),before);
 for(const z of [0,1]){const m=setup();m.begin('Obstruction');m.place({id:'chair',parts:[{dx:0,dy:0,tile:'chair'}]},6,5,z);m.commit();const saved=m.export();assert.equal(m.structure({type:'stairs.add',link}).ok,false);assert.deepEqual(m.export(),saved);}
 const walls=setup();walls.begin('Partition');walls.structure({type:'walls.draw',pathId:'partition',levelId:'level:0',points:[[7,5],[7,6]],wallN:'n',wallW:'w'});walls.commit();assert.match(walls.structure({type:'stairs.add',link}).reason,/internal walls/);
});
test('editor placement, picking, moving and erasing share the return-link compiler',()=>{
 const m=setup();m.begin('Place');assert.equal(m.place(entry,5,5,0).ok,true);m.commit();const original=m.export(),id=m.stairAt(6,6,0).id;
 m.begin('Move');assert.equal(m.place({...entry,moveLinkId:id},10,10,0).ok,true);m.commit();assert.equal(m.stairAt(11,11,0).id,id);assert.ok(m.square(6,6,1).tiles.includes('floor'));assert.equal(m.plan.returnStairs[0].x,10);
 m.undo();assert.deepEqual(m.export(),original);m.begin('Erase');m.erase(6,6,0);m.commit();assert.equal(m.scene.verticalLinks.length,0);assert.equal(m.plan.returnStairs,undefined);m.undo();assert.equal(m.stairAt(6,6,0).id,id);
});
