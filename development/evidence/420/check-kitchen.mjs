import fs from 'node:fs';import assert from 'node:assert/strict';
import {readVolume} from '../../tests/helpers/volume-delivery.mjs';
import {sceneFurnitureVolumes} from '../../src/scene-furniture-volumes.js';
import {VolumeGameSession} from '../../src/volume-game-session.js';
import {World} from '../../src/world.js';import {Simulation,newState} from '../../src/simulation.js';
import {useFixtureCatalog} from '../../tests/fixtures/catalog.mjs';useFixtureCatalog();
const props=JSON.parse(fs.readFileSync(new URL('../../private-assets/world/properties.json',import.meta.url)));
for(const name of ['counter','kitchen-sink','oven','fridge']){
 const asset=readVolume(name);
 for(const facing of ['N','E','S','W']){
 const scene={levels:[{id:'g',index:0}],objects:[{id:name,levelId:'g',x:4,y:4,parts:asset.recipe.sourceLayout[facing]}]};
 const mesh=sceneFurnitureVolumes(scene,{squares:[]},props,asset,{cellSize:1,storeyHeight:3});
 const vs=mesh.flatMap(p=>p.vertices),axis=['N','S'].includes(facing)?1:0;
 const back=['N','E'].includes(facing)?5-Math.max(...vs.map(v=>v[axis])):Math.min(...vs.map(v=>v[axis]))-4;
 assert.ok(back>=.1-1e-8,`${name} ${facing} intersects centred .20m wall: ${back}`);
 }
}
const bounds=[0,0,20,20],tile='fixtures_sinks_01_8',floor='floors_interior_tilesandwood_01_44';
const original=new Simulation(new World({spawn:[3.5,4.5,0],playableBounds:bounds},props),newState([3.5,4.5,0]));
const plan={version:1,name:'Kitchen functional check',squares:[{x:4,y:4,z:0,tiles:[floor,tile]},{x:3,y:4,z:0,tiles:[floor]}],items:[],vehicles:[]};
const scene={levels:[{id:'g',index:0}],rooms:[],objects:[],walls:[],openings:[]};
const game=new VolumeGameSession(original,plan,bounds,{regions:{[floor]:{},[tile]:{}}},scene),pos=[3.5,4.5,.901],sim=game.session.sim;
sim.state.player.thirst=60;const fixture=game.facilities(pos).find(f=>f.tile===tile);assert.equal(fixture.type,'water');
assert.equal(game.useFacility(fixture.id,'drink',[15,15,.901]).ok,false);
assert.equal(game.useFacility(fixture.id,'drink',pos).ok,true);
for(let i=0;i<1000&&sim.action;i++)game.tick(.05,pos);
assert.equal(sim.action,null);assert.ok(sim.state.player.thirst<1);
console.log('PASS: four-direction wall clearance for four kitchen families; original Chrome Sink water interaction, reach rejection and timed drinking completion. This is a replay, not a browser walk or residence acceptance.');
