import test from 'node:test';import assert from 'node:assert/strict';import {Inventory,inventoryState} from '../src/inventory.js';import {advanceCooking,ensureAppliance,validateCookingState,cookingLabel,cookingAdvice} from '../src/cooking.js';import {useFixtureCatalog} from './fixtures/catalog.mjs';
const catalog=useFixtureCatalog();catalog['Base.Steak']={name:'Steak',properties:{ItemType:'base:food',HungerChange:-40,IsCookable:true,MinutesToCook:50,MinutesToBurn:70},components:[]};
function kitchen(){const inv=new Inventory(inventoryState());const oven=inv.container('oven','Oven',100);ensureAppliance(oven);return {inv,oven};}
test('food cooks then burns while carried food remains uncooked',()=>{const {inv,oven}=kitchen(),steak=inv.create('Base.Steak','oven'),carried=inv.create('Base.Steak');oven.appliance.on=true;oven.appliance.temperature=200;advanceCooking(inv,51);assert.equal(steak.cooked,true);assert.equal(steak.burnt,undefined);assert.equal(carried.cooked,undefined);advanceCooking(inv,20);assert.equal(steak.burnt,true);assert.equal(steak.foodValues.burnt,true);});
test('power loss and switch off prevent a cold oven heating; residual heat cools',()=>{const {inv,oven}=kitchen(),steak=inv.create('Base.Steak','oven');oven.appliance.on=true;advanceCooking(inv,100,{electricity:false});assert.equal(steak.cooked,undefined);assert.equal(oven.appliance.temperature,20);oven.appliance.temperature=200;oven.appliance.on=false;advanceCooking(inv,1);assert.equal(oven.appliance.temperature,185);});
test('cooking and thermostat survive serialization and continue from saved progress',()=>{const {inv,oven}=kitchen(),steak=inv.create('Base.Steak','oven');oven.appliance.on=true;oven.appliance.temperature=200;advanceCooking(inv,25);const copy=new Inventory(JSON.parse(JSON.stringify(inv.state)));validateCookingState(copy.state);advanceCooking(copy,26);assert.equal(copy.state.items[steak.id].cooked,true);assert.equal(copy.state.containers.oven.appliance.on,true);});
test('taking food out stops cooking and malformed cooking saves are rejected',()=>{const {inv,oven}=kitchen(),steak=inv.create('Base.Steak','oven');oven.appliance.on=true;oven.appliance.temperature=200;advanceCooking(inv,10);inv.transfer(steak.id,'player');advanceCooking(inv,100);assert.equal(steak.cookingMinutes,10);oven.appliance.targetTemperature=Infinity;assert.throws(()=>validateCookingState(inv.state));});
test('cooked notification is emitted once before food burns',()=>{const {inv,oven}=kitchen();const steak=inv.create('Base.Steak','oven');oven.appliance.on=true;oven.appliance.temperature=200;let notifications=0;advanceCooking(inv,51,{onCooked:item=>{assert.equal(item.id,steak.id);notifications++;}});advanceCooking(inv,1,{onCooked:()=>notifications++});assert.equal(notifications,1);assert.equal(steak.burnt,undefined);});

test('cookability does not label ready-to-eat food raw or imply active cooking',()=>{
 catalog['Base.OpenBeans'].properties.IsCookable=true;
 const {inv}=kitchen(),beans=inv.create('Base.OpenBeans');
 assert.equal(cookingLabel(beans),null);
 beans.cookingMinutes=30;assert.equal(cookingLabel(beans),'Cooking 50%');
 catalog['Base.Steak'].properties.DangerousUncooked=true;
 const steak=inv.create('Base.Steak');assert.equal(cookingLabel(steak),'Raw');
 steak.cookingMinutes=25;assert.equal(cookingLabel(steak),'Raw · Cooking 50%');
 steak.cooked=true;assert.equal(cookingLabel(steak),'Cooked');
 steak.burnt=true;assert.equal(cookingLabel(steak),'Burnt');
});

test('cooking advice distinguishes readiness, residual heat and cold storage',()=>{
 const {inv,oven}=kitchen(),steak=inv.create('Base.Steak','oven');
 oven.appliance.temperature=200;steak.cookingMinutes=25;
 assert.match(cookingAdvice(steak,oven.appliance),/~25 game min until cooked/);
 steak.cooked=true;steak.cookingMinutes=55;
 assert.match(cookingAdvice(steak,oven.appliance),/Ready.*~15 game min before burning/);
 oven.appliance.on=false;assert.match(cookingAdvice(steak,oven.appliance),/Ready/);
 oven.appliance.temperature=20;assert.equal(cookingAdvice(steak,oven.appliance),null);
 oven.appliance.temperature=200;steak.burnt=true;assert.equal(cookingAdvice(steak,oven.appliance),null);
 assert.equal(cookingAdvice(steak,undefined),null);
});
