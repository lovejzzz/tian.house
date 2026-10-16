import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {IndexedHouseLibrary} from '../src/indexed-house-library.js';
import {WorkshopVersions} from '../src/workshop-versions.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {editorSnapshot} from '../src/workshop-draft.js';
import {migrateHousePlan} from '../src/scene-document.js';
const bounds=[0,0,10,10],plan={version:1,name:'Study',squares:[],items:[],vehicles:[]};
function setup(){const library=new IndexedHouseLibrary(bounds,{}, {indexedDB:new IDBFactory(),legacyStorage:{getItem:()=>null}}),model=new StructuredWorkshopModel({...plan,sceneDocument:migrateHousePlan(plan,bounds,{sceneId:'original'})},bounds,{}),writes=[];return {library,model,writes,service:new WorkshopVersions(model,library,{save:async snapshot=>writes.push(structuredClone(snapshot))})};}
test('named versions remain distinct while content storage deduplicates and survives reopening',async()=>{
 const {library,model,service}=setup();const a=await service.save({label:'Layout',baseRevision:0}),b=await service.save({label:'Approved',baseRevision:0});assert.notEqual(a.id,b.id);assert.equal(a.digest,b.digest);assert.equal((await library.list()).length,0);await library.save(model.export());assert.equal((await library.list()).length,1);
 const reopened=new IndexedHouseLibrary(bounds,{}, {indexedDB:library.indexedDB,legacyStorage:{getItem:()=>null}});assert.equal((await reopened.versions()).length,2);assert.deepEqual((await reopened.version(a.id)).plan,model.export());
 await assert.rejects(library.saveVersion(model.export(),{id:a.id,label:'Overwrite'}),/cannot be overwritten/);assert.equal((await library.version(a.id)).label,'Layout');
});
test('restore preserves current draft in a checkpoint and is undoable; branch has independent scene identity',async()=>{
 const {library,model,service,writes}=setup(),v=await service.save({label:'Layout',baseRevision:0});model.begin('Rename');model.plan.name='Furnished';model.commit();const current=model.export();
 await service.restore({id:v.id,baseRevision:model.revision});assert.equal(model.plan.name,'Study');assert.equal(model.scene.id,'original');const checkpoint=(await library.versions()).find(v=>v.kind==='checkpoint');assert.deepEqual((await library.version(checkpoint.id)).plan,current);assert.deepEqual(writes.at(-1),editorSnapshot(model));
 model.undo();assert.deepEqual(model.export(),current);model.redo();assert.equal(model.plan.name,'Study');
 await service.restore({id:v.id,baseRevision:model.revision,branchName:'Alternative'});assert.equal(model.plan.name,'Alternative');assert.notEqual(model.scene.id,'original');assert.equal((await library.version(v.id)).plan.sceneDocument.id,'original');assert.deepEqual(model.scene.rooms,(await library.version(v.id)).plan.sceneDocument.rooms);
});
test('failed preservation or draft persistence cannot change the active scene or its history',async()=>{
 const {library,model,service}=setup(),v=await service.save({label:'Layout',baseRevision:0});model.begin('Rename');model.plan.name='Latest';model.commit();const before=editorSnapshot(model);
 const save=library.saveVersion.bind(library);library.saveVersion=async()=>{throw Error('Quota exceeded');};await assert.rejects(service.restore({id:v.id,baseRevision:model.revision}),/Quota/);assert.deepEqual(editorSnapshot(model),before);assert.equal(model.writeLocked,false);
 library.saveVersion=save;service.persistence.save=async()=>{throw Error('Another editor saved changes');};await assert.rejects(service.restore({id:v.id,baseRevision:model.revision}),/Another editor/);assert.deepEqual(editorSnapshot(model),before);assert.equal(model.writeLocked,false);assert.ok((await library.versions()).some(v=>v.kind==='checkpoint'));
});
test('stale requests and concurrent edits are rejected before saving versions',async()=>{
 const {library,model,service}=setup();await assert.rejects(service.save({label:'Old',baseRevision:9}),/Scene changed/);model.begin('Editing');await assert.rejects(service.save({label:'Partial',baseRevision:0}),/Finish/);model.cancel();assert.equal((await library.versions()).length,0);
 const original=library.saveVersion.bind(library);let release;library.saveVersion=async(...args)=>{await new Promise(r=>release=r);return original(...args);};const save=service.save({label:'Safe',baseRevision:0});assert.equal(model.writeLocked,true);await assert.rejects(service.restore({id:'x',baseRevision:0}),/Finish/);release();await save;assert.equal(model.writeLocked,false);
});
test('v1 database upgrade retains old content and adds a separate named version store',async()=>{
 const idb=new IDBFactory();const db=await new Promise((resolve,reject)=>{const r=idb.open('upgrade',1);r.onupgradeneeded=()=>r.result.createObjectStore('houses',{keyPath:'digest'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const library=new IndexedHouseLibrary(bounds,{}, {indexedDB:idb,name:'upgrade',legacyStorage:{getItem:()=>null}});const record=await library.record({id:'legacy-record',savedAt:'2026-10-12T00:00:00Z',plan});await new Promise((resolve,reject)=>{const tx=db.transaction('houses','readwrite');tx.objectStore('houses').add(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();const before=await library.list();assert.equal(before[0].id,'legacy-record');await library.saveVersion(plan,{label:'First checkpoint'});assert.deepEqual(await library.list(),before);assert.equal((await library.versions()).length,1);
});
