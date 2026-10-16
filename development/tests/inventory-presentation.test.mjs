import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryRows,inventoryUseLabel} from '../src/inventory-presentation.js';
import {Inventory,inventoryState} from '../src/inventory.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';
useFixtureCatalog();
test('grouping preserves instances and separates meaningful state',()=>{
 const inv=new Inventory(inventoryState());const a=inv.create('Base.TinCanEmpty'),b=inv.create('Base.TinCanEmpty');
 inv.create('Base.TinCanEmpty','player',{condition:1});
 inv.create('water','player',{fluid:{amount:.5,capacity:1,type:'Water'}});inv.create('water','player',{fluid:{amount:1,capacity:1,type:'Water'}});
 inv.create('cereal','player',{portion:.5});inv.create('cereal');
 const before=JSON.stringify(inv.state),rows=inventoryRows(inv.list());assert.equal(rows.length,6);assert.equal(rows[0].count,2);assert.equal(rows[0].item.id,a.id);assert.equal(JSON.stringify(inv.state),before);
 inv.container('cupboard');inv.transfer(rows[0].item.id,'cupboard');assert.equal(inv.list('cupboard').length,1);assert.ok(inv.list().some(i=>i.id===b.id));
});
test('equipped items and owned containers retain individual rows',()=>{
 const inv=new Inventory(inventoryState());const a=inv.create('bat');inv.create('bat');inv.state.equipment.primary=a.id;inv.create('backpack');inv.create('backpack');
 assert.deepEqual(inventoryRows(inv.list(),inv.state.equipment,inv.state.containers).map(r=>r.count),[1,1,1,1]);
});
test('actions omit inert objects and sealed cans',()=>{
 const inv=new Inventory(inventoryState());for(const [type,expected] of [['Base.TinCanEmpty',null],['beans',null],['opener',null],['cereal','Eat'],['bat','Equip'],['backpack','Equip'],['water',null]])assert.equal(inventoryUseLabel(inv.create(type)),expected);
 assert.equal(inventoryUseLabel(inv.create('water','player',{fluid:{amount:.5,capacity:1,type:'Water'}})),'Drink');
});

test('remaining quantities distinguish one instance from a grouped stack',async()=>{
 const {inventoryRemainingLabel}=await import('../src/inventory-presentation.js');
 const {setItemCatalog}=await import('../src/inventory.js');
 setItemCatalog({schema_version:1,items:{'Test.Wipes':{type:'Test.Wipes',name:'Wipes',properties:{ItemType:'base:drainable',UseDelta:.2}},'Test.Book':{type:'Test.Book',name:'Book',properties:{ItemType:'base:literature'}}}});
 assert.equal(inventoryRemainingLabel({type:'Test.Wipes',currentUses:1}),'1 use remaining');
 assert.equal(inventoryRemainingLabel({type:'Test.Wipes',currentUses:3},2),'3 uses remaining each');
 assert.equal(inventoryRemainingLabel({type:'Test.Wipes',currentUses:0}),'0 uses remaining');
 assert.equal(inventoryRemainingLabel({type:'Test.Wipes'}),'5 uses remaining');
 assert.equal(inventoryRemainingLabel({type:'Test.Book'}),'');
 assert.equal(inventoryRemainingLabel({fluid:{amount:.25,capacity:1}},2),'250 / 1000 mL each');
});
