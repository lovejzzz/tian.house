import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createFurnitureDragPreview} from '../src/furniture-drag-preview.js';
test('calibrated drag previews mounted assembly without changing authoritative coordinates',()=>{
 const make=(id,x)=>{const m=new THREE.Mesh();m.userData={objectId:id};m.position.set(x,2,3);return m;};
 const meshes=[make('desk',1),make('mug',4),make('other',7)],original=meshes.map(m=>m.position.toArray());
 const drag=createFurnitureDragPreview(meshes,['desk','mug'],{cellSize:2,origin:[100,100]});
 assert.deepEqual(drag.update([104.2,97.8]),{dx:2,dy:-1});
 assert.deepEqual(meshes[0].position.toArray(),[5,0,3]);assert.deepEqual(meshes[1].position.toArray(),[8,0,3]);assert.deepEqual(meshes[2].position.toArray(),original[2]);
 drag.update([102,102]);assert.deepEqual(meshes[0].position.toArray(),[3,4,3]); // Absolute preview, no accumulated drift.
 assert.deepEqual(drag.reset(),{dx:1,dy:1});assert.deepEqual(meshes.map(m=>m.position.toArray()),original);
 drag.reset();assert.deepEqual(meshes.map(m=>m.position.toArray()),original);
});
test('subcell motion does not change placement and invalid intersections are ignored',()=>{
 const m=new THREE.Mesh();m.userData.objectId='chair';const drag=createFurnitureDragPreview([m],['chair'],{cellSize:1,origin:[0,0]});
 assert.deepEqual(drag.update([.1,-.1]),{dx:0,dy:0});assert.deepEqual(drag.update([NaN,2]),{dx:0,dy:0});assert.deepEqual(m.position.toArray(),[0,0,0]);
 assert.throws(()=>createFurnitureDragPreview([],[],{cellSize:0,origin:[0,0]}));
});
