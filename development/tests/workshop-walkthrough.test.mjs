import test from 'node:test';import assert from 'node:assert/strict';
import {WorkshopWalkthrough} from '../src/workshop-walkthrough.js';
import {World} from '../src/world.js';import {Simulation,newState} from '../src/simulation.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
const bounds=[0,0,20,20],props={floor:{solidfloor:''},shelf:{container:'shelves'},wall:{WallN:''}},atlas={regions:{floor:{},shelf:{},wall:{}}};
function setup(){const original=new Simulation(new World({spawn:[4.5,4.5,0],playableBounds:bounds},props),newState([4.5,4.5,0]));original.state.player.hp=12;const plan={version:1,name:'Inspection',squares:[{x:4,y:4,z:0,tiles:['floor','shelf']},{x:5,y:4,z:0,tiles:['floor']},{x:5,y:5,z:0,tiles:['floor','wall']}],items:[{type:'Base.WaterBottle',x:4,y:4,z:0,storageTile:'shelf'}],vehicles:[]};return {original,plan};}
test('inspection has a healthy independent character and world; stock and collision remain real',()=>{
 const {original,plan}=setup(),before=original.serialize(),session=new WorkshopWalkthrough(original,plan,bounds,atlas);
 assert.equal(session.sim.state.player.hp,100);assert.notEqual(session.world,original.world);assert.notEqual(session.world.changes,original.world.changes);
 const stock=Object.values(session.sim.inventory.state.items).find(i=>i.workshopPlaced);assert.equal(stock.container,'world:4,4,0:shelf');assert.equal(session.sim.inventory.transfer(stock.id,'player').ok,true);
 assert.equal(session.world.canStep(5.5,4.8,5.5,5.2,0),false);assert.equal(session.world.canStep(4.5,4.5,5.5,4.5,0),true);
 session.world.changes['5,5,0']={doorOpen:true};assert.equal(original.serialize(),before);assert.equal(plan.items.length,1);
});
test('zombie spawning is disabled only for inspection; its report explicitly excludes survival acceptance',()=>{
 const {original,plan}=setup(),session=new WorkshopWalkthrough(original,plan,bounds,atlas);
 // Isolate the spawning policy from map generation: make all surrounding cells valid.
 for(const sim of [original,session.sim]){sim.world.square=()=>({tiles:['floor']});sim.world.flags=()=>({floor:true,solid:false});sim.world.objectOverlap=()=>0;sim.spawnNearby();}
 assert.ok(original.state.zombies.length>0);assert.equal(session.sim.state.zombies.length,0);assert.deepEqual(session.sim.state.spawned,{});
 session.sim.state.player.x=5.5;session.sim.state.elapsed=2;session.sim.events.push('Opened door');session.observe();const report=session.report();assert.equal(report.conditions.survivalAcceptance,false);assert.equal(report.simulatedSeconds,2);assert.equal(report.visited.length,2);assert.equal(report.events.at(-1).message,'Opened door');report.visited[0].position[0]=99;assert.equal(session.visited[0].position[0],4);
});
test('invalid preview assets leave the original simulation untouched',()=>{const {original,plan}=setup(),before=original.serialize();plan.squares[0].tiles.push('missing');assert.throws(()=>new WorkshopWalkthrough(original,plan,bounds,atlas),/Missing tile/);assert.equal(original.serialize(),before);});

test('visitors arrive empty-handed and can retrieve the single bat stocked on the counter',()=>{
 const {original,plan}=setup();plan.items=[{type:'Base.BaseballBat',x:4,y:4,z:0,storageTile:'shelf'}];
 const before=original.serialize(),session=new WorkshopWalkthrough(original,plan,bounds,atlas),inv=session.sim.inventory;
 assert.equal(inv.state.equipment.primary,undefined);assert.equal(inv.state.equipment.secondary,undefined);
 const bats=Object.values(inv.state.items).filter(i=>i.type==='Base.BaseballBat');assert.equal(bats.length,1);
 assert.equal(bats[0].container,'world:4,4,0:shelf');assert.equal(inv.transfer(bats[0].id,'player').ok,true);
 assert.equal(inv.equip(bats[0].id).ok,true);assert.equal(inv.state.equipment.primary,bats[0].id);
 assert.equal(original.serialize(),before);
});
