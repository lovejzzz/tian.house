import {readVolume} from './helpers/volume-delivery.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {woodTexture,furnitureUV} from '../src/volume-material-texture.js';import {createVolumeMaterialCache} from '../src/volume-material-cache.js';import {sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';
const asset=readVolume('table');
test('wood recipe regenerates bounded maps with stable detail and seed variation',()=>{
 const a=woodTexture({seed:17}),b=woodTexture({seed:17}),c=woodTexture({seed:18});assert.deepEqual(a,b);assert.notDeepEqual(a.color,c.color);assert.equal(a.color.length,128*128*4);assert.ok(new Set(a.color.filter((_,i)=>i%4===0)).size>20);assert.ok(a.color.every((v,i)=>i%4!==3||v===255));assert.throws(()=>woodTexture({size:2048}),/Invalid/);
});
test('material UVs stay attached through rotation and relocation with physical repeat scale',()=>{
 const scene=d=>({levels:[{id:'g',index:0}],objects:[{id:'t',x:d==='S'?5:8000,y:20,levelId:'g',parts:asset.recipe.sourceLayout[d]}]}),compile=d=>sceneFurnitureVolumes(scene(d),{squares:[]},{},asset,{cellSize:1,storeyHeight:3});
 const a=compile('S'),b=compile('E');assert.deepEqual(a.map(p=>p.uv),b.map(p=>p.uv));for(const p of a){assert.equal(p.uv.length,p.indices.length*2);assert.ok(p.uv.every(Number.isFinite));}
 const part=asset.geometry.parts[0],uv=furnitureUV(part,[1,1,1]),twice=furnitureUV(part,[2,2,2]);assert.ok(uv.every((v,i)=>Math.abs(v*2-twice[i])<1e-9));
});
test('identical material recipes reuse two GPU maps and dispose them once',()=>{
 const cache=createVolumeMaterialCache(),a=cache.maps(asset.recipe.materials.timber),b=cache.maps(structuredClone(asset.recipe.materials.timber));assert.equal(a.map,b.map);assert.equal(a.roughnessMap,b.roughnessMap);assert.equal(a.map.userData.tianPackedRoughness,true);let disposed=0;for(const t of Object.values(a))t.addEventListener('dispose',()=>disposed++);cache.dispose();cache.dispose();assert.equal(disposed,1);
});
