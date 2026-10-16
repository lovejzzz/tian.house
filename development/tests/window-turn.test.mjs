import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/world.js';import {Simulation,newState} from '../src/simulation.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
const data={animations:{},animationMetadata:{}};
for(const degrees of [90,180])for(const direction of ['L','R']){
 const name=`turnIdle${degrees}${direction}`,total=degrees*Math.PI/180*(direction==='L'?-1:1),times=[0,1/6,1/3,.5,2/3];
 data.animations[name]=[{bone:'Bip01',kind:0,times,values:times.map(t=>{const a=Math.PI/2+total*t/(2/3);return [-Math.cos(a/2),0,0,Math.sin(a/2)];})}];
 data.animationMetadata[name]={duration:2/3,speed:.8,loop:degrees===90};
}
function fixture(){const world=new World({cells:[]},{floor:{solidfloor:''},window:{windowN:''}}),squares=new Map();for(let x=1;x<5;x++)for(let y=1;y<5;y++)squares.set(`${x},${y},0`,{x,y,z:0,room:0,tiles:['floor']});squares.get('3,3,0').tiles.push('window');world.cells.set('0_0',{squares});const state=newState([3.5,3.5,0]);state.player.angle=Math.PI/2;state.spawned={'0,0,0':true};const sim=new Simulation(world,state,data),obj=world.interactions(state.player).find(o=>o.type==='window');return {world,state,sim,obj};}
test('opposite-facing player turns before window mutation and re-reads open state after turning',()=>{
 const {world,state,sim,obj}=fixture();sim.interact(obj);assert.equal(sim.action.name,'Turn toward window');assert.equal(state.player.windowToggle,undefined);
 const direction=state.player.windowTurn.clip.endsWith('L')?-1:1;sim.tick(.1);assert.ok((state.player.angle-Math.PI/2)*direction>0);assert.equal(state.player.windowToggle,undefined);
 world.change(3,3,0,'window',{open:true});let ticks=0;while(state.player.windowTurn&&ticks++<100)sim.tick(.05);
 assert.ok(ticks<100);assert.equal(sim.action.name,'Close window');assert.equal(state.player.windowTurn,undefined);assert.ok(world.state(3,3,0,'window').open);
});
test('turn interruption and target loss cancel queued opening; transient turns are not serialized',()=>{
 let {world,state,sim,obj}=fixture();sim.interact(obj);sim.tick(.1);assert.equal(JSON.parse(sim.serialize()).player.windowTurn,undefined);
 sim.tick(.05,{x:1});assert.equal(sim.action,null);assert.equal(state.player.windowTurn,undefined);assert.notEqual(world.state(3,3,0,'window').open,true);
 ({world,state,sim,obj}=fixture());sim.interact(obj);world.change(3,3,0,'window',{barricade:1});sim.tick(.1);assert.equal(sim.action,null);assert.equal(state.player.windowTurn,undefined);
});
test('barricade preparation turns without spending build time, including a smashed partly boarded window',()=>{
 const {world,state,sim}=fixture();world.change(3,3,0,'window',{smashed:true,barricades:{same:{plankHealth:[40,0,0,0]}}});
 for(const type of ['hammer','plank','nails','nails'])sim.inventory.create(type);
 assert.equal(sim.craft('barricade'),true);assert.ok(state.player.buildMotion.turn);const duration=sim.action.duration;
 sim.tick(.1);assert.equal(sim.action.left,duration);assert.equal(state.player.buildMotion.elapsed,0);assert.equal(sim.inventory.count('plank'),1);
 let ticks=0;while(state.player.buildMotion?.turn&&ticks++<100)sim.tick(.05);assert.ok(ticks<100);assert.equal(state.player.buildMotion.elapsed,0);
 for(let i=0;i<84;i++)sim.tick(.05);assert.equal(sim.action,null);assert.equal(state.player.buildMotion,undefined);assert.deepEqual(world.state(3,3,0,'window').barricades.same.plankHealth,[40,1000,0,0]);
});
