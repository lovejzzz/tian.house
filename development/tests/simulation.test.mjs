import {useFixtureCatalog} from './fixtures/catalog.mjs';
useFixtureCatalog();
import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/world.js';
import {Simulation,newState,parseSave,transfer,weight} from '../src/simulation.js';
function fixture(){
 const w=new World({cells:[]},{floor:{solidfloor:''},wall:{WallW:''},door:{doorW:''},box:{solidtrans:'',container:'crate'}});
 const squares=new Map();for(let x=0;x<8;x++)for(let y=0;y<8;y++)squares.set(`${x},${y},0`,{x,y,z:0,room:-1,tiles:['floor']});
 w.cells.set('0_0',{squares});return w;
}
test('capacity boundary accepted; rejection atomic; no duplication',()=>{
 const source={water:2},target={};assert.equal(transfer(source,target,'water',1).ok,true);
 assert.equal(transfer(source,target,'water',1).ok,false);assert.deepEqual(source,{water:1});assert.deepEqual(target,{water:1});
 assert.equal(transfer(source,target,'beans',50).ok,false);assert.equal(weight(target),1);
});
test('closed door blocks, open door permits, walls prevent tunnelling',()=>{
 const w=fixture();w.square(3,3).tiles.push('door');const actor={x:2.6,y:3.5,z:0};w.move(actor,2,0);assert.ok(actor.x<3);
 w.change(3,3,0,'door',{open:true});assert.equal(w.move(actor,1,0),true);assert.ok(actor.x>3);
 w.square(5,3).tiles.push('wall');w.move(actor,4,0);assert.ok(actor.x<5);
});
test('diagonal movement cannot bypass blocked orthogonal crossing',()=>{
 const w=fixture();w.square(3,2).tiles.push('wall');assert.equal(w.canStep(2.8,2.8,3.1,3.1),false);
});
test('movement cancels timed action without consuming resources',()=>{
 const w=fixture(),s=newState([2.5,2.5,0]),sim=new Simulation(w,s);s.player.hunger=80;
 sim.inventory.create('cereal');assert.equal(sim.consume('cereal'),true);sim.tick(.1,{x:1,y:0});assert.equal(sim.action,null);assert.equal(sim.inventory.count('cereal'),1);assert.ok(s.player.hunger>=80);
});
test('exclusive crafting consumes exact materials once',()=>{
 const w=fixture(),s=newState([2.5,2.5,0]),sim=new Simulation(w,s);sim.inventory.create('rag');sim.inventory.create('rag');
 assert.equal(sim.craft('bandage'),true);assert.equal(sim.craft('bandage'),false);
 for(let i=0;i<35;i++)sim.tick(.1);assert.equal(sim.inventory.count('rag'),0);assert.equal(sim.inventory.count('bandage'),3);
});
test('attack cannot cross wall and cooldown prevents spam',()=>{
 const w=fixture(),s=newState([2.7,3.5,0]),sim=new Simulation(w,s);s.spawned={'0,0,0':true};s.zombies=[{x:3.5,y:3.5,z:0,hp:70}];w.square(3,3).tiles.push('wall');
 sim.attack();assert.equal(s.zombies[0].hp,70);assert.equal(sim.attack(),false);
});
test('save roundtrip preserves changes and inventory; malformed input rejected',()=>{
 const w=fixture(),s=newState([7976.5,11402.5,0]),sim=new Simulation(w,s);w.change(7977,11402,0,'door',{open:true});
 const loaded=parseSave(sim.serialize());assert.equal(loaded.changes['7977,11402,0:door'].open,true);assert.deepEqual(loaded.inventory,s.inventory);
 assert.throws(()=>parseSave('{"version":88}'));loaded.player.hp=null;assert.throws(()=>parseSave(JSON.stringify(loaded)));
});
test('legacy counts migrate once into distinct instances without losing world-container contents',()=>{const old=newState([7976.5,11402.5,0]);delete old.inventory;old.version=1;old.bag={water:2,bat:1};old.containers={cupboard:{beans:3}};const migrated=parseSave(JSON.stringify(old));assert.equal(migrated.version,2);assert.equal(Object.keys(migrated.inventory.items).length,6);assert.equal(migrated.inventory.containers['world:cupboard'].items.length,3);assert.ok(Object.values(migrated.inventory.items).filter(i=>i.type==='Base.WaterBottle').every(i=>i.fluid.amount===1));assert.deepEqual(parseSave(JSON.stringify(migrated)),migrated);old.bag.water=-1;assert.throws(()=>parseSave(JSON.stringify(old)));});

