import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryIcon} from '../src/item-icons.js';
import {Inventory,inventoryState,validateInventory} from '../src/inventory.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';
test('inventory icons follow the same saved model index as weapon variants',()=>{
 const p={Icon:'Default',IconsForTexture:'Hammer;Hammer_Forged'};
 assert.equal(inventoryIcon({modelIndex:0},p),'Item_Hammer');
 assert.equal(inventoryIcon({modelIndex:1},p),'Item_Hammer_Forged');
 assert.equal(inventoryIcon({},p),'Item_Default');
 assert.equal(inventoryIcon({}, {IconsForTexture:p.IconsForTexture}),'Item_Hammer');
});
test('blank or null variants retain initial icon; absent definitions use question icon',()=>{
 const p={Icon:'Default'};
 for(const value of [null,'','  '])assert.equal(inventoryIcon({modelIndex:0,iconsForTexture:[value]},p),'Item_Default');
 assert.equal(inventoryIcon({},{}),'Question_On');
 assert.throws(()=>inventoryIcon({modelIndex:3},{IconsForTexture:'A;B'}),RangeError);
});
test('save validation rejects icon index beyond a shorter icon list',()=>{
 const catalog=useFixtureCatalog();Object.assign(catalog['Base.Hammer'].properties,{ItemType:'base:weapon',WeaponSpritesByIndex:'Hammer;HammerForged',IconsForTexture:'Hammer'});
 const inv=new Inventory(inventoryState()),item=inv.create('hammer','player',{modelIndex:1});
 assert.throws(()=>validateInventory(inv.state),/Item icon index/);item.modelIndex=0;assert.ok(validateInventory(inv.state));
 item.iconsForTexture=[{}];assert.throws(()=>validateInventory(inv.state),/Invalid item model variant/);
});
