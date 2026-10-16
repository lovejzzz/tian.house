import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {showerPartVisible} from '../src/shower-presentation.js';import {createShowerEffect} from '../src/shower-effect.js';
test('bathing hides outer clothes while retaining imported body and restores source visibility',()=>{
 for(const part of ['shirt','trousers']){assert.equal(showerPartVisible(part,true,true),false);assert.equal(showerPartVisible(part,true,false),true);}
 for(const part of ['body','hair',undefined])assert.equal(showerPartVisible(part,true,true),true);
 assert.equal(showerPartVisible('body',false,true),false);
});
test('water droplets follow actual active fixture and stop/dispose together with streams',()=>{
 const scene=new THREE.Scene(),effect=createShowerEffect(scene),object={x:4,y:7,z:0,tile:'shower'};
 effect.rebuild([{id:'fixture:shower-head',objectId:'s',vertices:[[4.2,7.2,2.2],[4.4,7.4,2.4]]}],{levels:[{id:'g',index:0}],objects:[{id:'s',x:4,y:7,levelId:'g',parts:[{tile:'shower'}]}]});
 effect.update({shower:{object}},.1);const points=scene.children.find(x=>x.isPoints),lines=scene.children.find(x=>x.isLineSegments);
 assert.ok(points.visible&&lines.visible);assert.ok(points.userData.indirectCaptureExclude);assert.equal(points.geometry.attributes.position.count,96);
 const a=points.geometry.attributes.position.array;assert.ok([...a].every(Number.isFinite));assert.ok(a[2]<2.3&&a[2]>0);
 effect.update({shower:{object:{...object,x:5}}},.1);assert.equal(points.visible,false);assert.equal(lines.visible,false);
 effect.update({shower:{object}},.1);effect.stop();assert.equal(points.visible,false);effect.dispose();assert.equal(scene.children.length,0);
});
