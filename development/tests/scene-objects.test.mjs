import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
const props={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},table:{IsTable:'',Surface:'32',solid:''},mug:{TianMount:'table'},shelf:{solid:'',container:'shelves'},chair:{solid:''}};
const bounds=[0,0,20,20],entry=tile=>({id:'tile:'+tile,parts:[{dx:0,dy:0,tile}]});
function setup(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},bounds,props);m.begin('Room');m.structure({type:'room.add',room:{id:'room',name:'Room',levelId:'level:0',z:0,rect:[1,1,15,15],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});m.commit();return m;}
test('moving furniture keeps tabletop identity and shelf contents through export and undo',()=>{
 const m=setup();m.begin('Furnish');assert.equal(m.place(entry('table'),3,3,0).ok,true);assert.equal(m.place(entry('mug'),3,3,0).ok,true);assert.equal(m.place(entry('shelf'),4,3,0).ok,true);m.place({itemType:'Base.WaterBottle',storeInContainer:true},4,3,0);assert.equal(m.commit(),true);
 const [table,mug,shelf]=m.scene.objects,stockId=m.scene.legacy.items[0].id;assert.equal(mug.hostId,table.id);
 m.begin('Move');assert.equal(m.structure({type:'objects.move',ids:[table.id,shelf.id],dx:2,dy:1}).ok,true);assert.equal(m.commit(),true);
 assert.deepEqual(m.scene.objects.map(o=>[o.id,o.x,o.y]),[[table.id,5,4],[mug.id,5,4],[shelf.id,6,4]]);assert.equal(m.scene.legacy.items[0].id,stockId);assert.equal(m.plan.items[0].x,6);
 const reopened=new StructuredWorkshopModel(JSON.parse(JSON.stringify(m.export())),bounds,props);assert.equal(reopened.scene.objects[1].hostId,table.id);assert.equal(reopened.plan.items[0].storageTile,'shelf');
 m.undo();assert.equal(m.scene.objects[0].x,3);assert.equal(m.plan.items[0].x,4);m.redo();assert.equal(m.plan.items[0].x,6);
});
test('group movement fails atomically on collision or unsupported floor',()=>{
 const m=setup();m.begin('Furnish');m.place(entry('table'),3,3,0);m.place(entry('chair'),5,3,0);m.commit();const before=m.export(),id=m.scene.objects[0].id;
 for(const dx of [2,16]){m.begin('Invalid move');assert.equal(m.structure({type:'objects.move',ids:[id],dx,dy:0}).ok,false);m.cancel();assert.deepEqual(m.export(),before);}
});
test('mounted object cannot move independently of its support',()=>{
 const m=setup();m.begin('Furnish');m.place(entry('table'),3,3,0);m.place(entry('mug'),3,3,0);m.commit();const id=m.scene.objects[1].id;
 assert.equal(m.structure({type:'objects.move',ids:[id],dx:1,dy:0}).ok,false);
});
test('stock moves once when translated containers overlap old container positions',()=>{
 const m=setup();m.begin('Stock');m.place(entry('shelf'),3,3,0);m.place(entry('shelf'),4,3,0);m.place({itemType:'Base.WaterBottle',storeInContainer:true},3,3,0);m.commit();const stock=m.scene.legacy.items[0].id;
 m.begin('Move');assert.equal(m.structure({type:'objects.move',ids:m.scene.objects.map(o=>o.id),dx:1,dy:0}).ok,true);m.commit();assert.equal(m.plan.items[0].x,4);assert.equal(m.scene.legacy.items[0].id,stock);
});
test('erasing furniture removes mounted children, preserves loose supplies and supports undo',()=>{
 const m=setup();m.begin('Furnish');m.place(entry('table'),3,3,0);m.place(entry('mug'),3,3,0);m.place(entry('shelf'),4,3,0);m.place({itemType:'Base.WaterBottle',storeInContainer:true},4,3,0);m.commit();const before=m.export(),stock=m.scene.legacy.items[0].id;
 m.begin('Erase table');m.erase(3,3,0,{all:true});assert.equal(m.commit(),true);assert.equal(m.scene.objects.length,1);assert.ok(m.square(3,3,0).tiles.includes('floor'));
 m.begin('Erase shelf');m.erase(4,3,0);assert.equal(m.commit(),true);assert.equal(m.scene.objects.length,0);assert.equal(m.plan.items[0].storageTile,undefined);assert.equal(m.scene.legacy.items[0].id,stock);
 m.undo();assert.equal(m.plan.items[0].storageTile,'shelf');m.undo();assert.deepEqual(m.export(),before);
});
test('erasing a tabletop item keeps its supporting furniture',()=>{
 const m=setup();m.begin('Furnish');m.place(entry('table'),3,3,0);m.place(entry('mug'),3,3,0);m.commit();m.begin('Erase mug');m.erase(3,3,0);assert.equal(m.commit(),true);assert.deepEqual(m.scene.objects.map(o=>o.assetId),['tile:table']);
});
test('copy duplicates a group with independent identities, dependent objects and container stock',()=>{
 const m=setup();m.begin('Furnish');m.place(entry('table'),3,3,0);m.place(entry('mug'),3,3,0);m.place(entry('shelf'),4,3,0);m.place({itemType:'Base.WaterBottle',storeInContainer:true},4,3,0);m.commit();const [table,mug,shelf]=m.scene.objects,ids=[table.id,shelf.id];
 m.begin('Group');m.structure({type:'objects.group',ids,groupId:'original-group'});m.commit();const before=m.export();
 m.begin('Copy');assert.equal(m.structure({type:'objects.copy',ids,dx:0,dy:3,copyId:'copy'}).ok,true);m.commit();const copied=m.scene.objects.filter(o=>o.id.startsWith('copy:'));assert.equal(copied.length,3);assert.equal(copied[1].hostId,'copy:'+table.id);assert.equal(copied[0].groupId,'copy:original-group');assert.equal(m.plan.items.length,2);assert.deepEqual(m.plan.items.map(i=>i.y),[3,6]);
 m.begin('Move copy');assert.equal(m.structure({type:'objects.move',ids:ids.map(id=>'copy:'+id),dx:1,dy:0}).ok,true);m.commit();assert.equal(m.scene.objects.find(o=>o.id===table.id).x,3);assert.deepEqual(m.plan.items.map(i=>i.x),[4,5]);
 m.undo();m.undo();assert.deepEqual(m.export(),before);m.redo();const reload=new StructuredWorkshopModel(m.export(),bounds,props);assert.equal(reload.scene.objects.length,6);
});
test('copy fails atomically on collision, repeated identities or unsupported child-only copies',()=>{
 const m=setup();m.begin('Furnish');m.place(entry('table'),3,3,0);m.place(entry('mug'),3,3,0);m.commit();const [table,mug]=m.scene.objects;
 for(const op of [{ids:[table.id],dx:0,dy:0,copyId:'same-cell'},{ids:[mug.id],dx:1,dy:0,copyId:'orphan'}]){const before=m.export();assert.equal(m.structure({type:'objects.copy',...op}).ok,false);assert.deepEqual(m.export(),before);}
 assert.equal(m.structure({type:'objects.copy',ids:[table.id],dx:0,dy:2,copyId:'again'}).ok,true);const before=m.export();assert.equal(m.structure({type:'objects.copy',ids:[table.id],dx:0,dy:4,copyId:'again'}).ok,false);assert.deepEqual(m.export(),before);
});
test('preview and commit share validation without changing scene or history during preview',()=>{
 const m=setup();m.begin('Furnish');m.place(entry('table'),3,3,0);m.place(entry('mug'),3,3,0);m.commit();const before=m.export(),history=structuredClone(m.undoStack),ids=[m.scene.objects[0].id],operation={type:'objects.copy',ids,dx:4,dy:0,copyId:'preview-copy'};
 const preview=m.previewStructure(operation);assert.equal(preview.ok,true);assert.deepEqual(m.export(),before);assert.deepEqual(m.undoStack,history);assert.equal(m.pending,null);
 assert.equal(m.structure(operation).ok,true);assert.deepEqual(m.scene,preview.scene);assert.deepEqual(m.plan.squares,preview.plan.squares);
 const invalid={type:'objects.move',ids,dx:4,dy:0};assert.equal(m.previewStructure(invalid).ok,false);assert.equal(m.structure(invalid).ok,false);
});
test('multi-cell furniture cannot straddle shared room walls',()=>{
 const m=setup();m.begin('Adjacent room');assert.equal(m.structure({type:'room.add',room:{id:'next',name:'Next',levelId:'level:0',rect:[15,1,18,15],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);m.commit();
 const wide={id:'tile:wide',parts:[{dx:0,dy:0,tile:'table'},{dx:1,dy:0,tile:'table'}]},before=m.export();assert.equal(m.place(wide,14,3,0).ok,false);assert.deepEqual(m.export(),before);assert.equal(m.place(wide,12,3,0).ok,true);
 const id=m.scene.objects[0].id,operation={type:'objects.move',ids:[id],dx:2,dy:0};assert.match(m.previewStructure(operation).reason,/span across a wall/);assert.equal(m.structure(operation).ok,false);
});
test('tabletop rehosting preserves identity, rejects unsupported targets and restores through undo',()=>{
 const m=setup();m.catalog=['table','mug','shelf'].map(entry);m.begin('Setup');m.place(entry('table'),3,3,0);m.place(entry('mug'),3,3,0);m.place(entry('table'),6,3,0);m.commit();const [first,mug,second]=m.scene.objects,before=m.export(),moving={...entry('mug'),moveObjectId:mug.id};
 assert.equal(m.placement(moving,7,3,0).ok,false);assert.deepEqual(m.export(),before);
 m.begin('Rehost mug');assert.equal(m.place(moving,6,3,0).ok,true);m.commit();assert.equal(m.scene.objects.length,3);assert.equal(m.scene.objects[1].id,mug.id);assert.equal(m.scene.objects[1].hostId,second.id);assert.equal(m.scene.objects[0].x,3);assert.equal(m.scene.objects[1].x,6);
 assert.deepEqual(new StructuredWorkshopModel(m.export(),bounds,props).export(),m.export());m.undo();assert.deepEqual(m.export(),before);
 m.begin('Lock support');m.structure({type:'entities.lock',ids:[first.id],locked:true});m.commit();assert.equal(m.place(moving,6,3,0).ok,false);
});
test('fine placement preserves anchors, mounted contents, export and undo',()=>{
 const m=setup();m.begin('Furnish');m.place(entry('table'),3,3,0);m.place(entry('mug'),3,3,0);m.commit();const [table,mug]=m.scene.objects;
 m.begin('Fine');assert.equal(m.structure({type:'objects.nudge',ids:[table.id],dx:.1,dy:-.45}).ok,true);assert.equal(m.commit(),true);
 for(const o of m.scene.objects){assert.deepEqual(o.placementOffset,[.1,-.45]);assert.equal(o.x,3);assert.equal(o.y,3);}
 const saved=m.export(),reopened=new StructuredWorkshopModel(JSON.parse(JSON.stringify(saved)),bounds,props);assert.deepEqual(reopened.scene.objects[1].placementOffset,[.1,-.45]);assert.equal(reopened.scene.objects[1].hostId,table.id);
 assert.equal(m.structure({type:'objects.nudge',ids:[mug.id],dx:.05,dy:0}).ok,false);assert.deepEqual(m.export(),saved);
 assert.equal(m.structure({type:'objects.nudge',ids:[table.id],dx:0,dy:-.1}).ok,false);assert.deepEqual(m.export(),saved);
 m.undo();assert.equal(m.scene.objects[0].placementOffset,undefined);m.redo();assert.deepEqual(m.scene.objects[0].placementOffset,[.1,-.45]);
});
