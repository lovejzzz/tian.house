import test from 'node:test';import assert from 'node:assert/strict';import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
const props={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},wall_10:{DoorWallW:''},door:{doorW:''},chair:{solid:''}};
function setup(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props);for(const [id,rect]of [['a',[2,2,6,6]],['b',[6,2,10,6]]])assert.equal(m.structure({type:'room.add',room:{id,name:id,levelId:'level:0',z:0,rect,floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);return m;}
test('remove room preserves shared wall/opening identity and undo restores room and roof',()=>{
 const m=setup(),wall=m.scene.walls.find(w=>w.x===6&&w.y===3&&w.axis==='W');assert.equal(m.structure({type:'opening.add',opening:{id:'shared-door',hostWallId:wall.id,kind:'door',tile:'door'}}).ok,true);
 assert.equal(m.structure({type:'roof.set',roomId:'a',roof:{id:'roof',kind:'flat',tile:'floor'}}).ok,true);
 const before=m.export(),other=structuredClone(m.scene.rooms[1]);m.begin('Remove room');assert.equal(m.structure({type:'room.remove',roomId:'a'}).ok,true);m.commit();
 assert.equal(m.scene.rooms.length,1);assert.deepEqual(m.scene.rooms[0],other);assert.equal(m.scene.walls.length,16);assert.equal(m.scene.openings[0].id,'shared-door');assert.equal(m.square(3,3,0),undefined);assert.equal(m.square(3,3,1),undefined);
 const removed=m.export();m.undo();assert.deepEqual(m.export(),before);m.redo();assert.deepEqual(m.export(),removed);assert.deepEqual(new StructuredWorkshopModel(removed,m.bounds,props).export(),removed);
});
test('occupied rooms and entry points reject atomically',()=>{
 const m=setup();assert.equal(m.place({id:'chair',parts:[{dx:0,dy:0,tile:'chair'}]},3,3,0).ok,true);const occupied=m.export();assert.equal(m.structure({type:'room.remove',roomId:'a'}).ok,false);assert.match(m.lastError,/furnishings/);assert.deepEqual(m.export(),occupied);
 const n=setup();n.plan.sceneDocument.legacy.metadata.spawn={x:3.5,y:3.5,z:0};const entry=n.export();assert.equal(n.structure({type:'room.remove',roomId:'a'}).ok,false);assert.match(n.lastError,/entry point/);assert.deepEqual(n.export(),entry);
});
