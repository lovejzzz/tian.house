import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {bodyBounds} from '../src/volume-characters.js';
test('body calibration excludes held rigid props and hidden ancestor meshes',()=>{
 const root=new THREE.Group(),body=new THREE.SkinnedMesh(new THREE.BoxGeometry(.4,1.8,.3));
 // Fixture isolates bounds traversal from skinning implementation.
 body.getVertexPosition=(i,out)=>out.fromBufferAttribute(body.geometry.attributes.position,i);root.add(body);
 const held=new THREE.Mesh(new THREE.BoxGeometry(.1,4,.1));held.position.y=2;body.add(held);
 const hidden=new THREE.Group();hidden.visible=false;root.add(hidden);const ghost=body.clone();ghost.getVertexPosition=body.getVertexPosition;ghost.position.y=20;hidden.add(ghost);
 root.updateMatrixWorld(true);const bounds=bodyBounds(root);
 assert.ok(Math.abs(bounds.max.y-bounds.min.y-1.8)<1e-6);assert.ok(bounds.max.y<1);
});
