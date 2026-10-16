import test from 'node:test';
import assert from 'node:assert/strict';
import {VolumeGameSpatial} from '../src/volume-game-spatial.js';
import {openingVolume} from '../src/opening-volume.js';
import {wallVolume} from '../src/wall-volume.js';
import {World} from '../src/world.js';
import {Simulation,newState} from '../src/simulation.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
const metrics={cellSize:1,storeyHeight:3};
test('compiled partition blocks NPC motion and attacks; removing it restores both',()=>{
 const spatial=new VolumeGameSpatial(metrics),wall=wallVolume({id:'partition',a:[0,0],b:[5,0],height:3,thickness:.2});spatial.setVolumes([wall]);
 const a={x:2,y:-.6,z:0},b={x:2,y:.6,z:0};assert.equal(spatial.clearAttack(a,b),false);
 spatial.move(b,0,-2);assert.ok(b.y>.34999);
 assert.equal(spatial.clearAttack({...a,z:1},{...b,z:1}),true);
 spatial.setVolumes([]);assert.equal(spatial.clearAttack(a,b),true);spatial.move(b,0,-2);assert.ok(b.y<0);
});
test('simulation melee cannot damage an enemy through physical geometry absent from legacy line check',()=>{
 const world=new World({spawn:[2,-.6,0],playableBounds:[-10,-10,10,10]},{}),sim=new Simulation(world,newState([2,-.6,0]),null,{spawnZombies:false});
 world.lineClear=()=>true;world.move=()=>assert.fail('3D combat must use physical knockback');
 sim.state.player.angle=Math.PI/2;sim.state.zombies=[{id:'z',x:2,y:.6,z:0,hp:70,angle:0}];
 const spatial=new VolumeGameSpatial(metrics);spatial.setVolumes([wallVolume({id:'w',a:[0,0],b:[5,0],height:3,thickness:.2})]);
 sim.attack(spatial);assert.equal(sim.state.zombies[0].hp,70);
 sim.attackCooldown=0;spatial.setVolumes([]);sim.attack(spatial);assert.ok(sim.state.zombies[0].hp<70);assert.ok(sim.state.zombies[0].y>.6);
});
test('pursuing enemy uses the physical wall and cannot injure through it',()=>{
 const world=new World({spawn:[2,-.6,0],playableBounds:[-10,-10,10,10]},{}),sim=new Simulation(world,newState([2,-.6,0]),null,{spawnZombies:false});
 world.lineClear=()=>true;world.move=()=>assert.fail('NPC movement must use physical geometry');
 sim.state.zombies=[{id:'z',x:2,y:.6,z:0,hp:70,angle:0,cooldown:0,alert:8}];
 const spatial=new VolumeGameSpatial(metrics);spatial.setVolumes([wallVolume({id:'w',a:[0,0],b:[5,0],height:3,thickness:.2})]);
 for(let i=0;i<40;i++)sim.tick(.1,{}, {moved:false,spatial});
 assert.ok(sim.state.zombies[0].y>.34999);assert.equal(sim.state.player.hp,100);assert.equal(sim.state.player.bleeding,0);
});

 test('eye-height vision sees through glass but not opaque walls or closed door leaves',()=>{
 const spatial=new VolumeGameSpatial(metrics),a={x:2,y:-1,z:0},b={x:2,y:1,z:0};
 const wall=wallVolume({id:'w',a:[0,0],b:[4,0],height:3,thickness:.2,opening:[1,0,3,2.4]});
 const door=angle=>openingVolume({id:'door',a:[0,0],b:[4,0],base:0,aperture:[1,0,3,2.4],kind:'door',frameWidth:.05,frameDepth:.1,panelDepth:.035,angle});
 spatial.setVolumes([wall,...door(0)]);assert.equal(spatial.clearSight(a,b),false);
 spatial.setVolumes([wall,...door(Math.PI/2)]);assert.equal(spatial.clearSight(a,b),true);
 const glass=openingVolume({id:'window',a:[0,0],b:[4,0],base:0,aperture:[1,.8,3,2.4],kind:'window',frameWidth:.05,frameDepth:.1,panelDepth:.008});
 spatial.setVolumes([wall,...glass]);assert.equal(spatial.clearSight(a,b),true);assert.equal(spatial.clearAttack(a,b),false);
 spatial.setVolumes([wallVolume({id:'low',a:[0,0],b:[4,0],height:1.2,thickness:.2})]);
 assert.equal(spatial.clearSight(a,b),true);assert.equal(spatial.clearAttack(a,b),false);
 });
 test('physical visibility governs detection and lost sight lets alert expire',()=>{
 const world=new World({spawn:[2,-2,0],playableBounds:[-10,-10,10,10]},{}),sim=new Simulation(world,newState([2,-2,0]),null,{spawnZombies:false});
 world.lineClear=()=>true;
 const spatial=new VolumeGameSpatial(metrics),wall=wallVolume({id:'w',a:[-10,0],b:[10,0],height:3,thickness:.2});
 const z={id:'z',x:2,y:2,z:0,hp:70,angle:0,cooldown:0,alert:0};sim.state.zombies=[z];spatial.setVolumes([wall]);
 sim.tick(.1,{}, {moved:false,spatial});assert.equal(z.alert,0);
 spatial.setVolumes([]);world.lineClear=()=>false;sim.tick(.1,{}, {moved:false,spatial});assert.equal(z.alert,8,'physical open sight must not be vetoed by obsolete tile geometry');
 spatial.setVolumes([wall]);for(let i=0;i<81;i++)sim.tick(.1,{}, {moved:false,spatial});
 assert.equal(z.alert,0);assert.equal(z.moving,false);assert.equal(sim.state.player.hp,100);
 });
