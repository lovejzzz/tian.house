import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createCaptureShadowCache} from '../src/capture-shadow-cache.js';
function setup(){const scene=new THREE.Scene(),light=new THREE.SpotLight();light.castShadow=true;scene.add(light);const renderer={shadowMap:{autoUpdate:true,needsUpdate:false}},live={dispose(){throw Error('must not dispose live map');}};light.shadow.map=live;return {scene,light,renderer,live,cache:createCaptureShadowCache(renderer,scene)};}
test('one static map is reused across faces while live maps and flags remain independent',()=>{
 const {light,renderer,live,cache}=setup();let renders=0,disposed=0;const capture={dispose(){disposed++;}};
 for(let i=0;i<60;i++){cache.run(()=>{assert.equal(light.shadow.autoUpdate,false);if(renderer.shadowMap.needsUpdate){renders++;light.shadow.map=capture;light.shadow.needsUpdate=false;}else assert.equal(light.shadow.map,capture);});assert.equal(light.shadow.map,live);assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(light.shadow.autoUpdate,true);}
 assert.equal(renders,1);cache.dispose();assert.equal(disposed,1);assert.equal(light.shadow.map,live);
});
test('failed render restores live state and retries rather than accepting partial capture',()=>{
 const {light,renderer,live,cache}=setup();let disposed=0;const partial={dispose(){disposed++;}};
 assert.throws(()=>cache.run(()=>{light.shadow.map=partial;throw Error('GPU failure');}),/GPU failure/);
 assert.equal(light.shadow.map,live);assert.equal(renderer.shadowMap.autoUpdate,true);
 cache.run(()=>{assert.equal(renderer.shadowMap.needsUpdate,true);assert.equal(light.shadow.needsUpdate,true);});cache.dispose();assert.equal(disposed,1);
});
test('hidden interactive lights are excluded and each new capture invalidates static shadows',()=>{
 const {scene,light,renderer,cache}=setup();light.visible=false;
 cache.run(()=>assert.equal(renderer.shadowMap.needsUpdate,false));light.visible=true;
 cache.run(()=>assert.equal(renderer.shadowMap.needsUpdate,true));cache.dispose();
 const second=createCaptureShadowCache(renderer,scene);second.run(()=>assert.equal(renderer.shadowMap.needsUpdate,true));second.dispose();
});
