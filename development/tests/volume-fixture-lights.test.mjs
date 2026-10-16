import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVolumeFixtureLights} from '../src/volume-fixture-lights.js';
const fixture=(id)=>({objectId:id,levelId:'g',light:{position:[1,2,2],target:[1,2,0],color:0xffdca4,intensity:8,distance:4,angle:1.2,penumbra:1,decay:2,samples:[[-.1,0,0],[.1,0,0],[0,-.1,0],[0,.1,0]]}});
test('distributed emitters preserve energy, cast shadows, and follow switches',()=>{
 const scene=new THREE.Scene(),rig=createVolumeFixtureLights(scene);rig.rebuild([fixture('a'),fixture('b')],'g');
 const lights=scene.children.filter(x=>x.isSpotLight);assert.equal(lights.length,8);assert.equal(lights.reduce((n,l)=>n+l.intensity,0),16);assert.ok(lights.every(l=>l.castShadow));assert.equal(new Set(lights.slice(0,4).map(l=>l.position.toArray().join())).size,4);
 rig.setEnabled(false);assert.ok(lights.every(l=>l.visible&&l.intensity===0&&l.castShadow&&!l.shadow.autoUpdate));rig.setEnabled(true);assert.equal(lights.reduce((n,l)=>n+l.intensity,0),16);assert.ok(lights.every(l=>l.shadow.autoUpdate&&l.shadow.needsUpdate));rig.dispose();assert.equal(scene.children.length,0);
});
test('limited shadow budget retains energy without exceeding allocation',()=>{
 const scene=new THREE.Scene(),rig=createVolumeFixtureLights(scene,{shadowBudget:3});rig.rebuild([fixture('a')],'g');const lights=scene.children.filter(x=>x.isSpotLight);assert.equal(lights.length,3);assert.equal(lights.reduce((n,l)=>n+l.intensity,0),8);rig.dispose();
});
