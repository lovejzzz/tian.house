import test from 'node:test';import assert from 'node:assert/strict';import {Inventory,inventoryState,validateInventory} from '../src/inventory.js';import {useFixtureCatalog} from './fixtures/catalog.mjs';
const catalog=useFixtureCatalog();
catalog['Local.Paint']={type:'Local.Paint',name:'paint',properties:{ItemType:'base:drainable',UseDelta:.2,ReplaceOnDeplete:'Empty',ConditionMax:10},components:[]};
catalog['Local.Empty']={type:'Local.Empty',name:'empty',properties:{ItemType:'base:normal',ConditionMax:3},components:[]};
test('partial drainable use and exhaustion replace in same container with selective state inheritance',()=>{
 const inv=new Inventory(inventoryState());inv.container('shelf');const item=inv.create('Local.Paint','shelf',{condition:7,favorite:true,haveBeenRepaired:2,modData:{'condition:old':.7,secret:42}});
 assert.deepEqual(inv.useCraftItem(item.id,3),{used:3,remaining:2,remove:false});assert.equal(inv.list('shelf').length,1);
 assert.deepEqual(inv.useCraftItem(item.id,8),{used:2,remaining:0,remove:true});const replacement=inv.list('shelf')[0];assert.equal(replacement.type,'Local.Empty');assert.equal(replacement.condition,2);assert.equal(replacement.favorite,true);assert.equal(replacement.haveBeenRepaired,2);assert.deepEqual(replacement.modData,{'condition:old':.7});assert.notEqual(replacement.id,item.id);
 const saved=JSON.parse(JSON.stringify(inv.state));validateInventory(saved);assert.deepEqual(new Inventory(saved).list('shelf'),inv.list('shelf'));
});
test('depletion output is controlled by remaining uses, independently of destroy and keep flags',()=>{
 for(const currentUses of [0,1,3])for(const keep of [false,true])for(const destroy of [false,true])for(const keepEmpty of [false,true]){
  catalog['Local.Paint'].properties.DisappearOnUse=!keepEmpty;
  const inv=new Inventory(inventoryState()),item=inv.create('Local.Paint','player',{currentUses});inv.equip(item.id);
  const result=inv.useCraftItem(item.id,1,{keep,destroy}),depleted=(keep?currentUses:Math.max(0,currentUses-1))<=0;
  assert.equal(inv.count('Local.Empty'),depleted?1:0);assert.equal(!!inv.state.items[item.id],!destroy&&(!depleted||keepEmpty));
  assert.equal(inv.state.equipment.primary,result.remove?undefined:item.id);
 }
 delete catalog['Local.Paint'].properties.DisappearOnUse;
});
test('replacement count and container identity are honored without transferring equipment',()=>{
 catalog['Local.Empty'].properties.Count=2;catalog['Local.Empty'].properties.ItemType='base:container';catalog['Local.Empty'].properties.Capacity=5;
 const inv=new Inventory(inventoryState()),item=inv.create('Local.Paint');inv.equip(item.id);inv.useCraftItem(item.id,5);assert.equal(inv.list().length,2);assert.equal(inv.state.equipment.primary,undefined);
 for(const output of inv.list()){assert.equal(inv.state.containers[output.id].owner,output.id);assert.deepEqual(inv.state.containers[output.id].items,[]);}validateInventory(inv.state);
 delete catalog['Local.Empty'].properties.Count;catalog['Local.Empty'].properties.ItemType='base:normal';
});
test('unresolved or unsupported replacement fails before consuming inventory state',()=>{
 for(const replacement of ['Missing','Empty']){catalog['Local.Paint'].properties.ReplaceOnDeplete=replacement;catalog['Local.Empty'].properties.ItemType='base:food';
  const inv=new Inventory(inventoryState()),item=inv.create('Local.Paint'),before=JSON.stringify(inv.state);assert.throws(()=>inv.useCraftItem(item.id,5));assert.equal(JSON.stringify(inv.state),before);
 }
 catalog['Local.Paint'].properties.ReplaceOnDeplete='Empty';catalog['Local.Empty'].properties.ItemType='base:normal';
});
