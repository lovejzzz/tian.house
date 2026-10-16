import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {IndexedHouseLibrary} from '../src/indexed-house-library.js';
const bounds=[0,0,10,10],plan={version:1,name:'Photo house',squares:[],items:[]};
const setup=(legacy=[])=>{let raw=JSON.stringify(legacy);const storage={getItem:()=>raw,setItem:()=>{throw Error('Legacy quota full');}};return {library:new IndexedHouseLibrary(bounds,{}, {indexedDB:new IDBFactory(),legacyStorage:storage}),storage,raw:()=>raw};};
test('old local library migrates without rewriting its backup, and immutable identical saves deduplicate',async()=>{
 const row={id:'old',savedAt:'2026-10-12T00:00:00Z',plan},s=setup([row]);assert.deepEqual(await s.library.list(),[row]);assert.equal(s.raw(),JSON.stringify([row]));
 assert.equal((await s.library.save(plan,{id:'duplicate'})).id,'old');const next={...plan,name:'New version'};await s.library.save(next,{id:'new',now:'2026-10-13T00:00:00Z'});next.name='Unsaved change';assert.deepEqual((await s.library.list()).map(r=>r.plan.name),['New version','Photo house']);
 const reopened=new IndexedHouseLibrary(bounds,{}, {indexedDB:s.library.indexedDB,legacyStorage:s.storage});assert.equal((await reopened.list()).length,2);
});
test('concurrent identical saves are serialized by IndexedDB and do not create duplicates',async()=>{
 const {library}=setup();const results=await Promise.all([library.save(plan,{id:'one'}),library.save(plan,{id:'two'})]);assert.equal(results[0].id,results[1].id);assert.equal((await library.list()).length,1);
});
test('large houses roundtrip through compressed library records even when localStorage cannot write',async()=>{
 const {library}=setup(),large={...plan,description:'large reference payload '.repeat(30000)};await library.save(large);assert.deepEqual((await library.list())[0].plan,large);
 const db=await library.database();const encoded=await new Promise((resolve,reject)=>{const tx=db.transaction('houses'),r=tx.objectStore('houses').getAll();tx.oncomplete=()=>resolve(r.result[0]);tx.onerror=()=>reject(tx.error);});db.close();assert.equal(encoded.encoding,'gzip-interned-json-v1');assert.ok(encoded.data.length<encoded.uncompressedBytes);
});
test('invalid legacy library is surfaced, never silently replaced with an empty collection',async()=>{
 const {library}=setup([{id:'bad',savedAt:'today',plan:{}}]);await assert.rejects(library.list());await assert.rejects(library.save(plan));
});
