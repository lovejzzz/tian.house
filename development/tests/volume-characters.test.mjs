import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVolumeCharacters} from '../src/volume-characters.js';
test('shared actor adapter preserves gameplay state, scales body only and hides dead threats',()=>{
 const scene=new THREE.Scene(),actor=new THREE.Group(),body=new THREE.Group();
 body.add(new THREE.Mesh(new THREE.BoxGeometry(.4,1,.2),new THREE.MeshBasicMaterial()));actor.add(body);
 const hidden=new THREE.Mesh(new THREE.BoxGeometry(100,100,100));hidden.visible=false;actor.add(hidden);
 const inventory={equipment:{}},source={ready:true,actor,frame(a,t,z,p,i,o){assert.equal(i,inventory);assert.equal(o.poseOnly,true);actor.rotation.y=a.angle;}};
 const sim={state:{player:{x:2,y:3,z:0,angle:0},zombies:[{id:'z',x:4,y:5,z:0,hp:10,angle:1}],inventory,elapsed:4}},before=JSON.stringify(sim.state);
 const view=createVolumeCharacters(scene,source);view.sync(sim,{cellSize:2,storeyHeight:3},[4,6,.9]);
 assert.equal(JSON.stringify(sim.state),before);assert.equal(scene.children.length,2);
 assert.equal(scene.children[0].scale.x,1.8);assert.deepEqual(scene.children[0].position.toArray(),[4,6,.9]);
 assert.notEqual(scene.children[0].children[0],scene.children[1].children[0]);
 sim.state.zombies[0].hp=0;view.sync(sim,{cellSize:2,storeyHeight:3},[4,6,.9]);assert.equal(scene.children[1].visible,false);
 view.dispose();assert.equal(scene.children.length,0);
});

test('volume actors own lit materials while retaining shared imported maps and geometry',()=>{
 const texture=new THREE.Texture(),original=new THREE.MeshLambertMaterial({map:texture,color:0x9a8877,side:THREE.DoubleSide});
 const geometry=new THREE.BoxGeometry(.4,1,.2),actor=new THREE.Group(),body=new THREE.Group();
 body.add(new THREE.Mesh(geometry,original),new THREE.Mesh(geometry,original));actor.add(body);
 const source={ready:true,actor,frame(){actor.updateMatrixWorld(true);}},scene=new THREE.Scene(),installed=[];
 const view=createVolumeCharacters(scene,source,()=>{},{installMaterial:m=>{installed.push(m);m.onBeforeCompile=s=>{s.uniforms.room={value:1};};m.customProgramCacheKey=()=> 'room';}});
 const sim={state:{player:{x:0,y:0,z:0},zombies:[{id:'threat',x:2,y:0,z:0,hp:10}],inventory:{},elapsed:0}};
 view.sync(sim,{cellSize:1,storeyHeight:3},[0,0,.9]);
 const player=scene.children[0].children[0].children[0].children,zombie=scene.children[1].children[0].children[0].children;
 assert.equal(installed.length,2);assert.equal(player[0].material,player[1].material);assert.notEqual(player[0].material,zombie[0].material);
 for(const mesh of [player[0],zombie[0]]){assert.ok(mesh.material.isMeshStandardMaterial);assert.equal(mesh.material.map,texture);assert.equal(mesh.geometry,geometry);assert.notEqual(mesh.material,original);}
 const shader={uniforms:{},fragmentShader:'#include <tonemapping_fragment>\n#include <colorspace_fragment>'};zombie[0].material.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.room.value,1);assert.match(shader.fragmentShader,/mix\(gl_FragColor.rgb/);assert.equal(player[0].material.customProgramCacheKey(),'room');assert.notEqual(zombie[0].material.customProgramCacheKey(),'room');
 assert.ok(shader.fragmentShader.indexOf('sRGBTransferEOTF')<shader.fragmentShader.indexOf('#include <tonemapping_fragment>'));
 assert.equal(original.color.getHex(),0x9a8877);let ownedDisposed=0,sourceDisposed=0;installed.forEach(m=>m.addEventListener('dispose',()=>ownedDisposed++));original.addEventListener('dispose',()=>sourceDisposed++);texture.addEventListener('dispose',()=>sourceDisposed++);geometry.addEventListener('dispose',()=>sourceDisposed++);
 view.dispose();assert.equal(ownedDisposed,2);assert.equal(sourceDisposed,0);
});

test('occlusion targets follow actual posed bones and disappear with hidden actor',()=>{
 const scene=new THREE.Scene(),actor=new THREE.Group(),body=new THREE.Group();body.add(new THREE.Mesh(new THREE.BoxGeometry(.4,1,.2),new THREE.MeshBasicMaterial()));actor.add(body);
 const head=new THREE.Bone();head.name='Bip01_Head';head.position.set(0,.4,0);body.add(head);
 const source={ready:true,actor,frame(){actor.updateMatrixWorld(true);}},view=createVolumeCharacters(scene,source),sim={state:{player:{x:2,y:3,z:0},zombies:[],inventory:{},elapsed:0}};
 assert.equal(view.focusPoints(),null);view.sync(sim,{cellSize:2,storeyHeight:3},[4,6,.9]);
 const expected=scene.children[0].getObjectByName('Bip01_Head').getWorldPosition(new THREE.Vector3()).toArray();assert.deepEqual(view.focusPoints(),[expected]);assert.ok(expected[2]>1.5);
 view.hide();assert.equal(view.focusPoints(),null);view.dispose();
});