test('wall endpoints cannot trap the footprint; older overlapping saves can retreat',()=>{
 const w=fixture();w.square(3,3).tiles.push('wall');
 const actor={x:2.820184929319,y:2.7,z:0};w.move(actor,0,.7);
 assert.ok(actor.y<2.83,'the body cannot straddle the wall endpoint');
 const oldSave={x:2.820184929319,y:3.445109437227,z:0};
 assert.equal(w.move(oldSave,-.5,0),true);assert.ok(oldSave.x<2.5,'can move away from an existing overlap');
 const crossing={x:2.5,y:3.5,z:0};w.move(crossing,1,0);assert.ok(crossing.x<=2.82,'wall still blocks crossing');
});

test('time acceleration returns to normal when walking or danger approaches',()=>{
 const w=fixture(),s=newState([2.5,2.5,0]),sim=new Simulation(w,s);
 sim.speed=120;sim.tick(.1,{x:1,y:0});assert.equal(sim.speed,1);assert.ok(s.player.x<2.7);
 sim.speed=120;s.zombies.push({id:'near',x:4,y:4,z:0,hp:100,cooldown:1,alert:0});sim.tick(.1);assert.equal(sim.speed,1);
});

test('curated occupancy cupboards stay empty unless explicitly stocked; previous saves retain their stock',()=>{
 const w=fixture(),state=newState([2.5,2.5,0]);
 const sim=new Simulation(w,state),obj={id:'curated-cupboard',name:'Cupboard',props:{container:'counter'}};
 state.housePlan={deterministicContainers:true};
 const id=sim.container(obj);assert.equal(sim.inventory.list(id).length,0);
 sim.inventory.create('opener',id);assert.equal(sim.container(obj),id);assert.equal(sim.inventory.list(id).length,1);
});

function bedroom(){const w=fixture();w.properties.bed={BedType:'goodBed'};w.square(3,2).tiles.push('bed');const sim=new Simulation(w,newState([2.5,2.5,0]));return {sim,bed:w.interactions(sim.state.player).find(o=>o.type==='bed')};}
test('overnight sleep advances the ordinary clock and needs continuously, without skipping a night on completion',()=>{
 const {sim,bed}=bedroom();sim.state.player.fatigue=80;const start=sim.state.time;sim.interact(bed,'sleep');assert.ok(sim.action.rest);
 sim.tick(.1);assert.ok(sim.state.time>start&&sim.state.time<start+10);assert.ok(sim.state.player.hunger>5);
 for(let i=0;i<100&&sim.action;i++)sim.tick(.1);
 assert.equal(sim.action,null);assert.ok(Math.abs(sim.state.time-start-480)<.001);assert.equal(sim.speed,1);assert.ok(sim.state.player.fatigue<5);assert.ok(sim.state.player.thirst>20);
});
test('moving interrupts sleep and urgent thirst wakes the resident at normal speed',()=>{
 const {sim,bed}=bedroom();sim.interact(bed,'sleep');sim.tick(.1,{x:1,y:0});assert.equal(sim.action,null);assert.equal(sim.speed,1);
 sim.state.player.x=2.5;sim.state.player.y=2.5;sim.interact(bed,'sleep');sim.state.player.thirst=86;sim.tick(.1);assert.equal(sim.action,null);assert.equal(sim.speed,1);assert.match(sim.state.journal[0],/food or water/);
});

 test('daytime acceleration stops on urgent needs without resetting or satisfying them',()=>{
 for(const need of ['hunger','thirst']){
  const s=newState([2.5,2.5,0]),sim=new Simulation(fixture(),s,null,{spawnZombies:false});s.player[need]=84.99;sim.speed=120;
  const before=s.time;sim.tick(.1);assert.equal(sim.speed,1);assert.ok(s.player[need]>=85&&s.player[need]<85.4);assert.ok(s.time>before);assert.equal(s.player.hp,100);
  assert.match(sim.events.at(-1),/Time returned to normal/);const count=sim.events.length,after=s.time;
  sim.tick(.1);assert.ok(s.time-after<.1);assert.equal(sim.events.length,count,'do not repeat warnings every frame');
  sim.speed=120;const current=s.time;sim.tick(.1);assert.equal(sim.speed,1);assert.ok(s.time-current<.1,'critical needs reject re-entering acceleration');
 }
 });
 test('addressing needs permits normal time acceleration again',()=>{
 const s=newState([2.5,2.5,0]),sim=new Simulation(fixture(),s,null,{spawnZombies:false});s.player.thirst=86;sim.speed=20;sim.tick(.1);assert.equal(sim.speed,1);
 s.player.thirst=20;sim.speed=20;const before=s.time;sim.tick(.1);assert.equal(sim.speed,20);assert.ok(Math.abs(s.time-before-1.4)<1e-8);
 });
