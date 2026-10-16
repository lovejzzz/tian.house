import {readVolume} from './helpers/volume-delivery.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import * as THREE from 'three';
import {lampVolume} from '../src/lamp-volume.js';import {sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';import {createVolumeFixtureLights} from '../src/volume-fixture-lights.js';
const asset=readVolume('lamp');
test('lamp delivery retains open shade and source dimensions',()=>{
 assert.deepEqual(asset.geometry,JSON.parse(JSON.stringify(lampVolume(asset.recipe))));const shade=asset.geometry.parts.find(p=>p.id==='shade');assert.equal(shade.doubleSided,true);assert.equal(shade.indices.length,asset.recipe.parameters.segments*6);assert.equal(shade.collision.length,0);assert.ok(asset.geometry.light.position[2]<asset.recipe.parameters.shadeBottom);
 assert.throws(()=>lampVolume({...asset.recipe,parameters:{...asset.recipe.parameters,shadeBottom:2}}),/dimensions/);
});
test('mounted light follows host surface, raised ground, floor and object movement without scene mutation',()=>{
 const table=readVolume('table'),assets=[table,asset];
 const scene={levels:[{id:'upper',index:1}],objects:[{id:'desk',x:10,y:20,levelId:'upper',parts:table.recipe.sourceLayout.S},{id:'lamp',hostId:'desk',x:10,y:20,levelId:'upper',parts:[{tile:'tian_detail_lamp',dx:0,dy:0}]}]},original=structuredClone(scene),props={carpentry_01_32:{IsTable:'',Surface:'34'},raised:{solidfloor:'',TianGroundHeight:'8'}},plan={squares:[{x:10,y:20,z:1,tiles:['raised']}]},metrics={cellSize:1,storeyHeight:3};
 const meshes=sceneFurnitureVolumes(scene,plan,props,assets,metrics).filter(m=>m.objectId==='lamp');assert.equal(meshes.length,4);assert.equal(Math.min(...meshes.flatMap(p=>p.vertices.map(v=>v[2]))),3+.25+34/32);assert.equal(meshes[0].light.position[0],10.5);assert.deepEqual(scene,original);
 scene.objects[1].hostId='missing';assert.equal(sceneFurnitureVolumes(scene,plan,props,assets,metrics).filter(m=>m.objectId==='lamp').length,0);
 scene.objects=original.objects.map(o=>({...o,x:o.x+2}));const moved=sceneFurnitureVolumes(scene,{squares:[]},props,assets,metrics).filter(m=>m.objectId==='lamp');assert.equal(moved[0].light.position[0],12.5);
});
test('fixture lighting has real shadow-casting sources, level filtering, persistent switch and cleanup',()=>{
 const scene=new THREE.Scene(),rig=createVolumeFixtureLights(scene),volume={levelId:'g',objectId:'lamp',light:asset.geometry.light};rig.rebuild([volume],'g');const light=scene.children.find(o=>o.isSpotLight);assert.ok(light?.castShadow);assert.ok(light.intensity>0);assert.deepEqual(light.position.toArray(),asset.geometry.light.position.map((v,i)=>v+asset.geometry.light.samples[0][i]));
 const samples=scene.children.filter(o=>o.isSpotLight);assert.equal(samples.length,4);assert.equal(samples.reduce((s,l)=>s+l.intensity,0),asset.geometry.light.intensity);
 const material=new THREE.MeshStandardMaterial();rig.bindMaterial(material,{color:0xffcc99,intensity:.22});assert.equal(material.emissiveIntensity,.22);
 rig.setEnabled(false);assert.equal(light.intensity,0);assert.equal(light.visible,true);assert.equal(material.emissiveIntensity,0);rig.setEnabled(true);assert.equal(material.emissiveIntensity,.22);rig.setEnabled(false);rig.rebuild([volume],'g');assert.equal(scene.children.find(o=>o.isSpotLight).intensity,0);rig.rebuild([volume],'upper');assert.equal(scene.children.length,0);rig.rebuild([volume],'g');rig.dispose();assert.equal(scene.children.length,0);
});

test('asymmetric emitter samples rotate with furniture in all directions without inheriting translation',()=>{
 // Synthetic directional fixture isolates the transform contract, not catalogue art coverage.
 const directional=structuredClone(asset);directional.geometry.additionalLights=[]; // isolate this synthetic two-sample emitter
 directional.recipe.semantics.mount='floor';directional.recipe.placement={cells:[1,1],offset:[.1,.2]};
 directional.recipe.migration={};directional.recipe.sourceLayout={};
 for(const direction of ['S','E','N','W']){
  directional.recipe.migration[direction]=['fixture-'+direction];
  directional.recipe.sourceLayout[direction]=[{tile:'fixture-'+direction,dx:0,dy:0}];
 }
 directional.geometry.light.samples=[[.08,.03,.02],[-.04,.01,-.01]];
 const expected={S:[[.16,.06,.03],[-.08,.02,-.015]],E:[[-.06,.16,.03],[-.02,-.08,-.015]],N:[[-.16,-.06,.03],[.08,-.02,-.015]],W:[[.06,-.16,.03],[.02,.08,-.015]]};
 for(const direction of Object.keys(expected)){
  const scene={levels:[{id:'upper',index:2}],objects:[{id:'fixture',x:100,y:200,levelId:'upper',parts:directional.recipe.sourceLayout[direction]}]};
  const meshes=sceneFurnitureVolumes(scene,{squares:[]},{},[directional],{cellSize:2,storeyHeight:4.5});
  const emitter=meshes.find(m=>m.light).light;
  emitter.samples.forEach((v,i)=>v.forEach((n,j)=>assert.ok(Math.abs(n-expected[direction][i][j])<1e-12,`${direction} sample ${i} axis ${j}`)));
  const rigScene=new THREE.Scene(),rig=createVolumeFixtureLights(rigScene);rig.rebuild(meshes,'upper');
  const sources=rigScene.children.filter(m=>m.isSpotLight);
  assert.equal(sources.length,2);
  sources.forEach((source,i)=>{
   source.position.toArray().forEach((n,j)=>assert.ok(Math.abs(n-emitter.position[j]-expected[direction][i][j])<1e-12));
   source.target.position.toArray().forEach((n,j)=>assert.ok(Math.abs(n-emitter.target[j]-expected[direction][i][j])<1e-12));
  });
  scene.objects[0].x+=7;
  const moved=sceneFurnitureVolumes(scene,{squares:[]},{},[directional],{cellSize:2,storeyHeight:4.5}).find(m=>m.light).light;
  assert.deepEqual(moved.samples,emitter.samples);assert.equal(moved.position[0]-emitter.position[0],14);
  rig.dispose();
 }
});
test('whole-room lamp batch shares shadow sampler budget without changing total light energy',()=>{
 const scene=new THREE.Scene(),rig=createVolumeFixtureLights(scene,{shadowBudget:10});
 const fixtures=Array.from({length:7},(_,i)=>({levelId:'g',objectId:'lamp-'+i,light:asset.geometry.light}));rig.rebuild(fixtures,'g');
 const lights=scene.children.filter(x=>x.isSpotLight);assert.equal(lights.length,10);assert.ok(lights.every(l=>l.castShadow));assert.equal(lights.reduce((s,l)=>s+l.intensity,0),7*asset.geometry.light.intensity);
 assert.deepEqual(lights[0].position.toArray(),asset.geometry.light.position.map((v,i)=>v+asset.geometry.light.samples[0][i]));rig.dispose();
});
test('over-budget floor reports an explicit limit rather than compiling invisible geometry',()=>{
 const scene=new THREE.Scene(),rig=createVolumeFixtureLights(scene,{shadowBudget:2});assert.throws(()=>rig.rebuild(Array.from({length:3},(_,i)=>({levelId:'g',objectId:String(i),light:asset.geometry.light})),'g'),/shadow budget supports 2/);assert.equal(scene.children.length,0);
});

test('open shade sends bounded energy up and down with shared budget and switching',()=>{
 const geometry=lampVolume(asset.recipe),up=geometry.additionalLights[0];
 assert.ok(up.position[2]>asset.recipe.parameters.height);
 assert.ok(up.target[2]>up.position[2]);
 assert.equal(up.intensity+geometry.light.intensity,8);
 const world=new THREE.Scene(),rig=createVolumeFixtureLights(world,{shadowBudget:3});
 rig.rebuild([{objectId:'shade',levelId:'g',light:geometry.light,additionalLights:geometry.additionalLights}],'g');
 const sources=world.children.filter(s=>s.isSpotLight);
 assert.equal(sources.length,3);
 assert.equal(sources.reduce((s,l)=>s+l.intensity,0),8);
 assert.ok(sources.some(s=>s.target.position.z>s.position.z));
 assert.ok(sources.some(s=>s.target.position.z<s.position.z));
 rig.setEnabled(false);assert.ok(sources.every(s=>s.intensity===0));rig.dispose();assert.equal(world.children.length,0);
 const scene={levels:[{id:'g',index:0}],objects:[{id:'lamp',x:10,y:20,levelId:'g',parts:[{tile:'tian_detail_lamp',dx:0,dy:0}]}]};
 const floor=structuredClone(asset);floor.recipe.semantics.mount='floor';floor.geometry=geometry;
 const mesh=sceneFurnitureVolumes(scene,{squares:[]},{},[floor],{cellSize:1,storeyHeight:3}).find(m=>m.light);
 assert.ok(mesh);assert.deepEqual(mesh.additionalLights[0].position,[10.5,20.5,up.position[2]]);
});
