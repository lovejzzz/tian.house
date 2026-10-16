import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchVolumeObjectMeshes} from '../src/volume-render-batching.js';
const part=(id,objectId,x,color=0xffffff)=>{const g=new THREE.BoxGeometry(1,1,1).toNonIndexed();g.translate(x,0,0);const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color}));mesh.userData={structureId:id,objectId};return mesh;};
test('merges matching object parts and retains exact vertices, bounds and pick identity',()=>{
 const group=new THREE.Group(),a=part('a','chair',0),b=part('b','chair',2),c=part('c','other',4);group.add(a,b,c);
 const vertices=[...a.geometry.attributes.position.array,...b.geometry.attributes.position.array];
 assert.deepEqual(batchVolumeObjectMeshes(group),{removed:1,remaining:2});
 assert.deepEqual([...a.geometry.attributes.position.array],vertices);assert.equal(a.geometry.boundingBox.max.x,2.5);
 assert.deepEqual(a.userData.batchedPartIds,['a','b']);
 group.updateMatrixWorld(true);const hit=new THREE.Raycaster(new THREE.Vector3(2,0,3),new THREE.Vector3(0,0,-1)).intersectObjects(group.children)[0];
 assert.equal(hit.object.userData.objectId,'chair');
});
test('does not merge different materials, transparent parts or lamp emissions',()=>{
 const group=new THREE.Group(),a=part('a','chair',0),b=part('b','chair',2,0xff0000),c=part('c','chair',3),d=part('d','chair',4);c.material.transparent=true;d.material.emissive.set(0xffffff);group.add(a,b,c,d);
 assert.equal(batchVolumeObjectMeshes(group).removed,0);
});
test('bump detail batches only when map identity and physical amplitude match',()=>{
 const group=new THREE.Group(),map=new THREE.Texture(),a=part('a','sofa',0),b=part('b','sofa',2),c=part('c','sofa',4);for(const m of [a,b,c]){m.material.bumpMap=map;m.material.bumpScale=.008;}c.material.bumpScale=.003;group.add(a,b,c);assert.equal(batchVolumeObjectMeshes(group).removed,1);assert.equal(group.children.length,2);assert.equal(a.material.bumpMap,map);
});
test('fibre and ordinary surface responses never merge even with matching base colour',()=>{
 const group=new THREE.Group(),a=part('a','sofa',0),b=part('b','sofa',2),c=part('c','sofa',4);
 b.material.dispose();c.material.dispose();b.material=new THREE.MeshPhysicalMaterial({roughness:1,sheen:.35});c.material=new THREE.MeshPhysicalMaterial({roughness:1,sheen:.6});group.add(a,b,c);assert.equal(batchVolumeObjectMeshes(group).removed,0);
 c.material.sheen=.35;assert.equal(batchVolumeObjectMeshes(group).removed,1);
});
test('translated local parts batch without changing world-space position or selection',()=>{
 const group=new THREE.Group(),a=part('a','chair',0),b=part('b','chair',0);a.position.set(8000,11400,0);b.position.set(8001.25,11400,0);group.add(a,b);
 const before=new THREE.Box3().setFromObject(group);assert.equal(batchVolumeObjectMeshes(group).removed,1);
 const after=new THREE.Box3().setFromObject(group);assert.ok(after.min.distanceTo(before.min)<1e-7);assert.ok(after.max.distanceTo(before.max)<1e-7);
 const hit=new THREE.Raycaster(new THREE.Vector3(8001.25,11400,3),new THREE.Vector3(0,0,-1)).intersectObjects(group.children)[0];assert.equal(hit.object.userData.objectId,'chair');
 assert.deepEqual(a.position.toArray(),[8000,11400,0]);
});

test('normal mapped parts retain UVs and normals and separate map modes and amplitudes',()=>{
 const group=new THREE.Group(),map=new THREE.Texture(),a=part('a','cabinet',0),b=part('b','cabinet',2),c=part('c','cabinet',4),d=part('d','cabinet',6);
 for(const mesh of [a,b,c,d]){mesh.material.normalMap=map;mesh.material.normalScale.set(.3,.4);}
 c.material.normalScale.x=.8;d.material.normalMapType=THREE.ObjectSpaceNormalMap;
 const normals=[...a.geometry.attributes.normal.array,...b.geometry.attributes.normal.array],uv=[...a.geometry.attributes.uv.array,...b.geometry.attributes.uv.array];group.add(a,b,c,d);
 assert.equal(batchVolumeObjectMeshes(group).removed,1);assert.deepEqual([...a.geometry.attributes.normal.array],normals);assert.deepEqual([...a.geometry.attributes.uv.array],uv);assert.equal(a.material.normalMap,map);assert.equal(group.children.length,3);
});
