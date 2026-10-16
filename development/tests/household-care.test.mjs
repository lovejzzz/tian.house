import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {setItemCatalog,Inventory,inventoryState} from '../src/inventory.js';
import {completeTowelDrying,planTowelDrying} from '../src/household-care.js';
import {Simulation,newState,parseSave} from '../src/simulation.js';
import {advanceShower} from '../src/showering.js';
setItemCatalog(JSON.parse(readFileSync(new URL('../private-assets/items.json',import.meta.url))));
function fixture(){const object={id:'shower',type:'shower',distance:.1,x:8003,y:11396,z:1,tile:'shower',props:{CustomName:'Shower',waterPiped:''}};const world={changes:{},revision:0,reindexBuilds(){},interactions:()=>[object],state:()=>({}),move:()=>false,lineClear:()=>true};const sim=new Simulation(world,newState([8003.5,11396.5,1]),null,{spawnZombies:false});return {sim,world,object};}
test('a dry towel consumes absorption capacity and becomes the imported wet towel',()=>{
 const inv=new Inventory(inventoryState()),t=inv.create('Base.BathTowel'),p={wetness:100,hygiene:55,hp:70};
 assert.equal(completeTowelDrying(inv,p,t.id).amount,100);assert.equal(p.wetness,0);assert.equal(p.hygiene,55);assert.equal(p.hp,70);assert.equal(inv.count('Base.BathTowelWet'),1);assert.equal(inv.count('Base.BathTowel'),0);
 assert.equal(planTowelDrying(inv,{wetness:50},inv.list('player')[0].id).ok,false);
});
test('towel action cancellation and lost ownership cannot dry the resident',()=>{
 const {sim}=fixture(),t=sim.inventory.create('Base.BathTowel');sim.state.player.wetness=80;
 assert.equal(sim.dryWithTowel(t.id),true);sim.cancel();assert.equal(t.currentUses,10);assert.equal(sim.state.player.wetness,80);
 sim.dryWithTowel(t.id);sim.inventory.container('shelf','Shelf',50);sim.inventory.transfer(t.id,'shelf');const action=sim.action;sim.action=null;action.complete();assert.equal(sim.state.player.wetness,80);assert.equal(t.currentUses,10);
});
test('soap is spent once only after valid flowing water; rinsing alone has a lower cleaning ceiling',()=>{
 const {sim,world,object}=fixture(),soap=sim.inventory.create('Base.Soap2');sim.state.player.hygiene=0;
 assert.equal(sim.shower(object,soap.id),true);assert.equal(soap.currentUses,20);sim.tick(.1);assert.equal(soap.currentUses,19);sim.tick(.1);assert.equal(soap.currentUses,19);sim.cancel();
 assert.equal(sim.shower(object,soap.id),true);world.interactions=()=>[];sim.tick(.1);assert.equal(soap.currentUses,19);assert.equal(sim.action,null);
 world.interactions=()=>[object];sim.state.player.hygiene=0;advanceShower(world,sim.state,object,30);assert.equal(sim.state.player.hygiene,70);advanceShower(world,sim.state,object,30,{soap:true});assert.equal(sim.state.player.hygiene,100);
 assert.equal(parseSave(sim.serialize()).player.hygiene,100);
});
