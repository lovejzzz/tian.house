import test from 'node:test';import assert from 'node:assert/strict';
import {DraftPersistence,prepareEditorSnapshot,editorSnapshot,restoreEditorSnapshot,validateEditorSnapshot} from '../src/workshop-draft.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
const bounds=[0,0,10,10],props={floor:{solidfloor:''},chair:{solid:''}},blank=()=>({version:1,name:'Draft',squares:[{x:2,y:2,z:0,tiles:['floor']}],items:[],vehicles:[]});
test('committed history restores and remains reversible after serialization',()=>{
 const model=new StructuredWorkshopModel(blank(),bounds,props);model.begin('Chair');model.place({parts:[{dx:0,dy:0,tile:'chair'}]},2,2,0);model.commit();
 const snapshot=JSON.parse(JSON.stringify(editorSnapshot(model)));validateEditorSnapshot(snapshot,bounds,props);const restored=new StructuredWorkshopModel(snapshot.plan,bounds,props);restoreEditorSnapshot(restored,snapshot);
 assert.equal(restored.undoStack.length,1);restored.undo();assert.deepEqual(restored.square(2,2,0).tiles,['floor']);restored.redo();assert.deepEqual(restored.square(2,2,0).tiles,['floor','chair']);
});
test('write queue captures each state and uses the previous persisted revision',async()=>{
 const seen=[];const writer=new DraftPersistence({save:async(s,r)=>{await Promise.resolve();seen.push([s.value,r]);return(r??-1)+1;}});
 const s={value:1},a=writer.save(s);s.value=2;const b=writer.save(s);s.value=99;await Promise.all([a,b]);assert.deepEqual(seen,[[1,null],[2,0]]);assert.equal(writer.revision,1);
});
test('failed persistence retains the previous revision and blocks later queued writes',async()=>{
 let calls=0;const writer=new DraftPersistence({save:async()=>{calls++;throw Error('Conflict');}},7);
 const a=writer.save({value:1}),b=writer.save({value:2});const results=await Promise.allSettled([a,b]);assert.ok(results.every(r=>r.status==='rejected'));assert.equal(calls,1);assert.equal(writer.revision,7);
});
test('corrupt history is rejected before restoring a valid current plan',()=>{
 const model=new StructuredWorkshopModel(blank(),bounds,props),snapshot=editorSnapshot(model);snapshot.undoStack.push({label:'Broken',before:blank(),after:{version:1,squares:[{x:999,y:2,z:0,tiles:['floor']}],items:[]}});
 assert.throws(()=>validateEditorSnapshot(snapshot,bounds,props));assert.deepEqual(model.export(),blank());
});
test('removing a stocked legacy shelf commits valid loose contents before persistence',()=>{
 const plan=blank();plan.squares[0].tiles.push('shelf');plan.items.push({type:'Base.WaterBottle',x:2,y:2,z:0,storageTile:'shelf'});
 const model=new StructuredWorkshopModel(plan,bounds,{...props,shelf:{container:'shelves'}});model.begin('Erase shelf');model.erase(2,2,0);model.commit();
 assert.equal(model.plan.items[0].storageTile,undefined);assert.doesNotThrow(()=>validateEditorSnapshot(editorSnapshot(model),bounds,props));model.undo();assert.equal(model.plan.items[0].storageTile,'shelf');
});

