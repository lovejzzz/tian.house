import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {createVolumeLighting} from '../src/volume-lighting.js';
test('lighting fits far-world geometry, uses Z-up and changes actual light energy',()=>{
 const scene=new THREE.Scene(),renderer={shadowMap:{},setClearColor(c){this.clear=c;}},rig=createVolumeLighting(scene,renderer),bounds=new THREE.Box3(new THREE.Vector3(7990,11400,0),new THREE.Vector3(8020,11430,6));rig.fit(bounds);
 const sun=scene.children.find(o=>o.isDirectionalLight),sky=scene.children.find(o=>o.isHemisphereLight);assert.deepEqual(sun.target.position.toArray(),[8005,11415,3]);assert.equal(sky.position.z,1);assert.ok(sun.position.z>6);assert.ok(sun.castShadow&&renderer.shadowMap.enabled);
 const day=sun.intensity;rig.setMode('night');assert.ok(sun.intensity>0&&sun.intensity<day);assert.equal(sky.intensity,.45);rig.setMode('day');assert.equal(sun.intensity,day);assert.throws(()=>rig.setMode('fake'),/Unknown/);rig.dispose();assert.equal(scene.children.length,0);
});
test('clock changes source direction and intensity without losing the fitted far-world target',()=>{
 const scene=new THREE.Scene(),renderer={shadowMap:{},setClearColor(){}},rig=createVolumeLighting(scene,renderer);
 rig.fit(new THREE.Box3(new THREE.Vector3(7990,11400,0),new THREE.Vector3(8020,11430,6)));
 const sun=scene.children.find(o=>o.isDirectionalLight);rig.setTime(420);const morning=sun.position.clone();rig.setTime(1020);
 assert.ok(sun.position.x>morning.x);assert.deepEqual(sun.target.position.toArray(),[8005,11415,3]);
 rig.setTime(0);assert.equal(sun.intensity,.5);rig.setMode('day');assert.equal(sun.intensity,3.2);rig.dispose();
});

test('sun softness stays in world units across lot sizes and can be compared with narrow shadows',()=>{
 const scene=new THREE.Scene(),rig=createVolumeLighting(scene,{shadowMap:{},setClearColor(){}});
 const sun=scene.children.find(o=>o.isDirectionalLight);
 for(const span of [10,30,60]){
  rig.fit(new THREE.Box3(new THREE.Vector3(0,0,0),new THREE.Vector3(span,span,3)));
  const footprint=sun.shadow.radius*(sun.shadow.camera.right-sun.shadow.camera.left)/sun.shadow.mapSize.x;
  assert.ok(Math.abs(footprint-.09)<1e-10);
 }
 const energy=sun.intensity;rig.setSoftShadows(false);assert.equal(sun.shadow.radius,1);
 rig.setSoftShadows(true);assert.ok(sun.shadow.radius>1);assert.equal(sun.intensity,energy);rig.dispose();
});
