import test from 'node:test';
import assert from 'node:assert/strict';
import {useFixtureCatalog} from './fixtures/catalog.mjs';
import {Simulation,newState} from '../src/simulation.js';
import {World} from '../src/world.js';
import {validateInventory} from '../src/inventory.js';
useFixtureCatalog();
function setup(){const world=new World({cells:[]},{}),s=newState([3.5,3.5,0]),sim=new Simulation(world,s);sim.spawnNearby=()=>{};return {sim,s};}
function complete(sim){for(let i=0;i<50;i++)sim.tick(.1);}
test('drop and pickup preserve physical identity, durability and save ownership',()=>{
 const {sim,s}=setup(),item=sim.inventory.create('Base.HammerStone');item.headCondition=3;sim.inventory.equip(item.id);
 assert.equal(sim.dropItem(item.id),true);complete(sim);assert.equal(item.container,'ground:3,3,0');assert.equal(s.inventory.equipment.primary,undefined);
 assert.ok(item.groundOffset.x>=0&&item.groundOffset.x<=1);assert.ok(item.worldZRotation>=0&&item.worldZRotation<360);
 assert.deepEqual(JSON.parse(sim.serialize()).inventory.items[item.id].groundOffset,item.groundOffset);
 assert.ok(validateInventory(JSON.parse(sim.serialize()).inventory));assert.equal(sim.takeGroundItem(item.id),true);complete(sim);
 assert.equal(sim.inventory.state.items[item.id],item);assert.equal(item.headCondition,3);assert.equal(item.container,'player');
 assert.equal(item.groundOffset,undefined);
});
test('favorite drop refuses and ground pickup cannot reach another tile or layer',()=>{
 const {sim,s}=setup(),item=sim.inventory.create('hammer','player',{favorite:true});assert.equal(sim.dropItem(item.id),false);
 item.favorite=false;assert.equal(sim.dropItem(item.id),true);complete(sim);s.player.x=4.5;assert.equal(sim.takeGroundItem(item.id),false);s.player.x=3.5;s.player.z=1;assert.equal(sim.takeGroundItem(item.id),false);
});
test('cancelled drop does not duplicate items or change ownership',()=>{
 const {sim}=setup(),item=sim.inventory.create('plank');sim.dropItem(item.id);sim.cancel();complete(sim);assert.equal(item.container,'player');assert.equal(sim.inventory.list(sim.groundContainer()).length,0);
});
test('save rejects malformed ground offsets without rejecting legacy missing offsets',()=>{
 const {sim}=setup(),item=sim.inventory.create('water');sim.dropItem(item.id);complete(sim);
 const good=structuredClone(sim.state.inventory);assert.ok(validateInventory(good));
 for(const invalid of [{x:Infinity,y:.5,z:0},{x:.5,y:-1,z:0},{x:.5,y:.5,z:null}]){const bad=structuredClone(good);bad.items[item.id].groundOffset=invalid;assert.throws(()=>validateInventory(bad),/Invalid ground item coordinates/);}
 delete good.items[item.id].groundOffset;assert.ok(validateInventory(good));
});
