import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPianoPractice} from '../src/piano-practice.js';
import {createPianoKeyMotion} from '../src/piano-key-motion.js';
import {pianoPartMidi} from '../src/piano.js';
import {batchVolumeObjectMeshes} from '../src/volume-render-batching.js';
import {applyPianoPose} from '../src/piano-pose.js';
test('mirrored skeleton naming cannot cross the hands over opposite keyboard zones',()=>{
 for(const mirror of [1,-1]){
  const root=new THREE.Group(),hands=[];
  for(const [name,side]of [['L',-1],['R',1]]){const upper=new THREE.Bone(),fore=new THREE.Bone(),hand=new THREE.Bone();upper.name=`Bip01_${name}_UpperArm`;fore.name=`Bip01_${name}_Forearm`;hand.name=`Bip01_${name}_Hand`;upper.position.set(side*mirror*.18,0,1.05);fore.position.z=-.25;hand.position.z=-.25;upper.add(fore);fore.add(hand);root.add(upper);hands.push({hand,side:side*mirror});}
  applyPianoPose(root,{elapsed:1,targets:[{point:[-.12,.35,.75]},{point:[.12,.35,.75]}]},[0,1,0]);
  for(const {hand,side}of hands){const p=hand.getWorldPosition(new THREE.Vector3());assert.ok(p.x*side>0);assert.ok(p.y>.3);}
 }
});
test('practice survives its panel, follows audio time and stops when seated action is cancelled',async()=>{
 let callback=null;const audio={currentTime:0,async unlock(){},play(){},stop(){},async close(){}},sim={action:null,log(){}},game={session:{sim},sitAtPiano(){sim.action={rest:{pianoObjectId:'p'}};return {ok:true};}};
 const practice=createPianoPractice(()=>game,{audio,schedule:fn=>(callback=fn,1),unschedule:()=>callback=null});
 assert.equal((await practice.start('p',[0,0,0],60)).ok,true);audio.currentTime=.1;callback();assert.deepEqual(sim.action.piano.notes,[48,60]);
 sim.action=null;callback();assert.equal(callback,null);practice.dispose();
});
test('stop during audio unlock cannot resurrect practice',async()=>{
 let unlock;const audio={currentTime:0,unlock:()=>new Promise(resolve=>unlock=resolve),stop(){},async close(){}},sim={},game={session:{sim},sitAtPiano(){sim.action={rest:{pianoObjectId:'p'}};return {ok:true};}};
 const practice=createPianoPractice(()=>game,{audio,schedule:()=>assert.fail('interrupted start scheduled audio')});const pending=practice.start('p',[],60);practice.stop();unlock();assert.equal((await pending).ok,false);assert.equal(sim.action.piano,undefined);
});
test('physical pitch mapping is complete and dynamic keys cannot batch together',()=>{
 assert.equal(pianoPartMidi.size,88);assert.equal(new Set(pianoPartMidi.values()).size,88);assert.equal(pianoPartMidi.get('white-key:0'),21);assert.equal(pianoPartMidi.get('black-key:0'),22);
 const group=new THREE.Group();for(const midi of [48,60]){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.02,.2,.014).toNonIndexed(),new THREE.MeshStandardMaterial());mesh.userData={objectId:'p',pianoMidi:midi};mesh.position.set(midi/100,0,.76);group.add(mesh);}
 assert.equal(batchVolumeObjectMeshes(group).removed,0);const motion=createPianoKeyMotion(group);motion.rebuild();const targets=motion.update({objectId:'p',notes:[60]},.1);assert.equal(targets[0].midi,60);assert.ok(group.children[1].position.z<.76);assert.equal(group.children[0].position.z,.76);motion.reset();assert.equal(group.children[1].position.z,.76);
});
test('released keys settle exactly and idle frames never write resting transforms',()=>{
 const group=new THREE.Group();
 for(const id of ['a','b']){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.02,.2,.014),new THREE.MeshStandardMaterial());mesh.userData={objectId:id,pianoMidi:60};mesh.position.z=.76;group.add(mesh);}
 const motion=createPianoKeyMotion(group);motion.rebuild();
 let writes=0;for(const mesh of group.children){let z=mesh.position.z;Object.defineProperty(mesh.position,'z',{get:()=>z,set:v=>{writes++;z=v;},configurable:true});}
 motion.update(null,.016);assert.equal(writes,0);
 motion.update({objectId:'a',notes:[60]},.1);assert.ok(group.children[0].position.z<.76);assert.equal(group.children[1].position.z,.76);
 for(let i=0;i<60;i++)motion.update(null,1/60);
 assert.equal(group.children[0].position.z,.76);const settled=writes;motion.update(null,.016);assert.equal(writes,settled);
 motion.update({objectId:'b',notes:[60]},.1);motion.rebuild();assert.equal(group.children[1].position.z,.76);
 motion.update({objectId:'a',notes:[60]},.1);motion.reset();assert.equal(group.children[0].position.z,.76);
});
test('dynamic key batches preserve geometry, independent pitches and exact release',async()=>{
 const {batchPianoKeyMeshes}=await import('../src/volume-render-batching.js');
 const group=new THREE.Group();
 for(const midi of [48,60,61]){const m=new THREE.Mesh(new THREE.BoxGeometry(.02,.2,.014).toNonIndexed(),new THREE.MeshStandardMaterial({color:midi===61?0x111111:0xffffff}));m.position.set(midi/100,0,.76);m.userData={objectId:'p',pianoMidi:midi};m.castShadow=true;group.add(m);}
 const original=group.children.flatMap(m=>{const a=m.geometry.attributes.position;return Array.from({length:a.count},(_,i)=>[a.getX(i)+m.position.x,a.getY(i)+m.position.y,a.getZ(i)+m.position.z]);});
 assert.equal(batchPianoKeyMeshes(group).removed,1);assert.equal(group.children.length,2);
 const batch=group.children.find(m=>m.userData.pianoKeyParts),attr=batch.geometry.attributes.position,rest=attr.array.slice();
 const actual=group.children.flatMap(m=>{const a=m.geometry.attributes.position;return Array.from({length:a.count},(_,i)=>[a.getX(i)+m.position.x,a.getY(i)+m.position.y,a.getZ(i)+m.position.z]);});
 for(let i=0;i<original.length;i++)for(let j=0;j<3;j++)assert.ok(Math.abs(original[i][j]-actual[i][j])<1e-7);
 const motion=createPianoKeyMotion(group);motion.rebuild();const result=motion.update({objectId:'p',notes:[60,61]},.1);
 assert.deepEqual(result.map(t=>t.midi),[60,61]);assert.ok(result[0].point[2]<.767);assert.equal(attr.getZ(0),rest[2]);assert.ok(attr.getZ(36)<rest[36*3+2]);
 motion.reset();assert.deepEqual(attr.array,rest);assert.equal(group.children.find(m=>!m.userData.pianoKeyParts).position.z,.76);
});
