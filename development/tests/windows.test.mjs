import test from 'node:test';import assert from 'node:assert/strict';
import {canToggleWindow,canClimbWindow,windowLanding,windowSprite} from '../src/windows.js';
import {World} from '../src/world.js';import {Simulation,newState} from '../src/simulation.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
function finishToggle(sim){for(let i=0;i<25;i++)sim.tick(.1);}
test('closed intact window denies climbing; openings do not bypass barricades or closing actors',()=>{
 for(const state of [{},{health:50},{health:null}])assert.equal(canClimbWindow({},state),false);
 for(const opening of [{open:true},{smashed:true},{health:0}]){
  assert.equal(canClimbWindow({},opening),true);
  for(const flag of ['barricade','invincible','closingSuccess'])assert.equal(canClimbWindow({},{...opening,[flag]:true}),false);
 }
});
test('window destinations use the adjacent square in both orientations and reject diagonal approaches',()=>{
 for(const north of [true,false]){const o={x:3,y:3,z:1,props:{[north?'windowN':'windowW']:''}},a={x:3.5,y:3.5};
  const b=windowLanding(o,a);assert.deepEqual(b,{x:north?3.5:2.5,y:north?2.5:3.5,z:1});assert.deepEqual(windowLanding(o,b),{...a,z:1});assert.equal(windowLanding(o,{x:2.5,y:2.5}),null);
 }
 assert.equal(windowSprite('windows_10',{OpenTileOffset:'8'},{open:true}),'windows_18');
 assert.equal(windowSprite('windows_10',{SmashedTileOffset:'4',GlassRemovedOffset:'6'},{smashed:true,glassRemoved:true}),'windows_16');
});
test('opening, climbing and completion revalidation use the actual simulation state',()=>{
 const w=new World({cells:[]},{floor:{solidfloor:''},window:{windowN:'',OpenTileOffset:'2'}}),squares=new Map();for(let x=1;x<5;x++)for(let y=1;y<5;y++)squares.set(`${x},${y},0`,{x,y,z:0,tiles:['floor']});squares.get('3,3,0').tiles.push('window');w.cells.set('0_0',{squares});
 const s=newState([3.5,3.5,0]),sim=new Simulation(w,s);s.spawned={'0,0,0':true};const o=w.interactions(s.player).find(o=>o.type==='window');
 sim.interact(o,'climb');assert.equal(sim.action,null);w.change(3,3,0,'window',{health:null});sim.interact(o);finishToggle(sim);assert.equal(w.state(3,3,0,'window').open,true);
 sim.interact(o,'climb');assert.ok(sim.action);w.change(3,3,0,'window',{open:false});for(let i=0;i<22;i++)sim.tick(.1);assert.equal(s.player.y,3.5);
 sim.interact(o);finishToggle(sim);sim.interact(o,'climb');for(let i=0;i<22;i++)sim.tick(.1);assert.equal(Math.floor(s.player.y),2);
 sim.interact(o,'climb');for(let i=0;i<22;i++)sim.tick(.1);assert.equal(Math.floor(s.player.y),3);
});

test('window phase commits before completion and locks ordinary movement',()=>{
 const w=new World({cells:[]},{floor:{solidfloor:''},window:{windowN:''}}),squares=new Map();
 for(let x=1;x<5;x++)for(let y=1;y<5;y++)squares.set(`${x},${y},0`,{x,y,z:0,tiles:['floor']});squares.get('3,3,0').tiles.push('window');w.cells.set('0_0',{squares});
 const s=newState([3.5,3.5,0]),sim=new Simulation(w,s);s.spawned={'0,0,0':true};const o=w.interactions(s.player).find(o=>o.type==='window');
 sim.interact(o);finishToggle(sim);sim.interact(o,'climb');assert.equal(s.player.angle,-Math.PI/2);
 for(let i=0;i<6;i++)sim.tick(.1,{x:1,y:0,run:true});
 assert.ok(sim.action);assert.equal(s.player.x,3.5);assert.ok(s.player.y<3.5&&s.player.y>3);
 w.change(3,3,0,'window',{open:false});for(let i=0;i<9;i++)sim.tick(.1);
 assert.equal(sim.action,null);assert.equal(Math.floor(s.player.y),2);assert.equal(s.player.windowMotion,undefined);
 sim.tick(.1,{x:0,y:-1});assert.ok(s.player.y<2.9);sim.tick(.1,{x:1,y:0});assert.ok(s.player.x>3.5);
});

test('window remains interactable from either adjacent face beyond the generic reach-ray threshold',()=>{
 const w=new World({cells:[]},{floor:{solidfloor:''},window:{windowN:''}}),squares=new Map();
 for(let x=1;x<5;x++)for(let y=1;y<5;y++)squares.set(`${x},${y},0`,{x,y,z:0,tiles:['floor']});squares.get('3,3,0').tiles.push('window');w.cells.set('0_0',{squares});
 assert.ok(w.interactions({x:3.5,y:2.65,z:0}).some(o=>o.type==='window'));
 assert.ok(w.interactions({x:3.5,y:3.85,z:0}).some(o=>o.type==='window'));
 assert.ok(!w.interactions({x:3.5,y:1.5,z:0}).some(o=>o.type==='window'));
});

