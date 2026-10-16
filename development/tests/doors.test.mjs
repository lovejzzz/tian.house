import test from 'node:test';import assert from 'node:assert/strict';
import {useFixtureCatalog} from './fixtures/catalog.mjs';
import {World} from '../src/world.js';import {Simulation,newState,parseSave} from '../src/simulation.js';
import {doorKey,doorInside,doorToggle} from '../src/doors.js';
const catalog=useFixtureCatalog();
for(const [type,properties] of Object.entries({'Base.Key1':{ItemType:'base:key'},'Base.KeyRing':{ItemType:'base:container',Capacity:1,Tags:'base:keyring'}}))catalog[type]={type,name:type,properties,components:[]};
function fixture(north=true){
 const world=new World({cells:[]},{floor:{solidfloor:''},door:{[north?'doorN':'doorW']:''}}),squares=new Map();
 for(let x=0;x<7;x++)for(let y=0;y<7;y++)squares.set(`${x},${y},0`,{x,y,z:0,room:-1,tiles:['floor']});
 squares.get('3,3,0').room=1;squares.get('3,3,0').tiles.push('door');world.cells.set('0_0',{squares});
 const state=newState(north?[3.5,2.5,0]:[2.5,3.5,0]),sim=new Simulation(world,state);
 const obj=world.interactions(state.player).find(o=>o.type==='door');
 return {world,state,sim,obj};
}
test('ordinary exterior locked door rejects interaction without changing open state in both orientations',()=>{
 for(const north of [true,false]){const {world,state,sim,obj}=fixture(north);
  world.change(3,3,0,'door',{locked:true,lockedByKey:true,keyId:271});
  assert.equal(doorToggle(world,obj,state.player,sim.inventory).reason,'The door is locked');
  sim.interact(obj);assert.notEqual(world.state(3,3,0,'door').open,true);assert.equal(state.journal[0],'The door is locked');
  state.player.x=8494.5;state.player.y=11549.5;assert.equal(parseSave(sim.serialize()).changes['3,3,0:door'].keyId,271);
 }
});
test('keys inside ordinary bags do not unlock doors; a carried key ring does, without consuming the key',()=>{
 const {world,state,sim,obj}=fixture(),inv=sim.inventory;
 world.change(3,3,0,'door',{locked:true,lockedByKey:true,keyId:271});
 const bag=inv.create('backpack'),key=inv.create('Base.Key1',bag.id,{keyId:271});
 assert.equal(doorKey(inv,271),null);sim.interact(obj);assert.notEqual(world.state(3,3,0,'door').open,true);
 const ring=inv.create('Base.KeyRing');inv.transfer(key.id,ring.id);
 assert.equal(doorKey(inv,271),key);assert.equal(doorKey(inv,272),null);
 sim.interact(obj);assert.deepEqual(world.state(3,3,0,'door'),{locked:false,lockedByKey:false,keyId:271,open:true});assert.ok(inv.state.items[key.id]);
 sim.interact(obj);assert.equal(world.state(3,3,0,'door').open,false);
});
test('interior unlocking requires an adjacent room; forceLocked prevents the interior exception',()=>{
 for(const north of [true,false]){const {world,state,sim,obj}=fixture(north);
  world.change(3,3,0,'door',{locked:true,lockedByKey:true,keyId:271});
  state.player.x=3.5;state.player.y=3.5;assert.equal(doorInside(world,obj,state.player),true);
  obj.props.forceLocked='';assert.equal(doorToggle(world,obj,state.player,sim.inventory).ok,false);delete obj.props.forceLocked;
  sim.interact(obj);assert.equal(world.state(3,3,0,'door').open,true);
  world.square(4,3,0).room=2;state.player.x=4.5;assert.equal(doorInside(world,obj,state.player),false);
 }
});
test('open doors can close while locked; either side of a barricade prevents toggling',()=>{
 const {world,state,sim,obj}=fixture();
 world.change(3,3,0,'door',{locked:true,lockedByKey:true,keyId:271,open:true});sim.interact(obj);
 assert.equal(world.state(3,3,0,'door').open,false);assert.equal(world.state(3,3,0,'door').locked,false);
 for(const side of ['same','opposite']){world.change(3,3,0,'door',{barricades:{[side]:{plankHealth:[1000,0,0,0]}}});
  assert.equal(doorToggle(world,obj,state.player,sim.inventory).reason,'The door is barricaded');sim.interact(obj);assert.equal(world.state(3,3,0,'door').open,false);
 }
});
test('failed obstructed opening retains the earlier unlock but never opens the door',()=>{
 const {world,state,sim,obj}=fixture();state.player.x=3.5;state.player.y=3.5;
 world.change(3,3,0,'door',{locked:true,lockedByKey:true,open:false,obstructed:true});
 const preview=doorToggle(world,obj,state.player,sim.inventory);assert.equal(preview.ok,false);
 assert.equal(world.state(3,3,0,'door').locked,true); // Menu preview must be read-only.
 sim.interact(obj);assert.equal(world.state(3,3,0,'door').locked,false);
 assert.equal(world.state(3,3,0,'door').open,false);assert.equal(state.journal[0],'The door is obstructed');
});
