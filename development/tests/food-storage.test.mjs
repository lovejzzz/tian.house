import test from 'node:test';import assert from 'node:assert/strict';
import {Inventory,inventoryState} from '../src/inventory.js';import {useFixtureCatalog} from './fixtures/catalog.mjs';
import {advanceFoodAge,foodFreshness,storedContainerKind} from '../src/food-storage.js';
const catalog=useFixtureCatalog();catalog['Base.Perishable']={name:'Food',properties:{ItemType:'base:food',HungerChange:-20,DaysFresh:2,DaysTotallyRotten:4},components:[]};
test('food crosses source freshness thresholds while powered refrigeration slows effective aging',()=>{
 const inv=new Inventory(inventoryState());inv.container('cold','Fridge',100);const room=inv.create('Base.Perishable'),cold=inv.create('Base.Perishable','cold');
 advanceFoodAge(inv,2*1440,{containerKind:id=>id==='cold'?'fridge':null});assert.equal(foodFreshness(room),'Stale');assert.equal(foodFreshness(cold),'Fresh');assert.equal(room.ageHours,48);assert.ok(Math.abs(cold.ageHours-9.6)<1e-9);
 advanceFoodAge(inv,2*1440);assert.equal(foodFreshness(room),'Rotten');assert.equal(foodFreshness(cold),'Stale');
});
test('power loss, taking food out, and serialization preserve actual accumulated age',()=>{
 const inv=new Inventory(inventoryState());inv.container('cold','Freezer',100);const item=inv.create('Base.Perishable','cold');const kind=()=> 'freezer';
 advanceFoodAge(inv,600,{containerKind:kind});assert.equal(item.ageHours,.2);
 advanceFoodAge(inv,600,{electricity:false,containerKind:kind});assert.equal(item.ageHours,10.2);
 inv.transfer(item.id,'player');const loaded=new Inventory(JSON.parse(JSON.stringify(inv.state)));
 advanceFoodAge(loaded,600,{containerKind:id=>id==='cold'?'freezer':null});assert.equal(loaded.state.items[item.id].ageHours,20.2);
});
test('unknown/nonfood storage remains ambient and namespaced world IDs resolve without guessing names',()=>{
 const world={props:tile=>tile==='tian:fridge'?{container:'fridge'}:{}};
 assert.equal(storedContainerKind(world,'world:-2,4,0:tian:fridge'),'fridge');assert.equal(storedContainerKind(world,'player'),null);
 const inv=new Inventory(inventoryState()),item=inv.create('Base.Perishable');advanceFoodAge(inv,60);assert.equal(item.ageHours,1);
 advanceFoodAge(inv,NaN);assert.equal(item.ageHours,1);
});
