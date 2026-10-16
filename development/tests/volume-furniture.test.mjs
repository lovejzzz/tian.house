import {readVolume} from './helpers/volume-delivery.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync,gzipSync} from 'node:zlib';import {tableVolume} from '../src/table-volume.js';import {sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';import {movePhysicalBody} from '../src/physical-body.js';
const recipe=JSON.parse(readFileSync(new URL('../assets/recipes/volume/table.json',import.meta.url))),asset=readVolume('table');
test('volume delivery reproduces recipe exactly with real open space between legs',()=>{
 assert.deepEqual(asset.geometry,JSON.parse(JSON.stringify(tableVolume(recipe))));assert.equal(asset.geometry.parts.length,9);
 const solids=asset.geometry.parts.flatMap(p=>p.collision);assert.equal(movePhysicalBody(solids,[.9,-.3,.2],[0,1.5,0],[.1,.1,.1]).blocked,false);assert.equal(movePhysicalBody(solids,[.9,-.3,.9],[0,1.5,0],[.25,.25,.9]).blocked,true);
 assert.throws(()=>tableVolume({...recipe,parameters:{...recipe.parameters,legWidth:1}}),/dimensions/);
});
test('two source directions share recipe with correct footprint, support lift and stable identity',()=>{
 for(const direction of ['S','E']){
  const scene={levels:[{id:'g',index:0}],objects:[{id:'table',x:10,y:20,levelId:'g',parts:recipe.sourceLayout[direction]}]},before=structuredClone(scene),v=sceneFurnitureVolumes(scene,{squares:[{x:10,y:20,z:0,tiles:['raised']}]},{raised:{solidfloor:'',TianGroundHeight:'8'}},asset,{cellSize:1,storeyHeight:3});
  assert.equal(v.length,9);assert.ok(v.every(p=>p.objectId==='table'));assert.equal(Math.min(...v.flatMap(p=>p.vertices.map(v=>v[2]))),.25);assert.deepEqual(scene,before);
  const max=[0,1].map(i=>Math.max(...v.flatMap(p=>p.vertices.map(v=>v[i]))));assert.ok(Math.abs(max[direction==='S'?0:1]-(direction==='S'?11.9:21.9))<1e-8);
 }
});
