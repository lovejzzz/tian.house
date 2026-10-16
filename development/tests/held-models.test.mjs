import test from 'node:test';import assert from 'node:assert/strict';
import {heldSelection,heldLocalMatrix,HeldModels} from '../src/held-models.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';
import {Inventory,inventoryState} from '../src/inventory.js';
import * as THREE from 'three';
const items=useFixtureCatalog();items['Base.Hammer'].properties.WeaponSpritesByIndex='Hammer;HammerForged';items['Base.Plank'].properties.WeaponSprite='Plank';
test('hand selection follows instance identity, variant override and excludes absent or duplicate hands',()=>{
 const state=inventoryState(),inv=new Inventory(state),h=inv.create('hammer'),p=inv.create('plank');inv.equip(h.id);inv.equip(p.id,'secondary');
 assert.deepEqual(heldSelection(state),[{slot:'primary',model:'Hammer'},{slot:'secondary',model:'Plank'}]);
 h.weaponSprite='Base.HammerForged';assert.equal(heldSelection(state)[0].model,'HammerForged');inv.remove(p.id);assert.equal(heldSelection(state).length,1);
 inv.equip(h.id,'secondary');assert.equal(heldSelection(state).length,1);inv.unequip(h.id);assert.deepEqual(heldSelection(state),[]);
});
test('attachment composition applies parent then self then mesh and scale; selecting empty removes stale props',()=>{
 const I=new THREE.Matrix4().toArray(),data={parentAttachments:{Bip01_Prop2:{offset:[1,0,0],rotate:[0,0,0]}}},model={attachments:{Bip01_Prop2:{offset:[0,2,0],rotate:[0,0,90]}},meshTransform:I,scale:2};
 const p=new THREE.Vector3(1,0,0).applyMatrix4(heldLocalMatrix(data,model,'secondary'));assert.ok(p.distanceTo(new THREE.Vector3(1,4,0))<1e-10);
 const held=new HeldModels(data,new Map()),g=new THREE.Group();held.instances.set('primary:Hammer',g);held.select([{slot:'primary',model:'Hammer'}]);assert.equal(g.visible,true);held.select([]);assert.equal(g.visible,false);
 held.select([{slot:'primary',model:'Missing'}]);assert.ok(held.missing.has('primary:Missing'));
});

test('action models replace both hands without mutating equipped item identities',()=>{
 const state=inventoryState(),inv=new Inventory(state),plank=inv.create('plank');
 inv.equip(plank.id,'secondary');const before=structuredClone(state);
 assert.deepEqual(heldSelection(state,{primary:'Base.Hammer',secondary:null}),[{slot:'primary',model:'Hammer'}]);
 assert.deepEqual(heldSelection(state,{primary:null,secondary:null}),[]);
 assert.deepEqual(state,before);
 assert.deepEqual(heldSelection(state),[{slot:'secondary',model:'Plank'}]);
});
