import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {createFurnitureCutaway} from '../src/furniture-cutaway.js';
test('only occluding tall furniture fades coherently, restores and retains physical geometry',()=>{
 const mesh=(id,x,y,h)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.8,.3,h),new THREE.MeshStandardMaterial());m.position.set(x,y,h/2);m.userData.objectId=id;m.castShadow=true;return m;};
 const cabinet=mesh('cabinet',0,-2,2),handle=mesh('cabinet',.3,-2.2,.2),other=mesh('other',3,-2,2),table=mesh('table',0,-3,.7),glass=mesh('glass',0,-1,2);glass.material.transparent=true;glass.material.opacity=.3;
 const geometry=cabinet.geometry,cut=createFurnitureCutaway([cabinet,handle,other,table,glass]);
 for(let i=0;i<40;i++)cut.update([0,-5,1],[0,0,1],.05);
 assert.ok(cabinet.material.opacity<.1);assert.equal(handle.material.opacity,cabinet.material.opacity);assert.equal(other.material.opacity,1);assert.equal(table.material.opacity,1);assert.equal(glass.material.opacity,.3);assert.equal(cabinet.castShadow,true);assert.equal(cabinet.geometry,geometry);assert.equal(cabinet.material.depthWrite,false);
 for(let i=0;i<40;i++)cut.update([0,5,1],[0,0,1],.05);
 assert.equal(cabinet.material.opacity,1);assert.equal(cabinet.material.depthWrite,true);
 for(const m of [cabinet,handle,other,table,glass]){m.geometry.dispose();m.material.dispose();}
});
test('lying body samples detect partial occlusion beyond the pelvis ray',()=>{
 const cabinet=new THREE.Mesh(new THREE.BoxGeometry(.5,.3,2),new THREE.MeshStandardMaterial());cabinet.position.set(.65,-1,1);cabinet.userData.objectId='cabinet';const cut=createFurnitureCutaway([cabinet]);
 for(let i=0;i<40;i++)cut.update([0,-4,1],[0,0,1],.05);
 assert.equal(cabinet.material.opacity,1);
 for(let i=0;i<40;i++)cut.update([0,-4,1],[[0,0,1],[.8,0,1]],.05);
 assert.ok(cabinet.material.opacity<.1);
 for(let i=0;i<40;i++)cut.update([0,-4,1],null,.05);
 assert.equal(cabinet.material.opacity,1);cabinet.geometry.dispose();cabinet.material.dispose();
});
test('a tall thin tap does not make a low worktop fade as a cupboard',()=>{
 const top=new THREE.Mesh(new THREE.BoxGeometry(2,.8,.9),new THREE.MeshStandardMaterial()),tap=new THREE.Mesh(new THREE.BoxGeometry(.04,.1,.5),new THREE.MeshStandardMaterial());top.position.set(0,-2,.45);tap.position.set(0,-2,1.15);for(const m of [top,tap])m.userData.objectId='bar';
 const cut=createFurnitureCutaway([top,tap]);for(let i=0;i<40;i++)cut.update([0,-5,1.3],[0,0,1.3],.05);assert.equal(top.material.opacity,1);assert.equal(tap.material.opacity,1);for(const m of [top,tap]){m.geometry.dispose();m.material.dispose();}
});
