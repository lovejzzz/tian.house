import test from 'node:test';
import assert from 'node:assert/strict';
import {Inventory,inventoryState,validateInventory} from '../src/inventory.js';
import {initializeModelIndex,modelList,worldStaticModel} from '../src/item-model-state.js';
import {groundSelection} from '../src/ground-models.js';
import {heldSelection} from '../src/held-models.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';

test('created weapon variant persists through hands, ground transfer and save without reroll',()=>{
 const catalog=useFixtureCatalog(),p=catalog['Base.Hammer'].properties;
 Object.assign(p,{ItemType:'base:weapon',WeaponSpritesByIndex:'Hammer;HammerForged'});
 let draws=0;const inv=new Inventory(inventoryState(),{modelRandom:bound=>{draws++;return bound-1;}}),hammer=inv.create('hammer');
 assert.equal(hammer.modelIndex,1);assert.equal(draws,1);
 inv.equip(hammer.id);assert.equal(heldSelection(inv.state)[0].model,'HammerForged');
 inv.container('floor');inv.transfer(hammer.id,'floor');assert.equal(groundSelection(hammer).name,'HammerForged');
 const saved=JSON.parse(JSON.stringify(inv.state));validateInventory(saved);
 const loaded=new Inventory(saved,{modelRandom:()=>{throw Error('must not reroll');}});
 loaded.transfer(hammer.id,'player');loaded.equip(hammer.id);assert.equal(heldSelection(saved)[0].model,'HammerForged');
 assert.equal(draws,1);delete saved.items[hammer.id].modelIndex;validateInventory(saved);
 assert.equal(heldSelection(saved)[0].model,'Hammer','legacy missing indices retain base sprite');
});
test('static and world lists share index range, shorter world list falls back to base',()=>{
 const p={StaticModelsByIndex:'A;B;C',WorldStaticModelsByIndex:'X;Y',WorldStaticModel:'Default'},item={};
 initializeModelIndex(item,p,bound=>bound-1);assert.equal(item.modelIndex,2);assert.equal(worldStaticModel(item,p),'Default');
 item.modelIndex=1;assert.equal(worldStaticModel(item,p),'Y');
 item.worldStaticModel='';assert.equal(worldStaticModel(item,p),'');
});
test('saved model state rejects invalid indices, objects and malformed override lists',()=>{
 const catalog=useFixtureCatalog();Object.assign(catalog['Base.Hammer'].properties,{ItemType:'base:weapon',WeaponSpritesByIndex:'Hammer;HammerForged'});
 const inv=new Inventory(inventoryState()),item=inv.create('hammer','player',{modelIndex:1});
 for(const modelIndex of [-2,2,1.5,null]){const state=structuredClone(inv.state);state.items[item.id].modelIndex=modelIndex;assert.throws(()=>validateInventory(state),/[Ii]tem model index/);}
 for(const fields of [{weaponSprite:{}},{weaponSpritesByIndex:'bad'},{worldStaticModelsByIndex:[{}]}]){const state=structuredClone(inv.state);Object.assign(state.items[item.id],fields);assert.throws(()=>validateInventory(state),/item model/);}
});
test('source list parsing retains internal empty entries but drops trailing split empties',()=>{
 assert.deepEqual(modelList(' A;;B;;'),['A','','B']);assert.deepEqual(modelList(''),['']);assert.deepEqual(modelList(';;'),[]);
 assert.deepEqual(modelList('A; ;'),['A','']);assert.equal(modelList(null),null);
});
