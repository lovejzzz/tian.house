import test from 'node:test';import assert from 'node:assert/strict';import {withinFixtureWorkFace} from '../src/fixture-work-face.js';
test('sink use requires working side within reach under every cardinal rotation',()=>{
 for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
  const rotate=([x,y,z=0])=>[10+x*Math.cos(angle)-y*Math.sin(angle),20+x*Math.sin(angle)+y*Math.cos(angle),z];
  const zone={point:rotate([0,0]),forward:[-Math.sin(angle),Math.cos(angle),0],width:.8};
  assert.equal(withinFixtureWorkFace(zone,rotate([0,.45,.9])),true);
  for(const p of [[0,-.3],[0,0],[0,1.2],[1,.4]])assert.equal(withinFixtureWorkFace(zone,rotate(p)),false);
 }
});
