import test from 'node:test';import assert from 'node:assert/strict';import {Inventory,inventoryState,validateInventory} from '../src/inventory.js';import {useFixtureCatalog} from './fixtures/catalog.mjs';
const catalog=useFixtureCatalog();
test('ordinary crafting consumes uses before removing exhausted instance and equipment reference',()=>{
 const inv=new Inventory(inventoryState()),item=inv.create('plank','player',{currentUses:3});inv.state.equipment.primary=item.id;
 assert.deepEqual(inv.useCraftItem(item.id,2),{used:2,remaining:1,remove:false});assert.equal(inv.state.items[item.id],item);
 assert.deepEqual(inv.useCraftItem(item.id,5),{used:1,remaining:0,remove:true});assert.equal(inv.state.items[item.id],undefined);assert.equal(inv.state.equipment.primary,undefined);
});
test('keep uses leaves item untouched, while forced destroy overrides keep and depletion policy',()=>{
 catalog['Base.Nails'].properties.DisappearOnUse=false;const inv=new Inventory(inventoryState()),item=inv.create('nails');
 assert.deepEqual(inv.useCraftItem(item.id,1,{keep:true}),{used:1,remaining:1,remove:false});
 assert.deepEqual(inv.useCraftItem(item.id,1),{used:1,remaining:0,remove:false});assert.ok(inv.state.items[item.id]);
 assert.deepEqual(inv.useCraftItem(item.id,1,{keep:true,destroy:true}),{used:0,remaining:0,remove:true});delete catalog['Base.Nails'].properties.DisappearOnUse;
});
test('uses persist and malformed state or invalid request is rejected before mutation',()=>{
 const inv=new Inventory(inventoryState()),item=inv.create('plank','player',{currentUses:2});inv.useCraftItem(item.id);const state=JSON.parse(JSON.stringify(inv.state));validateInventory(state);assert.equal(state.items[item.id].currentUses,1);
 for(const invalid of [null,1.5,'2',2147483648]){state.items[item.id].currentUses=invalid;assert.throws(()=>validateInventory(state));}
 const food=inv.create('cereal'),before=JSON.stringify(inv.state);assert.throws(()=>inv.useCraftItem(food.id,-1));assert.equal(JSON.stringify(inv.state),before);
});
