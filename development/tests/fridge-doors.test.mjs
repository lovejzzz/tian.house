import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFridgeDoors} from '../src/fridge-doors.js';
import {batchVolumeObjectMeshes} from '../src/volume-render-batching.js';
import {readVolume} from './helpers/volume-delivery.mjs';
import {sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';
test('fridge hinge follows all four source directions independently of shell',()=>{
 const a=readVolume('fridge');assert.ok(a.geometry.parts.some(p=>p.id==='shelf:0'));assert.ok(!a.geometry.parts.some(p=>p.id==='cabinet'));
 for(const parts of Object.values(a.recipe.sourceLayout)){const s={levels:[{id:'g',index:0}],objects:[{id:'fridge',levelId:'g',x:10,y:20,parts}]},v=sceneFurnitureVolumes(s,{squares:[]},{},a,{cellSize:1,storeyHeight:3});assert.equal(v.filter(p=>p.fridgeHinge).length,6);assert.ok(v.filter(p=>p.fridgeHinge).every(p=>p.fridgeHinge.every(Number.isFinite)));}
});
test('inspection door closes exactly and cannot batch into the static shell',()=>{
 let cb;const oldR=globalThis.requestAnimationFrame,oldC=globalThis.cancelAnimationFrame;
 globalThis.requestAnimationFrame=f=>{cb=f;return 1;};globalThis.cancelAnimationFrame=()=>{};
 try{const g=new THREE.Group();for(let i=0;i<2;i++){const m=new THREE.Mesh(new THREE.BoxGeometry().toNonIndexed(),new THREE.MeshStandardMaterial());m.userData={objectId:'f',fridgeHinge:[1,1,0]};g.add(m);}assert.equal(batchVolumeObjectMeshes(g).removed,0);const c=createFridgeDoors(g,()=>{});c.rebuild();c.open('f');cb(performance.now()+40);assert.notEqual(g.children[0].quaternion.z,0);c.open(null);assert.equal(g.children[0].quaternion.z,0);assert.deepEqual(g.children[0].position.toArray(),[0,0,0]);c.dispose();}finally{globalThis.requestAnimationFrame=oldR;globalThis.cancelAnimationFrame=oldC;}
});
test('piano storage lid pivots upwards around its rear horizontal hinge and closes exactly',()=>{
 let cb;const oldR=globalThis.requestAnimationFrame,oldC=globalThis.cancelAnimationFrame;globalThis.requestAnimationFrame=f=>{cb=f;return 1;};globalThis.cancelAnimationFrame=()=>{};
 try{const group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry().toNonIndexed(),new THREE.MeshStandardMaterial());mesh.position.set(.5,.24,.49);mesh.userData={objectId:'bench',lidHinge:{point:[.5,.015,.465],axis:[1,0,0],angle:1.22}};group.add(mesh);const motion=createFridgeDoors(group,()=>{});motion.rebuild();motion.open('bench');cb(performance.now()+50);assert.ok(mesh.position.z>.49);assert.ok(mesh.quaternion.x>0);motion.open(null);assert.deepEqual(mesh.position.toArray(),[.5,.24,.49]);assert.equal(mesh.quaternion.x,0);motion.dispose();}finally{globalThis.requestAnimationFrame=oldR;globalThis.cancelAnimationFrame=oldC;}
});

import {setItemCatalog} from '../src/inventory.js';
test('drawer slides without rotating and folded clothing follows actual inventory',()=>{
 setItemCatalog({schema_version:1,items:{'Base.Shirt':{type:'Base.Shirt',name:'Shirt',properties:{ItemType:'base:clothing'}}}});
 let cb;const oldR=globalThis.requestAnimationFrame,oldC=globalThis.cancelAnimationFrame;globalThis.requestAnimationFrame=f=>{cb=f;return 1;};globalThis.cancelAnimationFrame=()=>{};
 try{const group=new THREE.Group();for(let i=0;i<2;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());m.userData={objectId:'bed',drawerSlide:[.52,0,0],clothingSlot:i};group.add(m);}const motion=createFridgeDoors(group,()=>{});motion.rebuild();assert.ok(group.children.every(m=>!m.visible));assert.equal(motion.contents('bed',[{id:'shirt',type:'Base.Shirt'}]).displayed.length,1);assert.equal(group.children[0].visible,true);assert.equal(group.children[1].visible,false);motion.open('bed');cb(performance.now()+50);assert.ok(group.children[0].position.x>0);assert.equal(group.children[0].quaternion.w,1);motion.contents('bed',[]);assert.equal(group.children[0].visible,false);motion.open(null);assert.equal(group.children[0].position.x,0);motion.dispose();}finally{globalThis.requestAnimationFrame=oldR;globalThis.cancelAnimationFrame=oldC;}
});
