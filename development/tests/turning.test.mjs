import test from 'node:test';
import assert from 'node:assert/strict';
import {interpolateBodyAngle,deferredRotationZ,unwrapDeferredRotations} from '../src/turning.js';

test('deferred rotation preserves direction through the pi boundary and quaternion sign changes',()=>{
 const q=angle=>[0,0,Math.sin(angle/2),Math.cos(angle/2)];
 const keys=[0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2].map(q);
 const angles=unwrapDeferredRotations(keys);
 assert.ok(Math.abs(angles.at(-1)-2*Math.PI)<2e-6);
 for(let i=0;i<keys.length;i++)assert.ok(Math.abs(deferredRotationZ(keys[i])-deferredRotationZ(keys[i].map(v=>-v)))<1e-6);
 assert.ok(Math.abs(unwrapDeferredRotations(keys.toReversed()).at(-1)+2*Math.PI)<2e-6);
});

test('body rotation matches installed source samples, including wrap, overshoot and opposing root rotation',()=>{
 // Recorded from TurningProbe against pinned 42.21.0. These are component
 // observations with supplied animation inputs, not game-level turn timings.
 const samples=[
  [0,0,.03,0,-.2,0,0],
  [0,3.1415927,.03,0,-.2,-.024,-3.117593],
  [0,3.1415927,.15,.5,-.2,-.16,-2.981593],
  [0,-3.1415927,.03,.5,.2,.088,3.053593],
  [-3.13,3.1415927,.03,0,-.2,3.1415927,0],
  [3.13,-3.1415927,.03,0,-.2,-3.1415927,0],
  [.73,0,.03,0,-.2,.70600003,-.7060001],
  [.73,.7305,.03,0,-.2,.7305,0],
 ];
 for(const [angle,target,step,weight,deferred,expected,twist] of samples){
  const actual=interpolateBodyAngle({angle,target,step,scale:.8,weight,deferred});
  assert.ok(Math.abs(actual.angle-expected)<1e-6,JSON.stringify({angle,target,actual,expected}));
  assert.ok(Math.abs(actual.twist-twist)<1e-6);
 }
});
