import test from 'node:test';import assert from 'node:assert/strict';
import {fixtureSeatContact} from '../src/fixture-seat-contact.js';
test('rigid seat blends into authored contact without deforming the fixture or leaking into flush',()=>{
 const seat={point:[2,3,.475],forward:[0,-1,0],bounds:[[1,2,.45],[2,3,.475]]},action={duration:20,left:20,toilet:{kind:'useToilet',seat}},before=structuredClone(seat);
 assert.equal(fixtureSeatContact(action).amount,0);action.left=19.75;assert.equal(fixtureSeatContact(action).amount,.5);action.left=19;assert.equal(fixtureSeatContact(action).amount,1);assert.deepEqual(seat,before);
 action.toilet.kind='flushToilet';assert.equal(fixtureSeatContact(action),null);assert.equal(fixtureSeatContact(null),null);
});
import {readVolume} from './helpers/volume-delivery.mjs';
import {sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';
import {withinFixtureWorkFace} from '../src/fixture-work-face.js';
test('every toilet orientation exposes a front approach and contact at the actual seat height',()=>{
 const asset=readVolume('toilet');for(const parts of Object.values(asset.recipe.sourceLayout)){
  const scene={levels:[{id:'up',index:1}],objects:[{id:'wc',levelId:'up',x:10,y:20,parts}]},volumes=sceneFurnitureVolumes(scene,{squares:[]},{},asset,{cellSize:1,storeyHeight:3});
  const zone=volumes.find(v=>v.fixtureUse)?.fixtureUse;assert.equal(zone.kind,'toilet');const seat=volumes.filter(v=>v.id.startsWith('furniture:wc:seat'));assert.ok(seat.length);
  assert.ok(Math.abs(zone.seat.point[2]-Math.max(...seat.flatMap(v=>v.vertices.map(p=>p[2]))))<1e-8);
  assert.ok(withinFixtureWorkFace(zone,zone.point.map((v,i)=>v+zone.forward[i]*.4)));
  assert.equal(withinFixtureWorkFace(zone,zone.point.map((v,i)=>v-zone.forward[i]*.4)),false);
 }
});
