import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {televisionDiffuseTransfer,prepareTelevisionDiffuseTransfer} from '../src/television-diffuse-transfer.js';
function plane(colour=0xffffff){const m=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:colour}));m.userData.baseColor=colour;return m;}
const patches=[{position:[0,0,2],normal:[0,0,-1],intensity:30}],regions=[{position:[0,0,1]}];
test('single-bounce transfer is linear in decoded colour, black adds no light, material changes reflected colour',()=>{
 const transfer=televisionDiffuseTransfer(patches,regions,[plane()]);assert.ok(transfer.stats.visiblePaths>0);
 const white=transfer.sample([[1,1,1]]),red=transfer.sample([[1,0,0]]),dim=transfer.sample([[.5,0,0]]),black=transfer.sample([[0,0,0]]);
 assert.ok(white[0].x>0);for(let i=0;i<9;i++){assert.equal(red[i].y,0);assert.equal(red[i].z,0);assert.equal(dim[i].x,red[i].x*.5);assert.deepEqual(black[i].toArray(),[0,0,0]);}
 const coloured=televisionDiffuseTransfer(patches,regions,[plane(0xff0000)]).sample([[1,1,1]]);assert.ok(coloured[0].x>0);assert.equal(coloured[0].y,0);
});
test('opaque barrier blocks source-to-surface-to-probe paths even when visually cut away',()=>{
 const blocker=new THREE.Mesh(new THREE.BoxGeometry(20,20,.1),new THREE.MeshStandardMaterial({color:0xffffff}));blocker.position.z=.5;blocker.material.opacity=.08;blocker.userData.furnitureCutaway={opacity:1};
 const transfer=televisionDiffuseTransfer(patches,[{position:[0,0,.2]}],[plane(),blocker]);assert.equal(transfer.stats.visiblePaths,0);assert.ok(transfer.sample([[1,1,1]]).every(v=>v.length()===0));
});

test('incremental transfer matches synchronous transport and cancels stale work',async()=>{
 let frames=0;const meshes=[plane()],expected=televisionDiffuseTransfer(patches,regions,meshes).sample([[.2,.4,.8]]);
 const result=await prepareTelevisionDiffuseTransfer(patches,regions,meshes,{yieldFrame:async()=>{frames++;}});
 assert.ok(frames>=16);assert.deepEqual(result.sample([[.2,.4,.8]]),expected);
 let cancelled=false;const stopped=await prepareTelevisionDiffuseTransfer(patches,regions,meshes,{cancelled:()=>cancelled,yieldFrame:async()=>{cancelled=true;}});assert.equal(stopped,null);
});