test('window toggles at success event, cancellation preserves already committed state',()=>{
 const w=new World({cells:[]},{floor:{solidfloor:''},window:{windowN:''}}),squares=new Map();
 for(let x=1;x<5;x++)for(let y=1;y<5;y++)squares.set(`${x},${y},0`,{x,y,z:0,tiles:['floor']});squares.get('3,3,0').tiles.push('window');w.cells.set('0_0',{squares});
 const s=newState([3.5,3.5,0]),sim=new Simulation(w,s);s.spawned={'0,0,0':true};const o=w.interactions(s.player).find(o=>o.type==='window');
 sim.interact(o);assert.ok(sim.action);assert.equal(w.state(3,3,0,'window').open,undefined);
 for(let i=0;i<10;i++)sim.tick(.1);assert.notEqual(w.state(3,3,0,'window').open,true);
 sim.cancel();finishToggle(sim);assert.notEqual(w.state(3,3,0,'window').open,true);assert.equal(s.player.windowToggle,undefined);
 sim.interact(o);for(let i=0;i<11;i++)sim.tick(.1);assert.equal(w.state(3,3,0,'window').open,true);assert.ok(sim.action);
 sim.cancel();assert.equal(w.state(3,3,0,'window').open,true);
 sim.interact(o);for(let i=0;i<10;i++)sim.tick(.1);assert.equal(w.state(3,3,0,'window').open,true);
 sim.tick(.1);assert.equal(w.state(3,3,0,'window').open,false);assert.ok(sim.action);finishToggle(sim);assert.equal(s.player.windowToggle,undefined);
});


test('source sprite WindowLocked suppresses opening but differs from runtime lock failure',()=>{
 assert.equal(canToggleWindow({WindowLocked:''},{}),false);
 assert.equal(canToggleWindow({WindowLocked:''},{open:true}),true);
 assert.equal(canToggleWindow({},{permaLocked:true}),true);
 assert.equal(canToggleWindow({},{locked:true}),true);
 for(const state of [{smashed:true},{open:true,smashed:true},{barricade:1},{open:true,barricade:1}])assert.equal(canToggleWindow({},state),false);
});
test('already-open WindowLocked sprite can close without offering an opening attempt',()=>{
 const w=new World({cells:[]},{floor:{solidfloor:''},window:{windowN:'',WindowLocked:''}}),squares=new Map();
 for(let x=1;x<5;x++)for(let y=1;y<5;y++)squares.set(`${x},${y},0`,{x,y,z:0,tiles:['floor']});
 squares.get('3,3,0').tiles.push('window');w.cells.set('0_0',{squares});
 const state=newState([3.5,3.5,0]),sim=new Simulation(w,state);state.spawned={'0,0,0':true};
 const obj=w.interactions(state.player).find(o=>o.type==='window');sim.interact(obj);assert.equal(sim.action,null);
 w.change(3,3,0,'window',{open:true});sim.interact(obj);assert.ok(sim.action);finishToggle(sim);assert.equal(w.state(3,3,0,'window').open,false);
});

test('side-specific barricades distinguish toggling from traversing both window orientations',()=>{
 for(const north of [true,false]){
  const obj={x:3,y:3,z:0,props:{[north?'windowN':'windowW']:''}};
  const same={x:3.5,y:3.5},other={x:north?3.5:2.5,y:north?2.5:3.5};
  for(const [side,blocked,free] of [['same',same,other],['opposite',other,same]]){
   const state={open:true,barricades:{[side]:100}};
   assert.equal(canToggleWindow(obj.props,state,obj,blocked),false);
   assert.equal(canToggleWindow(obj.props,state,obj,free),true);
   assert.equal(canClimbWindow(obj.props,state),false);
  }
  assert.equal(canToggleWindow(obj.props,{barricades:{same:100}},obj,{x:3,y:3}),false);
  assert.equal(canToggleWindow(obj.props,{barricade:100},obj,other),false);
 }
});
test('opposite-side barricade allows closing but blocks crossing; actor-side addition cancels a toggle',()=>{
 const w=new World({cells:[]},{floor:{solidfloor:''},window:{windowN:''}}),squares=new Map();
 for(let x=1;x<5;x++)for(let y=1;y<5;y++)squares.set(`${x},${y},0`,{x,y,z:0,tiles:['floor']});
 squares.get('3,3,0').tiles.push('window');w.cells.set('0_0',{squares});
 const state=newState([3.5,3.5,0]),sim=new Simulation(w,state);state.spawned={'0,0,0':true};
 const obj=w.interactions(state.player).find(o=>o.type==='window');
 w.change(3,3,0,'window',{open:true,barricades:{opposite:100}});
 sim.interact(obj,'climb');assert.equal(sim.action,null);
 sim.interact(obj);assert.ok(sim.action);finishToggle(sim);assert.equal(w.state(3,3,0,'window').open,false);
 sim.interact(obj);assert.ok(sim.action);w.change(3,3,0,'window',{barricades:{same:50,opposite:100}});sim.tick(.1);
 assert.equal(sim.action,null);assert.equal(w.state(3,3,0,'window').open,false);
 const restored=JSON.parse(JSON.stringify(w.changes));assert.deepEqual(restored[obj.id].barricades,{same:50,opposite:100});
});
