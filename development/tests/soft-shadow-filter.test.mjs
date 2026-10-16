import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installSoftShadowFilter,softShadowChunk} from '../src/soft-shadow-filter.js';
import {createVolumeFixtureLights} from '../src/volume-fixture-lights.js';
test('soft filter chains existing shader work and retains narrow PCF fallback',()=>{
 const m=new THREE.MeshStandardMaterial();m.onBeforeCompile=s=>{s.uniforms.existing={value:1};};m.customProgramCacheKey=()=> 'existing';installSoftShadowFilter(m);
 const s={fragmentShader:'#include <shadowmap_pars_fragment>',uniforms:{}};m.onBeforeCompile(s,{});
 assert.equal(s.uniforms.existing.value,1);assert.equal(s.fragmentShader,softShadowChunk);assert.match(s.fragmentShader,/vogelDiskSample\( 23, 24, phi \)/);assert.match(s.fragmentShader,/vogelDiskSample\( 4, 5, phi \)/);assert.equal(m.customProgramCacheKey(),'existing|tian-diffuser-pcf-24-receiver-v3');
});
test('shadow comparison setting survives rebuild without changing light energy',()=>{
 const scene=new THREE.Scene(),rig=createVolumeFixtureLights(scene),fixture={objectId:'lamp',levelId:'g',light:{position:[0,0,2],target:[0,0,0],color:0xffffff,intensity:8,distance:4,angle:1,penumbra:1,decay:2}};
 rig.rebuild([fixture],'g');let light=scene.children.find(x=>x.isSpotLight);assert.equal(light.shadow.radius,6);rig.setSoftShadows(false);assert.equal(light.shadow.radius,2.5);assert.equal(light.intensity,8);
 rig.rebuild([fixture],'g');light=scene.children.find(x=>x.isSpotLight);assert.equal(light.shadow.radius,2.5);rig.setSoftShadows(true);assert.equal(light.shadow.radius,6);rig.dispose();
});

test('both PCF kernels use receiver-plane correction before depth comparison',()=>{
 assert.equal((softShadowChunk.match(/clamp\(dot\(receiverSlope,/g)||[]).length,29);
 const start=softShadowChunk.indexOf('float getShadow( sampler2DShadow');
 assert.ok(softShadowChunk.indexOf('dFdx(shadowCoord.xyz)',start)<softShadowChunk.indexOf('if ( frustumTest )',start));
 assert.match(softShadowChunk,/abs\(receiverDet\) > 1e-12/);
 assert.match(softShadowChunk,/shadowCoord.z -= receiverResidual/);
});
test('curved soft surfaces retain diffuse filtering without extrapolating a receiver plane',()=>{const m=new THREE.MeshPhysicalMaterial();installSoftShadowFilter(m,{curved:true});const s={fragmentShader:'#include <shadowmap_pars_fragment>',uniforms:{}};m.onBeforeCompile(s,{});assert.match(s.fragmentShader,/vogelDiskSample\( 23, 24, phi \)/);assert.doesNotMatch(s.fragmentShader,/receiverSlope|receiverResidual/);assert.match(m.customProgramCacheKey(),/curved/);});

test('spare emitter samples are distributed within budget with stable energy and source extents',async()=>{
 const {fixtureSampleCounts}=await import('../src/volume-fixture-lights.js');
 const fixtures=Array.from({length:7},(_,i)=>({objectId:'lamp'+i,levelId:'g',light:{position:[i,0,2],target:[i,0,0],color:0xffffff,intensity:8,distance:4,angle:1,penumbra:1,decay:2,samples:[[-.1*(i+1),0,0],[0,-.1*(i+1),0],[0,.1*(i+1),0],[.1*(i+1),0,0]]}}));
 const counts=fixtureSampleCounts(fixtures,9);assert.equal(counts.reduce((a,b)=>a+b,0),9);assert.equal(counts[6],2);assert.equal(counts[5],2);
 assert.deepEqual(fixtureSampleCounts([...fixtures].reverse(),9).reverse(),counts);
 const scene=new THREE.Scene(),rig=createVolumeFixtureLights(scene,{shadowBudget:9});rig.rebuild(fixtures,'g');
 const lights=scene.children.filter(x=>x.isSpotLight);assert.equal(lights.length,9);
 for(const fixture of fixtures)assert.equal(lights.filter(l=>l.userData.objectId===fixture.objectId).reduce((sum,l)=>sum+l.intensity,0),8);
 rig.dispose();assert.equal(scene.children.length,0);
 assert.deepEqual(fixtureSampleCounts([{objectId:'point',light:{}}],9),[1]);
});
