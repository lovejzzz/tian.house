import test from 'node:test';import assert from 'node:assert/strict';
import {saveHouseCopy,readHouseLibrary} from '../src/house-library.js';
import rosewood from '../src/rosewood-house.js';import glasshouse from '../src/showcase-house.js';import {validateHousePlan} from '../src/workshop-model.js';
const bounds=[7988,11390,8020,11425];
test('saved houses are independent snapshots, identical saves deduplicate, and failed writes preserve the library',()=>{let data=null;const storage={getItem:()=>data,setItem:(_,v)=>{data=v;}};const plan=structuredClone(glasshouse);saveHouseCopy(storage,plan,bounds,{id:'one',now:'2026-10-12T00:00:00Z'});plan.name='Later version';assert.notEqual(readHouseLibrary(storage,bounds)[0].plan.name,plan.name);saveHouseCopy(storage,plan,bounds,{id:'two',now:'2026-10-12T00:01:00Z'});saveHouseCopy(storage,plan,bounds,{id:'three'});assert.equal(readHouseLibrary(storage,bounds).length,2);const before=data;storage.setItem=()=>{throw Error('Quota exceeded');};plan.name='Unsaved';assert.throws(()=>saveHouseCopy(storage,plan,bounds),/Quota/);assert.equal(data,before);});
test('both preserved house templates are valid and the original retains its computer and pitched roof',()=>{validateHousePlan(rosewood,bounds);validateHousePlan(glasshouse,bounds);const tiles=rosewood.squares.flatMap(s=>s.tiles);assert.ok(tiles.includes('appliances_com_01_74'));assert.ok(tiles.some(t=>t.includes('roofs_')));assert.equal(rosewood.name,'Rosewood Retreat');});

test('new house archives the current plan and undo restores its name, contents and geometry',async()=>{
 const {createHouseDraft}=await import('../src/house-library.js'),{WorkshopModel}=await import('../src/workshop-model.js');
 let data=null;const storage={getItem:()=>data,setItem:(_,v)=>data=v};const model=new WorkshopModel(glasshouse,bounds,{}),before=model.export();
 createHouseDraft(storage,model,bounds,'Courtyard Study');assert.equal(readHouseLibrary(storage,bounds)[0].plan.name,before.name);assert.equal(model.plan.name,'Courtyard Study');assert.equal(model.plan.items.length,0);assert.equal(model.plan.vehicles.length,0);assert.ok(model.plan.squares.every(s=>s.z===0&&s.tiles.join()==='blends_natural_01_16'));
 model.undo();assert.deepEqual(model.export(),before);
});
test('new house never clears a draft when preserving the old house fails',async()=>{
 const {createHouseDraft}=await import('../src/house-library.js'),{WorkshopModel}=await import('../src/workshop-model.js');const model=new WorkshopModel(glasshouse,bounds,{}),before=model.export();
 assert.throws(()=>createHouseDraft({getItem:()=>null,setItem:()=>{throw Error('Storage full');}},model,bounds),/Storage full/);assert.deepEqual(model.export(),before);assert.equal(model.undoStack.length,0);
});
