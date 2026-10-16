import test from 'node:test';
import assert from 'node:assert/strict';
import {Inventory,inventoryState,validateInventory} from '../src/inventory.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';
useFixtureCatalog();
const setup=()=>new Inventory(inventoryState());
test('identical types retain distinct identities and state through transfer',()=>{const inv=setup(),a=inv.create('bat'),b=inv.create('bat');a.condition=2;inv.container('drawer','Drawer',10);assert.ok(inv.transfer(a.id,'drawer').ok);assert.notEqual(a.id,b.id);assert.equal(a.condition,2);assert.equal(b.condition,15);assert.equal(inv.list().length,1);assert.ok(validateInventory(inv.state));});
test('nested bags reject self and descendant cycles without mutation',()=>{const inv=setup(),a=inv.create('backpack'),b=inv.create('backpack');assert.ok(inv.transfer(b.id,a.id).ok);const before=JSON.stringify(inv.state);assert.equal(inv.transfer(a.id,b.id).ok,false);assert.equal(inv.transfer(a.id,a.id).ok,false);assert.equal(JSON.stringify(inv.state),before);});
test('full enclosing container rejects nested insertion; within-root moves do not double count',()=>{const inv=setup(),bag=inv.create('backpack'),bat=inv.create('bat');inv.state.containers.player.capacity=3;assert.ok(inv.transfer(bat.id,bag.id).ok);inv.container('world','World',50);const other=inv.create('bat','world');const before=JSON.stringify(inv.state);assert.equal(inv.transfer(other.id,bag.id).ok,false);assert.equal(JSON.stringify(inv.state),before);});
test('partial food consumption preserves instance; closed can cannot be eaten',()=>{const inv=setup(),cereal=inv.create('cereal'),beans=inv.create('beans');assert.equal(inv.consumeFood(beans.id).ok,false);assert.equal(inv.consumeFood(cereal.id,.25).hunger,10);assert.equal(cereal.portion,.75);assert.ok(Math.abs(inv.actualWeight(cereal)-.15)<1e-8);const open=inv.create('Base.OpenBeans');assert.ok(inv.consumeFood(open.id).ok);assert.equal(inv.find('Base.TinCanEmpty').container,'player');});
test('equipment follows ownership and survives save validation',()=>{const inv=setup(),bat=inv.create('bat');inv.equip(bat.id);assert.equal(inv.state.equipment.secondary,bat.id);inv.container('floor','Floor',50);inv.transfer(bat.id,'floor');assert.deepEqual(inv.state.equipment,{});assert.ok(validateInventory(JSON.parse(JSON.stringify(inv.state))));});
test('malformed saves cannot duplicate or orphan items and cannot reuse IDs',()=>{const inv=setup(),a=inv.create('bat');let s=structuredClone(inv.state);s.containers.player.items.push(a.id);assert.throws(()=>validateInventory(s));s=structuredClone(inv.state);s.containers.player.items=[];assert.throws(()=>validateInventory(s));s=structuredClone(inv.state);s.nextId=1;assert.throws(()=>validateInventory(s));s=structuredClone(inv.state);s.items[a.id].portion=Infinity;assert.throws(()=>validateInventory(s));});
test('equipping reduces carried encumbrance once, preserves physical weight and releases two-hand slots',()=>{const inv=setup(),bat=inv.create('bat'),pen=inv.create('pen');const raw=inv.weight();inv.equip(bat.id);assert.equal(inv.encumbrance(),raw-1.4);assert.equal(inv.weight(),raw);inv.equip(pen.id);assert.equal(inv.state.equipment.secondary,undefined);assert.equal(inv.state.equipment.primary,pen.id);assert.equal(inv.encumbrance(),2.3);inv.container('drawer','Drawer',20);inv.transfer(pen.id,'drawer');assert.equal(inv.encumbrance(),2);});
test('equipped container reduces contents separately from its own weight; nested unequipped bags retain mass',()=>{const inv=setup(),bag=inv.create('backpack'),inner=inv.create('backpack'),bat=inv.create('bat');inv.transfer(bat.id,inner.id);inv.transfer(inner.id,bag.id);inv.equip(bag.id,'back');assert.ok(Math.abs(inv.encumbrance()-1.2)<1e-8);assert.equal(inv.weight(),4);assert.equal(inv.weight(bag.id),3);inv.unequip(bag.id);assert.equal(inv.encumbrance(),4);});

test('favorite items move within carried bags but not external destinations; protection follows destination ownership',()=>{
 const inv=setup(),bag=inv.create('backpack'),item=inv.create('hammer','player',{favorite:true});
 inv.container('floor','Floor',50);inv.container('shelf','Shelf',50);
 assert.equal(inv.transfer(item.id,bag.id).ok,true);assert.equal(inv.transfer(item.id,'player').ok,true);
 for(const dest of ['floor','shelf']){const before=JSON.stringify(inv.state);assert.equal(inv.transfer(item.id,dest).ok,false);assert.equal(JSON.stringify(inv.state),before);}
 assert.equal(inv.transfer(bag.id,'shelf').ok,true);assert.equal(inv.transfer(item.id,bag.id).ok,false);
 item.favorite=false;assert.equal(inv.transfer(item.id,bag.id).ok,true);
 item.favorite=true;assert.equal(inv.transfer(item.id,'player').ok,true);
});

test('save validation rejects condition above the item definition maximum',()=>{
 const inv=setup(),bat=inv.create('bat');bat.condition=16;
 assert.throws(()=>validateInventory(inv.state),/condition exceeds its maximum/);bat.condition=15;assert.equal(validateInventory(inv.state),inv.state);
});


test('head condition is independent instance state, survives transfer and save, and rejects impossible values',()=>{
 const inv=setup(),a=inv.create('Base.HammerStone'),b=inv.create('Base.HammerStone');
 assert.equal(a.condition,5);assert.equal(a.headCondition,8);a.headCondition=3;
 inv.container('shelf','Shelf',50);assert.equal(inv.transfer(a.id,'shelf').ok,true);
 const saved=JSON.parse(JSON.stringify(inv.state));validateInventory(saved);
 assert.equal(saved.items[a.id].headCondition,3);assert.equal(saved.items[b.id].headCondition,8);
 for(const v of [-1,9,1.5,null]){const bad=structuredClone(saved);bad.items[a.id].headCondition=v;assert.throws(()=>validateInventory(bad),/Invalid item head condition/);}
 const plain=inv.create('nails');plain.headCondition=1;assert.throws(()=>validateInventory(inv.state),/Invalid item head condition/);
 delete plain.headCondition;delete a.headCondition;assert.ok(validateInventory(inv.state),'legacy saves without the new field remain readable');
});

test('missing head maximum falls back to general maximum, not initial head condition',()=>{const inv=setup(),h=inv.create('Base.BallPeenHammer');assert.equal(h.headCondition,3);h.headCondition=10;assert.ok(validateInventory(inv.state));h.headCondition=11;assert.throws(()=>validateInventory(inv.state),/Invalid item head condition/);});

test('food hydration consumes only the eaten fraction, including the final remainder',()=>{
 const items=useFixtureCatalog();items['Base.Cereal'].properties.ThirstChange=-8;
 const inv=setup(),food=inv.create('cereal');
 const a=inv.consumeFood(food.id,.25),b=inv.consumeFood(food.id,.75);
 assert.ok(Math.abs(a.thirst-2)<1e-5);assert.ok(Math.abs(b.thirst-6)<1e-5);assert.equal(inv.state.items[food.id],undefined);useFixtureCatalog();
});
