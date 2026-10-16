import test from 'node:test';import assert from 'node:assert/strict';import {Inventory,inventoryState} from '../src/inventory.js';import {parseCraftItemInput as parse} from '../src/craft-inputs.js';import {consumeCraftInputs,craftRelativeScale} from '../src/craft-consumption.js';import {useFixtureCatalog} from './fixtures/catalog.mjs';
const catalog=useFixtureCatalog();catalog['Base.Twine']={name:'Twine',properties:{ItemType:'base:drainable',UseDelta:.2},components:[]};
test('item count empties a whole drainable while normal quantity takes only requested uses',()=>{
 for(const suffix of ['', ' flags[ItemCount]']){const inv=new Inventory(inventoryState()),item=inv.create('Base.Twine');const result=consumeCraftInputs(inv,[{input:parse('item 1 [Base.Twine]'+suffix),itemIds:[item.id]}]);assert.equal(result.remaining[0],0);assert.equal(item.currentUses,suffix?0:4);assert.equal(!!inv.state.items[item.id],!suffix);}
});
test('relative material quantities and variable ratios consume across ordered selected items',()=>{
 const input=parse('item 2 [Base.Plank;4:Base.Nails]');assert.equal(craftRelativeScale(input,'base.plank'),2);assert.equal(craftRelativeScale(input,'Nails'),4);
 const inv=new Inventory(inventoryState()),a=inv.create('plank','player',{currentUses:3}),b=inv.create('plank','player',{currentUses:3});let result=consumeCraftInputs(inv,[{input,itemIds:[a.id,b.id]}]);assert.deepEqual(result.remaining,[0]);assert.equal(a.currentUses,2);assert.equal(b.currentUses,2);
 result=consumeCraftInputs(inv,[{input:parse('item variable[2:6] [Base.Plank]'),itemIds:[a.id,b.id]}],{variableRatio:1.5});assert.equal(result.remaining[0],0);assert.equal(inv.state.items[a.id],undefined);assert.equal(b.currentUses,1);
});
test('food accounting uses actual deduction count while retained-tool callback still runs after input quota is filled',()=>{
 const inv=new Inventory(inventoryState()),food=inv.create('cereal'),tool=inv.create('hammer'),other=inv.create('hammer'),seen=[];
 const result=consumeCraftInputs(inv,[{input:parse('item 10 [Base.Cereal]'),itemIds:[food.id]},{input:parse('item 1 tags[base:hammer] mode:keep'),itemIds:[tool.id,other.id]}],{onKeepInput:item=>seen.push(item.id)});
 assert.deepEqual(result.remaining,[0,0]);assert.equal(food.portion,.75);assert.deepEqual(seen,[tool.id,other.id]);assert.ok(inv.state.items[tool.id]);
});
test('fluid and child-resource inputs are skipped here unless counted as whole items',()=>{
 const inv=new Inventory(inventoryState()),water=inv.create('water'),plank=inv.create('plank');const input=parse('item 1 [Base.Plank]');input.hasConsumeFromItem=true;
 const result=consumeCraftInputs(inv,[{input:parse('item 1 [Base.WaterBottle]'),itemIds:[water.id]},{input,itemIds:[plank.id]}]);assert.equal(result.trace.filter(t=>t.skipped).length,2);assert.ok(inv.state.items[water.id]);assert.ok(inv.state.items[plank.id]);
 consumeCraftInputs(inv,[{input:parse('item 1 [Base.WaterBottle] flags[ItemCount]'),itemIds:[water.id]}]);assert.equal(inv.state.items[water.id],undefined);
});
test('DontReplace forces destruction of a partially consumed item with a replacement declaration',()=>{
 catalog['Base.Plank'].properties.ReplaceOnUse='Base.Nails';const inv=new Inventory(inventoryState()),item=inv.create('plank','player',{currentUses:5});consumeCraftInputs(inv,[{input:parse('item 1 [Base.Plank] flags[DontReplace]'),itemIds:[item.id]}]);assert.equal(item.currentUses,4);assert.equal(inv.state.items[item.id],undefined);assert.equal(inv.count('nails'),0);delete catalog['Base.Plank'].properties.ReplaceOnUse;
});
test('unresolved dynamic selectors and missing wear handling are rejected before mutation',()=>{
 const inv=new Inventory(inventoryState()),item=inv.create('plank'),before=JSON.stringify(inv.state);
 for(const line of ['item 3 tags[base:wood]','item 1 [*]','item 1 [Base.Plank] mode:keep flags[MayDegrade]'])assert.throws(()=>consumeCraftInputs(inv,[{input:parse(line),itemIds:[item.id]}]));
 assert.equal(JSON.stringify(inv.state),before);
 const input=parse('item 3 tags[base:wood]');input.resolvedItems=['Base.Plank'];assert.equal(craftRelativeScale(input,item.type),1);
});
