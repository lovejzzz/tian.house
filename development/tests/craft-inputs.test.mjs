import test from 'node:test';import assert from 'node:assert/strict';import {parseCraftItemInput,usesPartialCraftItem} from '../src/craft-inputs.js';
test('alternative item amounts retain per-type quantities when common amount becomes one',()=>{
 const i=parseCraftItemInput('item 4 [Base.A;2:Base.B] flags[IsExclusive] mappers[metalType]');assert.equal(i.amount,1);assert.equal(i.maxAmount,1);assert.deepEqual(i.itemAmounts,[4,2]);assert.deepEqual(i.itemMaxAmounts,[4,2]);assert.deepEqual(i.mappers,['metalType']);
 const range=parseCraftItemInput('item variable[2:8] [Base.A;1:Base.B]');assert.equal(range.amount,2);assert.deepEqual(range.itemMaxAmounts,[8,4]);
});
test('keep and ItemCount prevent partial use of drainable and food materials',()=>{
 const drainable={ItemType:'base:drainable',UseDelta:.1},food={ItemType:'base:food',HungerChange:-20};
 for(const p of [drainable,food]){assert.equal(usesPartialCraftItem(parseCraftItemInput('item 1 [Base.A]'),p),true);for(const suffix of ['mode:keep','mode:destroy','flags[ItemCount]'])assert.equal(usesPartialCraftItem(parseCraftItemInput('item 1 [Base.A] '+suffix),p),false);}
 assert.equal(usesPartialCraftItem(parseCraftItemInput('item 1 [Base.A]'),{ItemType:'base:food',HungerChange:-1}),false);
});
test('wildcard clears specific selectors; flags and tags deduplicate',()=>{
 const input=parseCraftItemInput('item 1 [Base.A;*] tags[base:hammer;base:hammer] flags[Prop1;Prop1]');assert.equal(input.acceptsAnyItem,true);assert.deepEqual(input.items,[]);assert.deepEqual(input.itemTags,[]);assert.deepEqual(input.flags,['Prop1']);
 assert.throws(()=>parseCraftItemInput('item 1 [Base.A] mode:unknown'));assert.throws(()=>parseCraftItemInput('fluid 1 [Water]'));assert.throws(()=>parseCraftItemInput('item bad [Base.A]'));
});
