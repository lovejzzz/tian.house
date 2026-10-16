import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {withContactVisibility} from '../src/contact-shading.js';
test('contact depth excludes faded/glass surfaces and restores visibility/shadow state after failure',()=>{
 const scene=new THREE.Scene(),opaque=new THREE.Mesh(),glass=new THREE.Mesh(undefined,new THREE.MeshBasicMaterial({opacity:.2,transparent:true})),hidden=new THREE.Mesh();hidden.visible=false;scene.add(opaque,glass,hidden);
 const renderer={shadowMap:{autoUpdate:true,needsUpdate:true}};
 assert.throws(()=>withContactVisibility(scene,renderer,()=>{assert.equal(opaque.visible,true);assert.equal(glass.visible,false);assert.equal(hidden.visible,false);assert.equal(renderer.shadowMap.autoUpdate,false);throw Error('capture failed');}),/capture failed/);
 assert.equal(glass.visible,true);assert.equal(hidden.visible,false);assert.deepEqual(renderer.shadowMap,{autoUpdate:true,needsUpdate:true});
});
