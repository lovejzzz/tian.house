import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {capturedSkyRadiance} from '../src/captured-sky-radiance.js';
import {createRoomBounceStudy} from '../src/room-bounce-study.js';
test('capture uses linear sky radiance with pi normalization and preserves source energy',()=>{
 const scene=new THREE.Scene(),sky=new THREE.HemisphereLight(0xabcdef,0x000000,.65);scene.add(sky);
 const original=sky.color.clone(),radiance=capturedSkyRadiance(scene);
 for(const key of ['r','g','b'])assert.ok(Math.abs(radiance[key]*Math.PI-original[key]*.65)<1e-12);
 assert.ok(sky.color.equals(original));assert.equal(sky.intensity,.65);
 sky.intensity=0;assert.equal(capturedSkyRadiance(scene).getHex(),0);
 scene.clear();assert.equal(capturedSkyRadiance(scene).getHex(),0);
});
test('indoor transport replaces rather than duplicates the hemisphere fallback',()=>{
 const study=createRoomBounceStudy({scene:new THREE.Scene(),renderer:{},onStatus(){}}),material=new THREE.MeshStandardMaterial();study.install({material});
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/if\(tianInside\) \{[\s\S]*irradiance -= getHemisphereLightIrradiance/);
 assert.match(shader.fragmentShader,/irradiance \+= tianIndirect\/max\(tianWeight,0.000001\)\*tianConfidence\*tianBounceEnabled/);
 study.dispose();material.dispose();
});
