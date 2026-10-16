import test from 'node:test';import assert from 'node:assert/strict';
import {useFixtureCatalog} from './fixtures/catalog.mjs';import {Simulation,newState,parseSave} from '../src/simulation.js';import {advanceShower,planShower} from '../src/showering.js';
useFixtureCatalog();
function fixture(){const object={id:'shower',type:'shower',name:'Shower',x:8003,y:11396,z:1,tile:'shower',distance:.1,props:{CustomName:'Shower',waterPiped:'',waterAmount:'20'}};const world={changes:{},revision:0,reindexBuilds(){},interactions(){return [object]},state(){return this.changes.shower??{}},change(x,y,z,t,patch){this.changes.shower={...this.changes.shower,...patch}},move(){return false},lineClear(){return true}};const state=newState([8003.5,11396.5,1]),sim=new Simulation(world,state);sim.spawnNearby=()=>{};return {sim,world,object};}
test('washing spends finite water progressively and never heals wounds or thirst',()=>{const {sim,world,object}=fixture();sim.state.utilities={water:false};sim.state.player.hygiene=0;const before={hp:sim.state.player.hp,thirst:sim.state.player.thirst};const r=advanceShower(world,sim.state,object,10);assert.equal(r.litres,8);assert.equal(world.changes.shower.waterAmount,12);assert.ok(sim.state.player.hygiene>30&&sim.state.player.hygiene<34);assert.equal(sim.state.player.hp,before.hp);assert.equal(sim.state.player.thirst,before.thirst);});
test('shower action cancels on lost reach and preserves completed washing in save',()=>{const {sim,world,object}=fixture();sim.state.player.hygiene=0;assert.equal(sim.shower(object),true);sim.tick(.1);assert.ok(sim.state.player.hygiene>0);world.interactions=()=>[];sim.tick(.1);assert.equal(sim.action,null);assert.equal(parseSave(sim.serialize()).player.hygiene,sim.state.player.hygiene);});
test('supply exhaustion limits washing; distant or contaminated showers reject',()=>{const {sim,world,object}=fixture();sim.state.utilities={water:false};world.changes.shower={waterAmount:1};assert.equal(advanceShower(world,sim.state,object,30).litres,1);assert.equal(planShower(world,sim.state,object).ok,false);world.changes.shower={waterAmount:10,waterTainted:true};assert.equal(planShower(world,sim.state,object).ok,false);world.changes.shower={waterAmount:10};object.distance=1;assert.equal(planShower(world,sim.state,object).ok,false);sim.state.player.wetness=-1;assert.throws(()=>parseSave(sim.serialize()),/wetness/);});

test('shower tray rests above its supporting floor instead of intersecting it',async()=>{
 const {readFile}=await import('node:fs/promises');const {wetFurnitureVolume}=await import('../src/wet-furniture-volume.js');const {prismSolid}=await import('../src/prism-solid.js');const {solidsOverlap}=await import('../src/volume-placement-check.js');
 const recipe=JSON.parse(await readFile(new URL('../assets/recipes/volume/shower.json',import.meta.url)));const parts=wetFurnitureVolume(recipe).parts;
 const floor=prismSolid({polygon:[[0,0],[1,0],[1,1],[0,1]],minZ:-.2,maxZ:0});
 for(const part of parts)for(const solid of part.collision)assert.equal(solidsOverlap(solid,floor),false,part.id);
});

test('body drying follows game time, pause and saved state without healing or washing',async()=>{
 const {advanceBodyDrying}=await import('../src/showering.js');
 const {sim}=fixture();sim.state.player.wetness=100;sim.state.player.hygiene=70;
 sim.paused=true;sim.tick(.1);assert.equal(sim.state.player.wetness,100);
 sim.paused=false;sim.tick(.1);assert.ok(sim.state.player.wetness<100);
 assert.equal(parseSave(sim.serialize()).player.wetness,sim.state.player.wetness);
 const a={wetness:100,hygiene:70,hp:33},b=structuredClone(a);
 advanceBodyDrying(a,45);for(let i=0;i<90;i++)advanceBodyDrying(b,.5);
 assert.ok(Math.abs(a.wetness-50)<1e-9);assert.ok(Math.abs(a.wetness-b.wetness)<1e-9);
 assert.equal(a.hygiene,70);assert.equal(a.hp,33);
 advanceBodyDrying(a,500);assert.equal(a.wetness,0);
 const legacy={};advanceBodyDrying(legacy,10);assert.deepEqual(legacy,{});
 const flowing={wetness:80};advanceBodyDrying(flowing,45,{showering:true});assert.equal(flowing.wetness,80);
 assert.throws(()=>advanceBodyDrying(a,-1),/duration/);
});
