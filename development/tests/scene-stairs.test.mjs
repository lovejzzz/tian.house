import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';import{stairEntry}from '../src/scene-stairs.js';import{World}from '../src/world.js';
const props={...JSON.parse(fs.readFileSync(new URL('../private-assets/world/properties.json',import.meta.url))),floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},chair:{solid:''}},bounds=[0,0,20,20];
function setup(upper=true){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},bounds,props);for(const z of upper?[0,1]:[0]){m.begin('Room');assert.equal(m.structure({type:'room.add',room:{id:'r'+z,name:'Room',levelId:'level:'+z,z,rect:[1,1,17,17],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);m.commit();}return m;}
test('semantic staircase opens upper floor and supports real world traversal, removal and undo',()=>{
 const m=setup();m.begin('Stairs');assert.equal(m.place(stairEntry('N'),7,7,0).ok,true);assert.equal(m.commit(),true);const id=m.scene.verticalLinks[0].id;assert.equal(m.scene.verticalLinks[0].toLevelId,'level:1');for(const y of [7,8,9])assert.equal(m.square(7,y,1).tiles.includes('floor'),false);
 const w=new World({playableBounds:bounds},props);w.setHousePlan(m.export());const actor={x:7.5,y:7.1,z:0};assert.equal(w.move(actor,0,-.3),true);assert.equal(actor.z,1);assert.equal(w.move(actor,0,.3),true);assert.equal(actor.z,0);
 m.begin('Erase stairs');m.erase(7,8,0);assert.equal(m.commit(),true);assert.equal(m.scene.verticalLinks.length,0);assert.ok(m.square(7,8,1).tiles.includes('floor'));m.undo();assert.equal(m.scene.verticalLinks[0].id,id);assert.equal(new StructuredWorkshopModel(m.export(),bounds,props).scene.verticalLinks[0].id,id);
});
test('stairs move restores old shaft and cuts the new shaft without changing identity',()=>{
 const m=setup();m.begin('Stairs');m.place(stairEntry('W'),7,7,0);m.commit();const id=m.scene.verticalLinks[0].id;m.begin('Move stairs');assert.equal(m.structure({type:'stairs.move',id,x:10,y:10,axis:'N'}).ok,true);m.commit();assert.ok(m.square(8,7,1).tiles.includes('floor'));assert.equal(m.square(10,11,1).tiles.includes('floor'),false);assert.equal(m.scene.verticalLinks[0].id,id);
});
test('stairs reject occupied lower floor or headroom and do not corrupt the draft',()=>{
 for(const z of [0,1]){const m=setup();m.begin('Chair');m.place({id:'tile:chair',parts:[{dx:0,dy:0,tile:'chair'}]},7,8,z);m.commit();const before=m.export();assert.equal(m.place(stairEntry('N'),7,7,0).ok,false);assert.deepEqual(m.export(),before);}
});
test('stairs create a missing upper level and landing but reject the height limit',()=>{
 const m=setup(false);assert.equal(m.place(stairEntry('N'),7,7,0).ok,true);assert.ok(m.scene.levels.some(l=>l.index===1));assert.ok(m.square(7,6,1).tiles.includes('carpentry_02_58'));const before=m.export();assert.equal(m.structure({type:'stairs.add',link:{id:'bad',kind:'stairs',assetId:'stairs:N',axis:'N',x:7,y:7,fromLevelId:'level:0',toLevelId:'level:0'}}).ok,false);assert.deepEqual(m.export(),before);
});

test('placing a staircase at the highest allowed floor is rejected without adding a level',()=>{const m=setup(false);m.begin('Top room');m.structure({type:'room.add',room:{id:'top',name:'Top',levelId:'level:3',z:3,rect:[1,1,17,17],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});m.commit();const before=m.export();assert.equal(m.place(stairEntry('N'),7,7,3).ok,false);assert.deepEqual(m.export(),before);});
test('picked stair preview preserves original link until a valid move commits and cancel restores it',()=>{
 const m=setup();m.begin('Stairs');m.place(stairEntry('N'),7,7,0);m.commit();const link=m.stairAt(7,8,0),before=m.export(),moving={...stairEntry('W'),moveLinkId:link.id};
 assert.equal(m.placement(moving,10,10,0).ok,true);assert.deepEqual(m.export(),before);assert.equal(m.placement(moving,10,10,1).ok,false);
 m.begin('Move');assert.equal(m.place(moving,10,10,0).ok,true);assert.equal(m.scene.verticalLinks.length,1);assert.equal(m.scene.verticalLinks[0].id,link.id);m.cancel();assert.deepEqual(m.export(),before);
 m.begin('Move');m.place(moving,10,10,0);m.commit();assert.equal(m.scene.verticalLinks[0].axis,'W');m.undo();assert.deepEqual(m.export(),before);
});
test('new staircase preview and placement agree on furniture conflicts and copies receive new identity',()=>{
 const m=setup();m.begin('Stairs');m.place(stairEntry('N'),7,7,0);m.commit();const original=m.scene.verticalLinks[0].id;assert.equal(m.placement(stairEntry('N'),7,7,0).ok,false);assert.equal(m.place(stairEntry('N'),7,7,0).ok,false);
 assert.equal(m.placement(stairEntry('W'),10,10,0).ok,true);assert.equal(m.place(stairEntry('W'),10,10,0).ok,true);assert.equal(m.scene.verticalLinks.length,2);assert.notEqual(m.scene.verticalLinks[1].id,original);
});
test('reflooring above stairs preserves the shaft and removing stairs restores the new material',()=>{
 const m=setup();m.properties.stone={solidfloor:''};m.begin('Stairs');m.place(stairEntry('N'),7,7,0);m.commit();m.begin('Floor');assert.equal(m.structure({type:'room.floor',roomId:'r1',tile:'stone'}).ok,true);m.commit();assert.ok(m.square(7,6,1).tiles.includes('stone'));assert.equal(m.square(7,8,1).tiles.includes('stone'),false);m.begin('Remove stairs');m.erase(7,8,0);m.commit();assert.ok(m.square(7,8,1).tiles.includes('stone'));
});

test('copying a floor preserves the stair shaft and permits a far wall at the upper landing',()=>{
 const m=setup(false);assert.equal(m.place(stairEntry('N'),7,2,0).ok,true);const link=structuredClone(m.scene.verticalLinks[0]);assert.equal(m.structure({type:'level.copyLayout',fromLevelId:'level:0',toIndex:1,copyId:'upper'}).ok,true);assert.deepEqual(m.scene.verticalLinks[0],link);assert.ok(m.square(7,1,1).tiles.includes('wall_1'));for(const y of [2,3,4])assert.equal(m.square(7,y,1).tiles.includes('floor'),false);const w=new World({playableBounds:bounds},props);w.setHousePlan(m.export());const actor={x:7.5,y:2.1,z:0};assert.equal(w.move(actor,0,-.3),true);assert.equal(actor.z,1);assert.equal(w.move(actor,0,.3),true);assert.equal(actor.z,0);
});
