import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {armElbow} from '../src/hand-rinse-pose.js';
const v=(...p)=>new THREE.Vector3(...p);
test('two-link rinse pose meets reachable wrist target without changing limb lengths',()=>{
 for(const target of [v(.3,.2,-.25),v(-.25,.3,-.3),v(.01,0,-.2)]){
  const start=v(0,0,0),r=armElbow(start,target,v(.4,0,-.5),.31,.27);
  assert.equal(r.reachable,true);assert.ok(r.wrist.distanceTo(target)<1e-8);
  assert.ok(Math.abs(r.elbow.distanceTo(start)-.31)<1e-8);assert.ok(Math.abs(r.elbow.distanceTo(r.wrist)-.27)<1e-8);
 }
});
test('unreachable and degenerate targets never stretch arms or produce NaN',()=>{
 const r=armElbow(v(0,0,0),v(0,0,4),v(0,0,-1),.3,.3);assert.equal(r.reachable,false);
 assert.ok(r.wrist.length()<.6);assert.ok(r.elbow.toArray().every(Number.isFinite));
 assert.equal(armElbow(v(0,0,0),v(0,0,0),v(0,0,1),.3,.3),null);
});

test('independent clothing and body rigs receive the same pose',async()=>{
 const {applyHandRinsePose}=await import('../src/hand-rinse-pose.js');const root=new THREE.Group(),uppers=[];
 for(let i=0;i<2;i++){const rig=new THREE.Group(),upper=new THREE.Bone(),fore=new THREE.Bone(),hand=new THREE.Bone();upper.name='Bip01_L_UpperArm';fore.name='Bip01_L_Forearm';hand.name='Bip01_L_Hand';fore.position.set(.3,0,0);hand.position.set(.3,0,0);root.add(rig);rig.add(upper);upper.add(fore);fore.add(hand);uppers.push(upper);}
 applyHandRinsePose(root,{point:[0,.4,-.2],forward:[0,1,0]},1);
 assert.ok(uppers[0].quaternion.angleTo(new THREE.Quaternion())>.1);
 assert.ok(uppers[0].quaternion.angleTo(uppers[1].quaternion)<1e-7);
});
