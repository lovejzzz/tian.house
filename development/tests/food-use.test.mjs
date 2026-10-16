import test from 'node:test';import assert from 'node:assert/strict';import {Inventory,inventoryState,validateInventory} from '../src/inventory.js';import {foodState,foodCurrentUses,foodSicknessChange,multiplyFoodValues,setFoodCurrentUses} from '../src/food-use.js';import {useFixtureCatalog} from './fixtures/catalog.mjs';
const catalog=useFixtureCatalog();Object.assign(catalog['Base.Cereal'].properties,{Calories:1000,Carbohydrates:200,FluReduction:7,FoodSicknessChange:7,DaysFresh:2,DaysTotallyRotten:4});
test('food crafting scales nutritional state, keeps base hunger, and persists remaining portion',()=>{
 const inv=new Inventory(inventoryState()),item=inv.create('cereal');assert.deepEqual(inv.useCraftItem(item.id,10),{used:10,remaining:30,remove:false});assert.equal(item.portion,.75);assert.equal(item.foodValues.calories,750);assert.equal(item.foodValues.carbohydrates,150);assert.equal(item.foodValues.fluReduction,5);assert.equal(item.foodValues.baseHunger,Math.fround(-.4));
 const save=JSON.parse(JSON.stringify(inv.state));validateInventory(save);assert.deepEqual(save.items[item.id].foodValues,item.foodValues);
 inv.consumeFood(item.id,.25);assert.equal(item.portion,.5);assert.ok(Math.abs(item.foodValues.calories-500)<1e-4);assert.equal(foodCurrentUses(item.foodValues),20);
});
test('food destruction and exhaustion do not perform ordinary ReplaceOnUse during forced crafting',()=>{
 const inv=new Inventory(inventoryState()),food=inv.create('Base.OpenBeans');assert.equal(inv.useCraftItem(food.id,100).remove,true);assert.equal(inv.count('Base.TinCanEmpty'),0);
 const kept=inv.create('cereal'),before=JSON.stringify(kept);inv.useCraftItem(kept.id,10,{keep:true});assert.equal(JSON.stringify(kept),before);inv.useCraftItem(kept.id,1,{keep:true,destroy:true});assert.equal(inv.state.items[kept.id],undefined);
});
test('food sickness uses condition-modified getter before multiplying, including repeated integer truncation',()=>{
 const state=foodState({portion:1,ageHours:48},catalog['Base.Cereal'].properties);assert.equal(foodSicknessChange(state),5);const half=multiplyFoodValues(state,.5);assert.equal(half.foodSickness,2);assert.equal(foodSicknessChange(half),1);
 const cooked={...state,age:0,cooked:true};assert.equal(foodSicknessChange(cooked),9);assert.equal(multiplyFoodValues(cooked,.5).foodSickness,4);
});
test('legacy reconstruction is read-only and base-zero food uses ordinary count',()=>{
 const inv=new Inventory(inventoryState()),item=inv.create('cereal','player',{portion:.25});delete item.foodValues;const before=JSON.stringify(inv.state);assert.equal(foodCurrentUses(foodState(item,catalog['Base.Cereal'].properties)),10);assert.equal(JSON.stringify(inv.state),before);
 catalog['Base.Cereal'].properties.HungerChange=0;const zero=inv.create('cereal','player',{currentUses:3});assert.deepEqual(inv.useCraftItem(zero.id,2),{used:2,remaining:1,remove:false});catalog['Base.Cereal'].properties.HungerChange=-40;
});
test('nonfinite zero-hunger setter result remains visible in component, rejected in retained saves',()=>{
 const state=foodState({portion:0,ageHours:0},catalog['Base.Cereal'].properties),out=setFoodCurrentUses(state,0);assert.equal(foodCurrentUses(out),0);assert.ok(Number.isNaN(out.hunger));
 const inv=new Inventory(inventoryState()),item=inv.create('cereal');item.foodValues=out;assert.throws(()=>validateInventory(inv.state));item.foodValues={};assert.throws(()=>validateInventory(inv.state));
});
