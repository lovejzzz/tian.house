import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {counterRotationTrack,deferredRotationSampler} from '../src/deferred-animation.js';
import {counterRotateBone,deferredRotationZ} from '../src/turning.js';

test('counter rotation matches source helper sample and preserves the world pose when motion moves to the actor',()=>{
 const q=[-.65487456,-.20151417,-.18768416,-.7037804];
 const expected=[.47465348,.4941384,.5057937,.5241222],actual=counterRotateBone(q);
 actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-6));
 const matrix=(angle,value)=>new THREE.Matrix4().makeRotationY(-angle).multiply(new THREE.Matrix4().makeScale(1,1,-1)).multiply(new THREE.Matrix4().makeRotationX(-Math.PI/2)).multiply(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(...value)));
 const raw=matrix(.7,q),counter=matrix(.7+deferredRotationZ(q)-Math.PI/2,actual);
 raw.elements.forEach((v,i)=>assert.ok(Math.abs(v-counter.elements[i])<3e-6));
});
test('counter transform occurs after interpolation and samples do not accumulate the correction',()=>{
 const values=[-.65487456,-.20151417,-.18768416,-.7037804,-.66328704,-.16991201,-.15859702,-.7113559];
 const raw=new THREE.QuaternionKeyframeTrack('q',[0,1],values).createInterpolant();
 const transformed=counterRotationTrack('q',[0,1],values).createInterpolant();
 for(const time of [.5,.5,1,0,.25]){
  const expected=counterRotateBone(raw.evaluate(time));
  [...transformed.evaluate(time)].forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-7));
 }
});
test('looped rotation samples keep cumulative motion across the clip boundary',()=>{
 const angles=[Math.PI/2,Math.PI,Math.PI*1.5],values=angles.map(a=>[-Math.cos(a/2),0,0,Math.sin(a/2)]);
 const sample=deferredRotationSampler({times:[0,.5,1],values});
 assert.ok(Math.abs(sample(.5)-Math.PI/2)<2e-6);
 assert.ok(Math.abs(sample(0,1)-Math.PI)<2e-6);
 assert.ok(Math.abs(sample(.5,1)-Math.PI*1.5)<2e-6);
});
