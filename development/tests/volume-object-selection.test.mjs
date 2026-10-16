import test from 'node:test';import assert from 'node:assert/strict';import {volumeObjectSelection} from '../src/volume-object-selection.js';import {moveSceneObjects} from '../src/scene-objects.js';
test('picking a mounted lamp edits its host group and preserves mounted offsets',()=>{
 const scene={levels:[{id:'g',index:0}],legacy:{items:[]},objects:[{id:'table',groupId:'set',x:1,y:2,levelId:'g',parts:[]},{id:'chair',groupId:'set',x:1,y:3,levelId:'g',parts:[]},{id:'lamp',hostId:'table',x:1,y:2,levelId:'g',parts:[]}]},before=structuredClone(scene),selection=volumeObjectSelection(scene,'lamp');
 assert.equal(selection.root.id,'table');assert.deepEqual(new Set(selection.allIds),new Set(['table','chair','lamp']));const moved=moveSceneObjects(scene,{ids:selection.ids,dx:1,dy:0});assert.deepEqual(moved.objects.map(o=>o.x),[2,2,2]);assert.equal(moved.objects[2].hostId,'table');assert.deepEqual(scene,before);
});
test('3D object selection refuses broken or cyclic support references',()=>{
 assert.equal(volumeObjectSelection({objects:[]},'missing'),null);assert.throws(()=>volumeObjectSelection({objects:[{id:'a',hostId:'b'}]},'a'),/missing/);assert.throws(()=>volumeObjectSelection({objects:[{id:'a',hostId:'b'},{id:'b',hostId:'a'}]},'a'),/cycle/);
});
test('surface adjustment selects just the picked child while still validating its support chain',()=>{
 const scene={objects:[{id:'desk'},{id:'lamp',hostId:'desk'},{id:'other',hostId:'desk'}]},s=volumeObjectSelection(scene,'lamp',{relativeToHost:true});assert.equal(s.root.id,'lamp');assert.deepEqual(s.ids,['lamp']);assert.deepEqual(s.allIds,['lamp']);assert.equal(s.hostId,'desk');assert.throws(()=>volumeObjectSelection({objects:[{id:'lamp',hostId:'missing'}]},'lamp',{relativeToHost:true}),/missing/);
});
