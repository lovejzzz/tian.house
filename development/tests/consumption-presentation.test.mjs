import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {Simulation,newState} from '../src/simulation.js';import {World} from '../src/world.js';import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
import {createHeldConsumable} from '../src/held-consumable.js';import {applyConsumptionPose} from '../src/consumption-pose.js';import {readVolume} from './helpers/volume-delivery.mjs';
test('drink presentation follows the real carried item and cancellation consumes nothing',()=>{
 const sim=new Simulation(new World({spawn:[4,4,0],playableBounds:[0,0,10,10]},{}),newState([4,4,0]));const water=sim.inventory.list().find(i=>i.fluid?.amount),amount=water.fluid.amount;
 assert.equal(sim.consume(water.id),true);assert.deepEqual(sim.action.consumption,{itemId:water.id,type:water.type,kind:'drink'});sim.cancel();assert.equal(water.fluid.amount,amount);
 assert.equal(sim.consume(water.id),true);sim.action.complete();assert.equal(water.fluid.amount,amount-.25);sim.cancel();water.container='remote';assert.equal(sim.consume(water.id),false);
});
test('held food uses delivered geometry and never substitutes unknown food or tray meals',()=>{
 const scene=new THREE.Scene(),asset=readVolume('food-props'),view=createHeldConsumable(scene,[asset]),root=scene.getObjectByName('Held inventory food'),contact={position:new THREE.Vector3(1,2,3),quaternion:new THREE.Quaternion()};
 const type=Object.keys(asset.recipe.semantics.itemKinds).find(t=>asset.recipe.semantics.itemKinds[t]==='water'),action={consumption:{type,itemId:'actual-water'}};
 assert.equal(view.supports(action),true);view.update(action,contact);assert.equal(root.visible,true);assert.equal(root.userData.inventoryItemId,'actual-water');assert.deepEqual(root.position.toArray(),[1,2,3]);assert.ok(root.children.length);
 view.update({consumption:{type:'unknown',itemId:'missing'}},contact);assert.equal(root.visible,false);assert.equal(root.children.length,0);view.dispose();assert.equal(scene.children.length,0);
});
test('mouth contact preserves measured arm lengths throughout raising and lowering',()=>{
 for(const elapsed of [0,.2,1,1.8,2]){
  const root=new THREE.Group(),head=new THREE.Bone(),upper=new THREE.Bone(),fore=new THREE.Bone(),hand=new THREE.Bone();head.name='Bip01_Head';head.position.set(0,0,1.6);upper.name='Bip01_R_UpperArm';fore.name='Bip01_R_Forearm';hand.name='Bip01_R_Hand';upper.position.set(.18,0,1.4);fore.position.z=-.3;hand.position.z=-.25;upper.add(fore);fore.add(hand);root.add(head,upper);root.updateMatrixWorld(true);
  const pose=applyConsumptionPose(root,{duration:2,left:2-elapsed,consumption:{kind:'drink'}},Math.PI/2);assert.ok(pose.position.toArray().every(Number.isFinite));
  const a=upper.getWorldPosition(new THREE.Vector3()),b=fore.getWorldPosition(new THREE.Vector3()),c=hand.getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(a.distanceTo(b)-.3)<1e-8);assert.ok(Math.abs(b.distanceTo(c)-.25)<1e-8);
  if(elapsed===0||elapsed===2)assert.ok(Math.abs(c.z-.85)<1e-8);
 }
});
