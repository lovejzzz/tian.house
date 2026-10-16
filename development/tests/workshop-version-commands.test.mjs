import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {IndexedHouseLibrary} from '../src/indexed-house-library.js';
import {WorkshopCommandGateway} from '../src/workshop-command-gateway.js';
import {WorkshopVersions} from '../src/workshop-versions.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {DraftPersistence,IndexedDraftRepository,editorSnapshot,restoreEditorSnapshot,validateEditorSnapshot} from '../src/workshop-draft.js';
const bounds=[0,0,20,20],properties={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''}};
function setup(){const db=new IDBFactory(),library=new IndexedHouseLibrary(bounds,properties,{indexedDB:db,legacyStorage:{getItem:()=>null}}),model=new StructuredWorkshopModel({version:1,name:'Study',squares:[],items:[],vehicles:[]},bounds,properties),repo=new IndexedDraftRepository(db),persistence=new DraftPersistence(repo);return {db,library,model,repo,persistence,gateway:new WorkshopCommandGateway(model,new Map(),library,persistence)};}
const req=(model,id,op)=>({requestId:id,baseRevision:model.revision,operations:[op]});
const add={type:'room.add',room:{id:'room',name:'Study',levelId:'ground',z:0,rect:[2,2,8,7],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}};
test('same envelope saves versions and branches with deterministic preview, durable receipts and undo-safe retries',async()=>{
 const {model,library,gateway,repo}=setup();assert.equal((await gateway.commitAndSave(req(model,'build',add))).ok,true);
 const save=req(model,'save-layout',{type:'versions.save',label:'Layout'}),before=editorSnapshot(model);assert.equal((await gateway.preview(save)).ok,true);assert.equal((await library.versions()).length,0);assert.deepEqual(editorSnapshot(model),before);
 const saved=await gateway.commitAndSave(save);assert.equal(saved.ok,true);assert.equal(saved.changed,false);assert.equal(saved.revision,before.revision);assert.deepEqual(await gateway.commitAndSave(save),saved);assert.equal((await library.versions()).length,1);
 const branch=req(model,'branch-a',{type:'versions.branch',id:saved.version.id,name:'Alternative'}),p1=await gateway.preview(branch),p2=await gateway.preview(branch);assert.equal(p1.plan.sceneDocument.id,p2.plan.sceneDocument.id);assert.deepEqual(model.export(),before.plan);
 const built=await gateway.commitAndSave(branch);assert.equal(built.ok,true);assert.equal(model.scene.id,p1.plan.sceneDocument.id);assert.equal(model.plan.name,'Alternative');assert.notEqual(model.scene.id,before.plan.sceneDocument.id);assert.deepEqual(model.scene.rooms,before.plan.sceneDocument.rooms);
 const persisted=await repo.load();validateEditorSnapshot(persisted.snapshot,bounds,properties);model.undo();const undone=editorSnapshot(model);assert.deepEqual(await gateway.commitAndSave(branch),built);assert.deepEqual(editorSnapshot(model),undone);assert.equal((await gateway.preview(branch)).replayed,true);
 const restored=new StructuredWorkshopModel(persisted.snapshot.plan,bounds,properties);restoreEditorSnapshot(restored,persisted.snapshot);const reopened=new WorkshopCommandGateway(restored,new Map(),library,new DraftPersistence(repo,persisted.revision));assert.deepEqual(await reopened.commitAndSave(branch),built);assert.equal((await library.versions()).length,2);
});
test('version requests reject mixed batches, stale revisions and reused IDs without affecting geometry or library',async()=>{
 const {model,library,gateway}=setup(),save=req(model,'same',{type:'versions.save',label:'Baseline'});assert.equal((await gateway.commitAndSave(save)).ok,true);const before=editorSnapshot(model),count=(await library.versions()).length;
 for(const request of [{...save,operations:[{type:'rename',name:'Wrong'}]},{...save,operations:[{type:'versions.save',label:'Other'}]},req(model,'mixed',{type:'versions.save',label:'Mixed'})]){if(request.requestId==='mixed')request.operations.push(add);assert.equal((await gateway.commitAndSave(request)).ok,false);}
 assert.equal((await gateway.commitAndSave({...req(model,'stale',{type:'versions.save',label:'Old'}),baseRevision:99})).ok,false);assert.deepEqual(editorSnapshot(model),before);assert.equal((await library.versions()).length,count);
});
test('failed draft write leaves a reusable immutable version; retry after reopening does not duplicate it',async()=>{
 const {model,library,gateway,repo}=setup();gateway.versions.persistence={save:async()=>{throw Error('Quota exceeded');}};const request=req(model,'retry-save',{type:'versions.save',label:'Safe'}),before=editorSnapshot(model);
 assert.equal((await gateway.commitAndSave(request)).ok,false);assert.deepEqual(editorSnapshot(model),before);const first=(await library.versions())[0];assert.equal((await library.versions()).length,1);
 const recovered=new WorkshopCommandGateway(model,new Map(),library,new DraftPersistence(repo));const result=await recovered.commitAndSave(request);assert.equal(result.ok,true);assert.equal(result.version.id,first.id);assert.equal(result.version.savedAt,first.savedAt);assert.equal((await library.versions()).length,1);assert.equal((await repo.load()).snapshot.commandReceipts.length,1);
});
test('restore retry reuses its checkpoint and cannot overwrite a competing editor draft',async()=>{
 const {model,library,gateway,repo,persistence}=setup();const saved=await gateway.commitAndSave(req(model,'baseline',{type:'versions.save',label:'Empty'}));await gateway.commitAndSave(req(model,'build',add));const before=editorSnapshot(model),request=req(model,'restore-empty',{type:'versions.restore',id:saved.version.id});
 gateway.versions.persistence={save:async()=>{throw Error('temporary failure');}};assert.equal((await gateway.commitAndSave(request)).ok,false);assert.deepEqual(editorSnapshot(model),before);const checkpoint=(await library.versions()).find(v=>v.kind==='checkpoint');
 gateway.versions.persistence=persistence;const result=await gateway.commitAndSave(request);assert.equal(result.ok,true);assert.equal(result.checkpoint.id,checkpoint.id);assert.equal(result.checkpoint.savedAt,checkpoint.savedAt);assert.equal((await library.versions()).length,2);
 const record=await repo.load(),stale=new StructuredWorkshopModel(record.snapshot.plan,bounds,properties);restoreEditorSnapshot(stale,record.snapshot);const concurrent=new WorkshopCommandGateway(stale,new Map(),library,new DraftPersistence(repo,record.revision));await gateway.commitAndSave(req(model,'newer',{type:'rename',name:'Newer'}));const staleBefore=editorSnapshot(stale);const rejected=await concurrent.commitAndSave(req(stale,'conflicting-restore',{type:'versions.restore',id:saved.version.id}));assert.equal(rejected.ok,false);assert.match(rejected.error,/Another editor/);assert.deepEqual(editorSnapshot(stale),staleBefore);assert.equal((await repo.load()).snapshot.plan.name,'Newer');
});
test('visible Versions service shares receipts with the build command gateway',async()=>{
 const {model,library,gateway,persistence}=setup();const service=new WorkshopVersions(model,library,persistence);const version=await service.save({label:'UI checkpoint',baseRevision:0,requestId:'ui-save'});const replay=await gateway.commitAndSave(req(model,'ui-save',{type:'versions.save',label:'UI checkpoint'}));assert.equal(replay.ok,true);assert.equal(replay.version.id,version.id);assert.equal((await library.versions()).length,1);
 const listed=await gateway.listVersions();assert.equal(listed.versions[0].id,version.id);assert.equal('requestFingerprint'in listed.versions[0],false);assert.equal('plan'in listed.versions[0],false);
});

test('named save holds edits until durable receipt without replacing live scene or history',async()=>{
 const {model,library,gateway,persistence}=setup();await gateway.commitAndSave(req(model,'build',add));
 const plan=model.plan,scene=model.scene,history=model.undoStack,receipts=model.commandReceipts;
 let release,entered;const waiting=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 gateway.versions.persistence={saveEditor:async captured=>{entered();await gate;return persistence.saveEditor(captured);}};
 const request=req(model,'named-durable',{type:'versions.save',label:'Durable'}),saving=gateway.commitAndSave(request);
 await waiting;assert.equal(model.writeLocked,true);assert.equal(model.commandReceipts,receipts);
 const competing=await gateway.preview(req(model,'competing',{type:'rename',name:'Wrong'}));assert.equal(competing.ok,false);
 release();const result=await saving;assert.equal(result.ok,true);assert.equal(model.writeLocked,false);
 assert.equal(model.plan,plan);assert.equal(model.scene,scene);assert.equal(model.undoStack,history);
 assert.equal(model.commandReceipts.at(-1).requestId,request.requestId);assert.equal((await library.versions()).length,1);
 assert.deepEqual(await gateway.commitAndSave(request),result);
});