test('restored semantic drafts and history recompile stale materialized tiles',()=>{const properties={...props,wall_0:{WallW:''},wall_1:{WallN:''}},m=new StructuredWorkshopModel({version:1,squares:[],items:[]},bounds,properties);m.begin('Room');m.structure({type:'room.add',room:{id:'room',name:'Room',levelId:'level:0',z:0,rect:[2,2,6,6],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});m.commit();const snapshot=editorSnapshot(m);snapshot.plan.squares.find(s=>s.x===3&&s.y===3).tiles=['chair'];snapshot.undoStack[0].after.squares.find(s=>s.x===3&&s.y===3).tiles=['chair'];const restored=new StructuredWorkshopModel(snapshot.plan,bounds,properties);restoreEditorSnapshot(restored,snapshot);assert.deepEqual(restored.square(3,3,0).tiles,['floor']);restored.undo();restored.redo();assert.deepEqual(restored.square(3,3,0).tiles,['floor']);});

import {guardDraftNavigation} from '../src/workshop-draft.js';
test('navigation stays protected until every queued save settles',async()=>{
 const releases=[],writer=new DraftPersistence({save:()=>new Promise(resolve=>releases.push(resolve))});
 const a=writer.save({value:1}),b=writer.save({value:2});let prevented=0;const event={preventDefault(){prevented++;}};
 assert.equal(guardDraftNavigation(event,writer),true);assert.equal(event.returnValue,'');assert.equal(writer.pending,2);
 await Promise.resolve();releases.shift()(0);await a;await Promise.resolve();assert.equal(writer.pending,1);assert.equal(guardDraftNavigation(event,writer),true);
 releases.shift()(1);await b;assert.equal(writer.pending,0);assert.equal(guardDraftNavigation(event,writer),false);assert.equal(prevented,2);
});
test('failed writes and unfinished edits protect navigation but clean drafts do not',async()=>{
 const writer=new DraftPersistence({save:async()=>{throw Error('Quota exceeded');}});const e={preventDefault(){}};
 assert.equal(guardDraftNavigation(e,writer),false);assert.equal(guardDraftNavigation(e,writer,true),true);
 await assert.rejects(writer.save({value:1}));assert.equal(writer.pending,0);assert.equal(guardDraftNavigation(e,writer),true);
});


test('queued editor saves share immutable history but isolate current plans, stack changes and receipts',async()=>{
 const model=new StructuredWorkshopModel(blank(),bounds,props);
 model.begin('Chair');model.place({parts:[{dx:0,dy:0,tile:'chair'}]},2,2,0);model.commit();
 model.commandReceipts=[{requestId:'original'}];
 const history=model.undoStack[0],seen=[],releases=[];
 const writer=new DraftPersistence({save:(snapshot,revision)=>{seen.push({snapshot,revision});return new Promise(resolve=>releases.push(()=>resolve((revision??-1)+1)));}});
 const a=writer.saveEditor(model);await Promise.resolve();
 assert.equal(seen[0].snapshot.undoStack[0],history);
 model.undo();model.commandReceipts[0].requestId='changed';const b=writer.saveEditor(model);
 model.redo();model.plan.name='Later';
 releases.shift()();await a;await Promise.resolve();
 assert.equal(seen[0].snapshot.plan.name,'Draft');
 assert.deepEqual(seen[0].snapshot.plan.squares[0].tiles,['floor','chair']);
 assert.equal(seen[0].snapshot.commandReceipts[0].requestId,'original');
 assert.equal(seen[1].snapshot.undoStack.length,0);assert.equal(seen[1].snapshot.redoStack[0],history);
 assert.deepEqual(seen[1].snapshot.plan.squares[0].tiles,['floor']);
 assert.equal(seen[1].revision,0);releases.shift()();await b;
 assert.equal(writer.pending,0);assert.equal(writer.revision,1);
});

test('prepared snapshots validate all history, own copies, and canonicalize stale tile caches',()=>{
 const properties={...props,wall_0:{WallW:''},wall_1:{WallN:''}},model=new StructuredWorkshopModel({...blank(),squares:[]},bounds,properties);
 model.begin('Room');model.structure({type:'room.add',room:{id:'room',name:'Room',levelId:'level:0',z:0,rect:[2,2,6,6],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});model.commit();
 const source=editorSnapshot(model);source.plan.squares.find(s=>s.x===3&&s.y===3).tiles=['chair'];source.undoStack[0].after.squares.find(s=>s.x===3&&s.y===3).tiles=['chair'];
 const prepared=prepareEditorSnapshot(source,bounds,properties);
 Object.assign(model,prepared);model.index();assert.deepEqual(model.square(3,3,0).tiles,['floor']);
 source.plan.sceneDocument.rooms[0].name='Mutated source';assert.notEqual(model.plan.sceneDocument.rooms[0].name,'Mutated source');
 model.undo();model.redo();assert.deepEqual(model.square(3,3,0).tiles,['floor']);
 source.undoStack[0].before.squares.push({x:999,y:2,z:0,tiles:['floor']});assert.throws(()=>prepareEditorSnapshot(source,bounds,properties));
});

test('prepared current plan cannot mutate aliased historical plan inputs',()=>{
 const plan=blank(),source={plan,revision:1,undoStack:[{label:'Shared',before:plan,after:plan}],redoStack:[]};
 const prepared=prepareEditorSnapshot(source,bounds,props);prepared.plan.name='Changed';
 assert.equal(prepared.undoStack[0].before.name,'Draft');assert.equal(source.plan.name,'Draft');
});
