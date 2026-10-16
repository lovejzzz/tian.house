import test from 'node:test';import assert from 'node:assert/strict';import {Inventory,inventoryState} from '../src/inventory.js';import {loadCraftingCatalog,planCraft,commitCraft} from '../src/crafting.js';import {useFixtureCatalog} from './fixtures/catalog.mjs';
const catalog=useFixtureCatalog();
const declaration=(name,inputs,outputs,extra={})=>({kind:'named',path:['module Base','craftRecipe '+name],values:['Tags = InHandCraft','time = 5'],properties:{},children:[{header:'inputs',values:inputs},{header:'outputs',values:outputs}],...extra});
test('catalog mapped batch outputs consume one instance and retain inherited favorite',()=>{
 const d=declaration('Unpack',['item 1 [Base.Plank] mappers[type] flags[AllowFavorite;InheritFavorite]'],['item 6 mapper:type']);d.children.push({header:'itemMapper type',values:['Base.Nails = Base.Plank']});const [recipe]=loadCraftingCatalog({declarations:[d]}),inv=new Inventory(inventoryState()),source=inv.create('plank','player',{favorite:true});
 assert.equal(planCraft(recipe,inv,{}).ok,true);const result=commitCraft(recipe,inv,{});assert.equal(result.ok,true);assert.equal(inv.state.items[source.id],undefined);assert.equal(inv.count('nails'),6);assert.ok(result.created.every(i=>i.favorite));
});
test('materials cannot be reserved twice and failed craft leaves inventory untouched',()=>{
 const [recipe]=loadCraftingCatalog({declarations:[declaration('TwoInputs',['item 1 [Base.Plank]','item 1 [Base.Plank]'],['item 1 Base.Nails'])]});const inv=new Inventory(inventoryState());inv.create('plank');const before=JSON.stringify(inv.state);assert.equal(commitCraft(recipe,inv,{}).ok,false);assert.equal(JSON.stringify(inv.state),before);
});
test('nested backpack ingredients are available, kept tools survive, unknown outputs are atomic',()=>{
 const [recipe]=loadCraftingCatalog({declarations:[declaration('Make',['item 1 [Base.Hammer] mode:keep','item 1 [Base.Plank]'],['item 1 Base.Nails'])]});const inv=new Inventory(inventoryState()),tool=inv.create('hammer');const bag=inv.create('backpack');inv.create('plank',bag.id);assert.equal(commitCraft(recipe,inv,{}).ok,true);assert.ok(inv.state.items[tool.id]);assert.equal(inv.count('nails'),1);
 recipe.outputs[0].type='Base.DoesNotExist';inv.create('plank');const before=JSON.stringify(inv.state);assert.equal(commitCraft(recipe,inv,{}).ok,false);assert.equal(JSON.stringify(inv.state),before);
});
test('resource and callback recipes remain visible with explicit unavailable reasons',()=>{
 const recipes=loadCraftingCatalog({declarations:[declaration('Fluid',['item 1 [Base.Plank]','-fluid 1 [Water]'],['item 1 Base.Nails']),declaration('Callback',[],['item 1 Base.Nails'],{properties:{OnCreate:'special'}})]});for(const r of recipes)assert.equal(planCraft(r,new Inventory(inventoryState()),{}).ok,false);
});
