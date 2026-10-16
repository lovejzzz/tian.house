import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fridgeContentLayout,createFridgeContents} from '../src/fridge-contents.js';
import {foodPropsVolume} from '../src/food-props-volume.js';
import {readVolume} from './helpers/volume-delivery.mjs';
test('contents batch regenerates and fits the shelf clear height',()=>{
 const asset=readVolume('food-props');assert.deepEqual(asset.geometry,foodPropsVolume(asset.recipe));for(const p of asset.geometry.parts){assert.ok(p.vertices.flat().every(Number.isFinite));assert.ok(p.indices.every(i=>i>=0&&i<p.vertices.length));assert.ok(Math.max(...p.vertices.map(v=>v[2]))<.2405);}
});
test('live food display preserves identity and reports unsupported/overflow inventory',()=>{
 const kinds={'Base.Apple':'apple'},items=Array.from({length:20},(_,i)=>({id:'i'+i,type:'Base.Apple'}));items.push({id:'unknown',type:'unknown'});
 const a=fridgeContentLayout(items,kinds),b=fridgeContentLayout([...items].reverse(),kinds);assert.deepEqual(a,b);assert.equal(a.displayed.length,18);assert.equal(a.unrepresented.length,3);assert.deepEqual(items[0],{id:'i0',type:'Base.Apple'});const removed=fridgeContentLayout(items.filter(i=>i.id!=='i0'),kinds);assert.ok(!removed.displayed.some(i=>i.itemId==='i0'));
});
test('renderer replaces contents from actual inventory and clears on close',()=>{
 const scene=new THREE.Scene(),assets=[readVolume('food-props')],view=createFridgeContents(scene,assets);view.rebuild([{objectId:'f',fridgeStorage:{origin:[10,20,3],axes:[[0,1,0],[-1,0,0],[0,0,1]]}}]);view.show('f',[{id:'a',type:'Base.Apple'}]);const root=scene.children[0];assert.equal(root.children[0].userData.inventoryItemId,'a');root.updateMatrixWorld(true);const p=new THREE.Vector3().setFromMatrixPosition(root.children[0].matrixWorld);assert.ok(Math.abs(p.x-9.76)<1e-8);assert.ok(Math.abs(p.y-20.17)<1e-8);view.show('f',[]);assert.equal(root.children.length,0);view.dispose();assert.equal(scene.children.length,0);
});
test('cabinet light allocation stays stable across open and close',()=>{
 const scene=new THREE.Scene(),view=createFridgeContents(scene,[readVolume('food-props')]);view.rebuild([{objectId:'f',fridgeStorage:{origin:[10,20,3],axes:[[1,0,0],[0,1,0],[0,0,1]],width:.85,depth:.85,light:{position:[.425,.12,1.14],intensity:3,color:0xffefd7,distance:1.6}}}]);const lamp=scene.children.find(o=>o.isSpotLight);assert.ok(lamp);const n=scene.children.length;view.show('f',[{id:'a',type:'Base.Apple'}]);assert.equal(lamp.intensity,3);assert.equal(lamp.position.z,4.14);view.clear();assert.equal(lamp.intensity,0);assert.equal(scene.children.length,n);view.dispose();assert.equal(scene.children.length,0);
});
test('taking one item leaves its neighbours in place and new stock reuses the empty slot',()=>{const kinds={a:'apple'},items=[{id:'1',type:'a'},{id:'2',type:'a'},{id:'3',type:'a'}],before=fridgeContentLayout(items,kinds),after=fridgeContentLayout(items.slice(1),kinds,before.displayed);assert.deepEqual(after.displayed,before.displayed.slice(1));const refill=fridgeContentLayout([...items.slice(1),{id:'4',type:'a'}],kinds,after.displayed);assert.equal(refill.displayed.find(r=>r.itemId==='4').slot,0);});
