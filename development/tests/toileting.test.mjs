import test from 'node:test';import assert from 'node:assert/strict';
import {useFixtureCatalog} from './fixtures/catalog.mjs';
import {Simulation,newState,parseSave} from '../src/simulation.js';
import {planToilet,completeToilet} from '../src/toileting.js';
useFixtureCatalog();
function setup(){const object={id:'toilet',type:'water',name:'Toilet',x:8003,y:11396,z:1,tile:'toilet',props:{CustomName:'Toilet',waterPiped:'',waterAmount:'12'}};const world={changes:{},revision:0,reindexBuilds(){},interactions(){return [object]},state(){return this.changes.toilet??{}},change(x,y,z,t,p){this.changes.toilet={...this.changes.toilet,...p}},move(){return false},lineClear(){return true}};const state=newState([8003.5,11396.5,1]),sim=new Simulation(world,state);sim.spawnNearby=()=>{};state.utilities={water:false};return {world,state,sim,object};}
test('use is timed, persists dirty state, and flush spends finite reservoir water',()=>{
 const {world,state,sim,object}=setup();const thirst=state.player.thirst;assert.ok(sim.useToilet(object,'useToilet'));sim.tick(.1);assert.equal(world.state().toiletDirty,undefined);sim.cancel();assert.equal(state.player.handHygiene,undefined);
 assert.ok(sim.useToilet(object,'useToilet'));for(let i=0;i<205;i++)sim.tick(.1);assert.equal(world.state().toiletDirty,true);assert.equal(state.player.handHygiene,25);assert.ok(state.player.thirst>=thirst);assert.equal(parseSave(sim.serialize()).changes.toilet.toiletDirty,true);
 assert.equal(planToilet(world,state,object,'useToilet').ok,false);assert.ok(sim.useToilet(object,'flushToilet'));for(let i=0;i<42;i++)sim.tick(.1);assert.equal(world.state().toiletDirty,false);assert.equal(world.state().waterAmount,6);
});
test('lost reach or lost water cannot commit a flush; malformed saves are rejected',()=>{
 const {world,state,sim,object}=setup();world.changes.toilet={toiletDirty:true,waterAmount:5};assert.equal(sim.useToilet(object,'flushToilet'),false);
 world.changes.toilet.waterAmount=6;assert.ok(sim.useToilet(object,'flushToilet'));world.interactions=()=>[];sim.tick(.1);assert.equal(sim.action,null);assert.equal(world.state().waterAmount,6);assert.equal(world.state().toiletDirty,true);
 world.interactions=()=>[object];state.utilities.water=true;assert.ok(completeToilet(world,state,object,'flushToilet').ok);assert.equal(world.state().waterAmount,6);world.changes.toilet.toiletDirty='yes';assert.throws(()=>parseSave(sim.serialize()),/toilet/);
});
