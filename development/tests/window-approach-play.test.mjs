import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/world.js';import {Simulation,newState} from '../src/simulation.js';import {findTilePath} from '../src/pathfinding.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
function fixture(spawn=[4.5,3.5,0]){const w=new World({cells:[]},{floor:{solidfloor:''},window:{windowN:''},crate:{solid:''}}),squares=new Map();for(let x=1;x<6;x++)for(let y=1;y<6;y++)squares.set(`${x},${y},0`,{x,y,z:0,room:0,tiles:['floor']});squares.get('3,3,0').tiles.push('window');w.cells.set('0_0',{squares});const s=newState(spawn);s.spawned={'0,0,0':true};const sim=new Simulation(w,s),obj=w.interactions(s.player).find(o=>o.type==='window');return {w,s,sim,obj};}
test('walks to selected tile before opening, then re-reads the window state at arrival',()=>{
 const {w,s,sim,obj}=fixture();sim.interact(obj);assert.equal(sim.action.name,'Walk to window');assert.equal(s.player.windowToggle,undefined);sim.tick(.1);assert.ok(s.player.x<4.5&&s.player.x>3.5);assert.equal(s.player.moving,true);assert.notEqual(w.state(3,3,0,'window').open,true);
 w.change(3,3,0,'window',{open:true});for(let i=0;i<6;i++)sim.tick(.1);assert.equal(s.player.x,3.5);assert.equal(sim.action.name,'Close window');assert.equal(s.player.windowApproach,undefined);for(let i=0;i<22;i++)sim.tick(.1);assert.equal(w.state(3,3,0,'window').open,false);
});
test('movement cancels queued opening and an obstacle added mid-route aborts without teleport',()=>{
 let {w,s,sim,obj}=fixture();sim.interact(obj);sim.tick(.1);sim.tick(.1,{x:1,y:0});assert.equal(sim.action,null);assert.equal(s.player.windowApproach,undefined);for(let i=0;i<30;i++)sim.tick(.1);assert.notEqual(w.state(3,3,0,'window').open,true);
 ({w,s,sim,obj}=fixture());sim.interact(obj);w.square(3,3,0).tiles.push('crate');for(let i=0;i<20;i++)sim.tick(.1);assert.equal(sim.action,null);assert.ok(s.player.x>4);assert.equal(s.player.windowToggle,undefined);
});
test('current selected tile preserves sub-tile coordinates and path status distinguishes budget exhaustion',()=>{
 const {w,s,sim,obj}=fixture([3.78,3.8,0]);sim.interact(obj);assert.equal(sim.action.name,'Open window');assert.equal(s.player.x,3.78);assert.equal(s.player.y,3.8);
 assert.equal(findTilePath(w,{x:1.5,y:1.5,z:0},{x:5,y:5,z:0},1).status,'search-limit');assert.equal(findTilePath(w,s.player,{x:3,y:3,z:1}).status,'different-floor');
 const save=JSON.parse(sim.serialize());assert.equal(save.player.windowToggle,undefined);
});
