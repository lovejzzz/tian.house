import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {wallFadeAmount,createWallCutaway} from '../src/volume-wall-cutaway.js';
import {visiblePickMeshes} from '../src/volume-roof-cutaway.js';
test('front wall planes fade coherently while rear planes and same-side walls remain solid',()=>{
 const camera=[5,-8,5],focus=[5,4,1];
 assert.equal(wallFadeAmount([0,0],[1,0],camera,focus),1);
 assert.equal(wallFadeAmount([8,0],[9,0],camera,focus),1);
 assert.equal(wallFadeAmount([0,8],[9,8],camera,focus),0);
 assert.equal(wallFadeAmount([0,0],[9,0],[5,2,5],focus),0);
 assert.ok(wallFadeAmount([0,0],[9,0],camera,[5,.1,1])<1);
 assert.equal(wallFadeAmount([0,0],[2,2],[-2,2,3],[2,-2,1]),1);
});
test('wall, door and mounted furniture fade together; collision and cast shadows stay intact',()=>{
 const source={walls:[{id:'w',axis:'N',x:0,y:0}],openings:[{id:'door',hostWallId:'w'}],objects:[{id:'art',wallMounts:[{wallId:'w'}]}]};
 const make=data=>{const m=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());m.userData=data;m.castShadow=true;return m;};
 const meshes=[make({structureId:'w'}),make({openingId:'door'}),make({objectId:'art'}),make({objectId:'chair'})];
 const geometry=meshes.map(m=>m.geometry),controller=createWallCutaway(source,{cellSize:1},meshes);
 controller.update([.5,-4,3],[.5,2,1],.05,true);assert.ok(meshes[0].material.opacity>0.03&&meshes[0].material.opacity<1);
 for(let i=0;i<40;i++)controller.update([.5,-4,3],[.5,2,1],.05,true);
 for(const m of meshes.slice(0,3)){assert.ok(Math.abs(m.material.opacity-.03)<1e-9);assert.equal(m.castShadow,true);assert.equal(m.visible,true);}
 assert.equal(meshes[3].material.opacity,1);assert.deepEqual(visiblePickMeshes(meshes),[meshes[3]]);
 for(let i=0;i<40;i++)controller.update([.5,-4,3],[.5,2,1],.05,false);
 assert.ok(meshes.every(m=>m.material.opacity===1&&m.material.depthWrite));assert.deepEqual(meshes.map(m=>m.geometry),geometry);
});
