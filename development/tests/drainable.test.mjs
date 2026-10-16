import test from 'node:test';import assert from 'node:assert/strict';import {drainableMaxUses,drainableUsesFromFraction,drainableFraction,drainableUses} from '../src/drainable.js';import {Inventory,inventoryState,validateInventory} from '../src/inventory.js';import {useFixtureCatalog} from './fixtures/catalog.mjs';
const catalog=useFixtureCatalog();catalog['Base.DrainFixture']={type:'Base.DrainFixture',name:'Fixture',properties:{ItemType:'base:drainable',UseDelta:.3,Weight:1},components:[]};
test('factory capacity and fraction setter have distinct floor versus round semantics',()=>{
 assert.equal(drainableMaxUses(.3),3);assert.equal(drainableUsesFromFraction(1,.3),3);assert.equal(drainableMaxUses(.4),2);assert.equal(drainableUsesFromFraction(1,.4),3);
 assert.equal(drainableUsesFromFraction(-1,.1),0);assert.equal(drainableUsesFromFraction(2,.1),10);assert.equal(drainableFraction(3,.4),Math.fround(1.2));
});
test('created drainables have uses; persisted values and older missing fields stay distinct',()=>{
 const inv=new Inventory(inventoryState()),fresh=inv.create('Base.DrainFixture'),partial=inv.create('Base.DrainFixture','player',{currentUses:1});assert.equal(fresh.currentUses,3);assert.equal(partial.currentUses,1);
 const state=JSON.parse(JSON.stringify(inv.state));validateInventory(state);assert.equal(state.items[partial.id].currentUses,1);delete state.items[fresh.id].currentUses;validateInventory(state);assert.equal(drainableUses(state.items[fresh.id],catalog[fresh.type].properties),3);assert.equal(state.items[fresh.id].currentUses,undefined);
});
