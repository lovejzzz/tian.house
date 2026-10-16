import test from 'node:test';import assert from 'node:assert/strict';
import {furnishingLift,mountProblem} from '../src/furnishing.js';
import {WorkshopModel} from '../src/workshop-model.js';
import {World} from '../src/world.js';
import {waterSource,transferWater} from '../src/water.js';
import {Simulation,newState} from '../src/simulation.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
const props={floor:{solidfloor:''},table:{IsTable:'',Surface:'34',solidtrans:''},low:{IsTable:'',Surface:'15'},cup:{TianMount:'table'},wall:{WallN:''},window:{WindowN:''},art:{TianMount:'wall',attachedN:''},curtain:{TianMount:'window',attachedN:''}};
test('small objects use their support height without mutating metadata',()=>{
 assert.equal(furnishingLift('cup',{tiles:['floor','table','cup']},props),34);
 assert.equal(furnishingLift('cup',{tiles:['low','cup']},props),15);
 assert.equal(mountProblem('cup',{tiles:['floor']},props),'Place this on a table, counter or bedside cabinet');
 assert.equal(mountProblem('cup',{tiles:['table']},props),null);
 assert.equal(mountProblem('art',{tiles:['window']},props),'Attach this to a solid wall in this direction');
 assert.equal(mountProblem('curtain',{tiles:['window']},props),null);
});
test('invalid decorative placements are atomic; table and its attached props move together',()=>{
 const m=new WorkshopModel({version:1,name:'Test',squares:[{x:2,y:2,z:0,tiles:['floor','table','cup']},{x:3,y:2,z:0,tiles:['floor']}],items:[]},[0,0,10,10],props);
 const cup={parts:[{dx:0,dy:0,tile:'cup'}]};assert.equal(m.place(cup,3,2,0).ok,false);assert.deepEqual(m.square(3,2,0).tiles,['floor']);
 m.begin('Move furnished table');m.square(2,2,0).tiles=['floor'];assert.equal(m.place({parts:[{dx:0,dy:0,tile:'table'},{dx:0,dy:0,tile:'cup'}]},3,2,0).ok,true);m.commit();
 assert.deepEqual(m.square(3,2,0).tiles,['floor','table','cup']);m.undo();assert.deepEqual(m.square(2,2,0).tiles,['floor','table','cup']);
});
test('original lights toggle persistent state, and reserve tanks remain finite with mains enabled',()=>{
 const p={...props,lamp:{TianLight:'warm',CustomName:'Lamp'},tank:{TianUtility:'water',waterAmount:'1000'}};
 const w=new World({playableBounds:[0,0,10,10]},p);w.setHousePlan({squares:[{x:3,y:3,z:0,tiles:['floor']},{x:4,y:3,z:0,tiles:['floor','lamp','tank']}]});
 const state=newState([3.5,3.5,0]);state.housePlan=w.housePlan;const sim=new Simulation(w,state);const lamp=w.interactions(sim.state.player).find(o=>o.type==='light'),tank=w.interactions(sim.state.player).find(o=>o.type==='water');
 assert.ok(lamp);sim.interact(lamp);assert.equal(w.state(4,3,0,'lamp').lightOff,true);sim.interact(lamp);assert.equal(w.state(4,3,0,'lamp').lightOff,false);
 sim.state.utilities={water:true};sim.state.player.thirst=50;assert.deepEqual(waterSource(w,sim.state,tank),{mains:false,amount:1000,tainted:false});
 assert.equal(transferWater(w,sim.state,sim.inventory,tank,null,1),1);assert.equal(waterSource(w,sim.state,tank).amount,999);
});
