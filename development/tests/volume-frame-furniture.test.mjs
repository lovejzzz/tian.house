import {readVolume} from './helpers/volume-delivery.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {frameFurnitureVolume} from '../src/frame-furniture-volume.js';import {sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';import {movePhysicalBody} from '../src/physical-body.js';
for(const name of ['chair','shelf']){
 const asset=readVolume(name);
 test(`${name} batch delivery is reproducible and rejects impossible dimensions`,()=>{assert.deepEqual(asset.geometry,JSON.parse(JSON.stringify(frameFurnitureVolume(asset.recipe))));assert.throws(()=>frameFurnitureVolume({...asset.recipe,parameters:{...asset.recipe.parameters,member:2}}),/dimensions/);});
 test(`${name} source variants rotate visible geometry and collision together`,()=>{
  for(const [direction,tiles]of Object.entries(asset.recipe.migration)){
   const scene={levels:[{id:'g',index:0}],objects:[{id:name,levelId:'g',x:10,y:20,parts:asset.recipe.sourceLayout[direction]}]},before=structuredClone(scene),meshes=sceneFurnitureVolumes(scene,{squares:[]},{},asset,{cellSize:1,storeyHeight:3}),vertices=meshes.flatMap(m=>m.vertices);
   assert.equal(meshes.length,asset.geometry.parts.length);assert.ok(meshes.every(m=>m.collision.length===1));assert.deepEqual(scene,before);
   const span=axis=>Math.max(...vertices.map(v=>v[axis]))-Math.min(...vertices.map(v=>v[axis]));assert.ok(Math.abs(span(0)-asset.recipe.parameters[['E','W'].includes(direction)?'depth':'width'])<1e-8);
   const solids=meshes.flatMap(m=>m.collision),center=[(Math.min(...vertices.map(v=>v[0]))+Math.max(...vertices.map(v=>v[0])))/2,19,.9];assert.equal(movePhysicalBody(solids,center,[0,4,0],[.25,.25,.9]).blocked,true);
  }
 });
}
