import test from 'node:test';
import assert from 'node:assert/strict';
import {Inventory,inventoryState,setItemCatalog,validateInventory} from '../src/inventory.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';
import {breakCarriedStoneHammer} from '../src/item-breakage.js';
const catalog=useFixtureCatalog();
for(const type of ['Splinters','Stone2','Branch_Broken'])catalog['Base.'+type]={type:'Base.'+type,name:type,properties:{ConditionMax:10,Weight:.1},components:[]};
setItemCatalog({schema_version:1,items:catalog});
function setup(){const inv=new Inventory(inventoryState());inv.container('ground','Ground',100);return inv;}
test('carried stone hammer yields ground fragments and replaces its primary slot with a random-condition handle',()=>{
 const inv=setup(),item=inv.create('Base.HammerStone');item.condition=0;item.headCondition=4;inv.equip(item.id);inv.state.equipment.secondary=item.id;
 const calls=[],positions=[],result=breakCarriedStoneHammer(inv,item,{nextInt:n=>{calls.push(n);return n-1;},drop:(type,pos)=>{positions.push(pos);return inv.create(type,'ground');}});
 assert.deepEqual(calls,[100,100,100,100,10]);assert.deepEqual(positions,[{x:.99,y:.99},{x:.99,y:.99}]);
 assert.equal(result.stone.condition,5);assert.equal(result.handle.condition,10);
 assert.equal(inv.state.items[item.id],undefined);assert.equal(inv.state.equipment.primary,result.handle.id);assert.equal(inv.state.equipment.secondary,undefined);
 assert.equal(inv.list('ground').length,2);assert.ok(validateInventory(inv.state));
});
test('zero head yields a broken recovered stone and secondary-only holding is replaced without disturbing primary',()=>{
 const inv=setup(),item=inv.create('Base.HammerStone'),bat=inv.create('bat');item.headCondition=0;inv.equip(bat.id);inv.state.equipment.secondary=item.id;
 const result=breakCarriedStoneHammer(inv,item,{nextInt:()=>0,drop:type=>inv.create(type,'ground')});
 assert.equal(result.stone.condition,0);assert.equal(result.stone.broken,true);assert.equal(result.handle.condition,1);
 assert.equal(inv.state.equipment.primary,bat.id);assert.equal(inv.state.equipment.secondary,result.handle.id);assert.ok(validateInventory(inv.state));
});
test('unsupported ownership route is not silently treated as a carried break',()=>{
 const inv=setup(),item=inv.create('Base.HammerStone','ground'),before=JSON.stringify(inv.state);
 assert.equal(breakCarriedStoneHammer(inv,item,{nextInt:()=>assert.fail(),drop:()=>assert.fail()}),false);assert.equal(JSON.stringify(inv.state),before);
});
