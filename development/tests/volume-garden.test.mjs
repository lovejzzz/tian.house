import test from 'node:test';import assert from 'node:assert/strict';
import {readVolume} from './helpers/volume-delivery.mjs';import {plantVolume} from '../src/plant-volume.js';import {frameFurnitureVolume} from '../src/frame-furniture-volume.js';import {sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';import {movePhysicalBody} from '../src/physical-body.js';
test('bench has walk-blocking seat in both reviewed multipart orientations',()=>{
 const asset=readVolume('bench');assert.deepEqual(asset.geometry,JSON.parse(JSON.stringify(frameFurnitureVolume(asset.recipe))));
 for(const [direction,parts]of Object.entries(asset.recipe.sourceLayout)){
  const meshes=sceneFurnitureVolumes({levels:[{id:'g',index:0}],objects:[{id:'bench',x:0,y:0,levelId:'g',parts}]},{squares:[]},{},asset,{cellSize:1,storeyHeight:3});
  const start=direction==='S'?[1,1.5,.901]:[-.5,1,.901],delta=direction==='S'?[0,-1,0]:[1,0,0];
  assert.equal(movePhysicalBody(meshes.flatMap(m=>m.collision),start,delta,[.25,.25,.9]).blocked,true);
 }
});
test('plant remains deterministic, pot blocks walking while high leaf canopy is nonblocking',()=>{
 const asset=readVolume('snake-plant'),geometry=plantVolume(asset.recipe);assert.deepEqual(asset.geometry,JSON.parse(JSON.stringify(geometry)));
 assert.ok(geometry.parts.filter(p=>p.id.startsWith('leaf:')).every(p=>p.vertices.length>=6&&p.collision.length===0));
 const solids=geometry.parts.flatMap(p=>p.collision);
 assert.equal(movePhysicalBody(solids,[.5,-.5,.9],[0,2,0],[.25,.25,.9]).blocked,true);
 assert.equal(movePhysicalBody(solids,[.5,-.5,1.1],[0,2,0],[.01,.01,.01]).blocked,false);
 assert.equal(movePhysicalBody(solids,[.5,.5,.45],[0,0,-.07],[.01,.01,.01]).blocked,false);
 assert.throws(()=>plantVolume({...asset.recipe,parameters:{...asset.recipe.parameters,leaves:100}}),/dimensions/);
});
