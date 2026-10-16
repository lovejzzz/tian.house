import {readVolume} from './helpers/volume-delivery.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {domesticFurnitureVolume} from '../src/domestic-furniture-volume.js';import {sceneFurnitureVolumes,resolveVolumeFurniture} from '../src/scene-furniture-volumes.js';import {movePhysicalBody} from '../src/physical-body.js';
for(const name of ['sofa','bed','oven','fridge']){
 const asset=readVolume(name);
 test(`${name}: delivery regenerates, all source directions preserve geometry and collision`,()=>{
  assert.deepEqual(asset.geometry,JSON.parse(JSON.stringify(domesticFurnitureVolume(asset.recipe))));
  for(const [direction,parts] of Object.entries(asset.recipe.sourceLayout)){
   const object={id:name,levelId:'g',x:10,y:20,parts},scene={levels:[{id:'g',index:0}],objects:[object]},before=structuredClone(scene);
   const meshes=sceneFurnitureVolumes(scene,{squares:[]},{},asset,{cellSize:1,storeyHeight:3}),vertices=meshes.flatMap(m=>m.vertices),span=i=>Math.max(...vertices.map(v=>v[i]))-Math.min(...vertices.map(v=>v[i]));
   assert.deepEqual(scene,before);assert.equal(resolveVolumeFurniture(object,[asset]).direction,direction);assert.equal(meshes.length,asset.geometry.parts.length);for(const [i,m] of meshes.entries())assert.equal(m.collision.length,(asset.geometry.parts[i].id.endsWith(':piping')||asset.geometry.parts[i].softSupport==='cover')?0:1,'Decorative piping and draped covers are nonblocking; underlying mattress stays solid');
   // Appliance front handles extend beyond the cabinet depth but remain within the tile.
   const expected=asset.recipe.parameters[['E','W'].includes(direction)?'depth':'width'];assert.ok(span(0)>=expected-1e-8&&span(0)<expected+.06);
   const centerX=(Math.min(...vertices.map(v=>v[0]))+Math.max(...vertices.map(v=>v[0])))/2;
   assert.equal(movePhysicalBody(meshes.flatMap(m=>m.collision),[centerX,19,.9],[0,5,0],[.25,.25,.9]).blocked,true);
  }
 });
 test(`${name}: invalid scale and altered multipart layout rejected`,()=>{
  assert.throws(()=>domesticFurnitureVolume({...asset.recipe,parameters:{...asset.recipe.parameters,width:.1}}),/dimensions/);
  const parts=structuredClone(asset.recipe.sourceLayout.S);parts[0].dx+=1;
  assert.match(resolveVolumeFurniture({parts},[asset]).reason,/offsets/);
 });
}

test('oven cabinet terminates beneath hob instead of competing with exposed steel top',()=>{
 const {parts}=domesticFurnitureVolume(readVolume('oven').recipe);
 const cabinet=parts.find(p=>p.id==='cabinet'),hob=parts.find(p=>p.id==='cooktop');
 const top=p=>Math.max(...p.vertices.map(v=>v[2])),bottom=p=>Math.min(...p.vertices.map(v=>v[2]));
 assert.ok(top(cabinet)<=bottom(hob)+1e-9);
 assert.ok(top(hob)-top(cabinet)>=.0349);
});
