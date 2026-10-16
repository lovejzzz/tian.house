import test from 'node:test';import assert from 'node:assert/strict';import {updateDrainableWeight} from '../src/drainable.js';import {Inventory,inventoryState,validateInventory} from '../src/inventory.js';import {useFixtureCatalog} from './fixtures/catalog.mjs';
const catalog=useFixtureCatalog();catalog['Base.Fuel']={name:'Fuel',properties:{ItemType:'base:drainable',Weight:10,WeightEmpty:5,UseDelta:.1},components:[]};catalog['Base.Paint']={name:'Paint',properties:{ItemType:'base:drainable',Weight:5,UseDelta:.1,ReplaceOnDeplete:'TinCanEmpty'},components:[]};
test('weight update preserves branch order and separates actual from display weight fields',()=>{
 const prior={actualWeight:7.25,weight:6.25,customWeight:false};
 assert.deepEqual(updateDrainableWeight(prior,{fullWeight:10,fraction:.5}),prior);
 assert.deepEqual(updateDrainableWeight(prior,{fullWeight:10,emptyWeight:2,hasReplacement:true,replacementWeight:1,fraction:1}),{actualWeight:10,weight:10,customWeight:true});
 assert.deepEqual(updateDrainableWeight(prior,{fullWeight:10,emptyWeight:2,hasReplacement:true,replacementWeight:1,fraction:.5}),{actualWeight:6,weight:5.5,customWeight:true});assert.equal(prior.actualWeight,7.25);
});
test('consumption changes carried weight and capacity acceptance, then persists through save',()=>{
 const inv=new Inventory(inventoryState()),item=inv.create('Base.Fuel');inv.container('shelf','shelf',8);
 assert.equal(inv.actualWeight(item),10);assert.equal(inv.canTransfer(item.id,'shelf').ok,false);
 inv.useCraftItem(item.id,5);assert.equal(inv.actualWeight(item),7.5);assert.equal(inv.encumbrance(),7.5);assert.equal(inv.canTransfer(item.id,'shelf').ok,true);
 const weight=JSON.stringify(item.drainableWeight);inv.useCraftItem(item.id,1,{keep:true});assert.equal(JSON.stringify(item.drainableWeight),weight);
 const save=JSON.parse(JSON.stringify(inv.state));validateInventory(save);assert.equal(new Inventory(save).actualWeight(save.items[item.id]),7.5);
});
test('replacement empty weight participates before depletion; legacy saves derive without mutation',()=>{
 const inv=new Inventory(inventoryState()),item=inv.create('Base.Paint','player',{currentUses:5,type:'Other.Bad'});assert.equal(item.type,'Base.Paint');assert.ok(Math.abs(inv.actualWeight(item)-2.55)<1e-6);
 delete item.drainableWeight;const before=JSON.stringify(inv.state);assert.ok(Math.abs(inv.actualWeight(item)-2.55)<1e-6);assert.equal(JSON.stringify(inv.state),before);
 inv.useCraftItem(item.id,5);assert.equal(inv.count('Base.TinCanEmpty'),1);assert.equal(inv.actualWeight(inv.list()[0]),.1);
});
test('stored drainable weight rejects invalid values or non-drainable owners',()=>{
 const inv=new Inventory(inventoryState()),item=inv.create('Base.Fuel');
 for(const bad of [null,{},false,{actualWeight:-1,weight:2,customWeight:true},{actualWeight:2,weight:'2',customWeight:true},{actualWeight:2,weight:2,customWeight:1}]){item.drainableWeight=bad;assert.throws(()=>validateInventory(inv.state));}
 item.drainableWeight={actualWeight:2,weight:2,customWeight:true};validateInventory(inv.state);item.type='Base.Nails';assert.throws(()=>validateInventory(inv.state));
});
