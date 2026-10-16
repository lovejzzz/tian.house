import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {studioFurnitureVolume} from '../src/studio-furniture-volume.js';import {sweepSolidBox} from '../src/convex-solid.js';
const read=k=>JSON.parse(fs.readFileSync(new URL('../assets/recipes/volume/studio-'+k+'.json',import.meta.url)));
test('studio equipment keeps its dimensioned physical silhouette and actual empty spaces',()=>{
 const tv=studioFurnitureVolume(read('television-85')),bezel=tv.parts.find(p=>p.id==='bezel'),extent=i=>Math.max(...bezel.vertices.map(v=>v[i]))-Math.min(...bezel.vertices.map(v=>v[i]));
 assert.ok(Math.abs(extent(0)-1.8922)<1e-8);assert.ok(Math.abs(extent(2)-1.0819)<1e-8);
 const piano=studioFurnitureVolume(read('upright-piano'));assert.equal(piano.parts.filter(p=>p.id.startsWith('white-key')).length,52);assert.equal(piano.parts.filter(p=>p.id.startsWith('pedal:')).length,3);
 const gym=studioFurnitureVolume(read('functional-trainer'));assert.ok(gym.parts.some(p=>p.id.startsWith('cable:')));assert.ok(!gym.parts.flatMap(p=>p.collision).some(s=>sweepSolidBox(s,[.9,.6,1],[.9,.85,1],[.2,.15,.7])),'training aperture must stay empty');
 const sofa=studioFurnitureVolume(read('sectional-sofa'));assert.ok(sofa.parts.some(p=>p.id==='chaise-seat'));assert.ok(!sofa.parts.flatMap(p=>p.collision).some(s=>sweepSolidBox(s,[1.8,1.5,.9],[1.8,1.5,.9],[.2,.2,.8])),'L-shaped cutout must stay empty');
});
test('all studio recipes generate finite supported convex parts with stable identifiers',()=>{
 for(const k of ['storage-bed','nightstand','water-glass','office-chair','upright-piano','piano-bench','workstation','media-console','television-85','floor-speaker','functional-trainer','breakfast-bar','bar-stool','sectional-sofa']){const r=read(k),a=studioFurnitureVolume(r);assert.deepEqual(a,studioFurnitureVolume(r));assert.equal(new Set(a.parts.map(p=>p.id)).size,a.parts.length);for(const p of a.parts){assert.ok(r.materials[p.materialId]);assert.ok(p.vertices.flat().every(Number.isFinite));assert.ok(p.indices.every(i=>i>=0&&i<p.vertices.length));}assert.equal(Object.keys(r.migration).length,4);assert.ok(Object.values(r.migration).flat().every(id=>id.startsWith('tian_studio_')),'do not replace unrelated legacy furniture');}
});

import {installStudioAssets} from '../src/studio-assets.js';import {workshopCatalog} from '../src/workshop-model.js';import {resolveVolumeFurniture,sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';
test('every studio direction is one editable catalogue assembly matching its volume recipe',()=>{
 const p={},a={regions:{}};installStudioAssets(p,a);const entries=workshopCatalog(p,a,{}).entries.filter(e=>e.source?.startsWith('tian_studio_'));assert.equal(entries.length,56);
 for(const e of entries){const family=p[e.source].TianVariantFamily.replace('studio-',''),r=read(family),asset={recipe:r,geometry:studioFurnitureVolume(r)};assert.equal(resolveVolumeFurniture({parts:e.parts},[asset]).direction,e.facing);}
});
test('wall lighting on a south boundary points into the room instead of outside',()=>{
 const r=JSON.parse(fs.readFileSync(new URL('../assets/recipes/volume/wall-sconce.json',import.meta.url)));const {recipe,geometry}=readVolume('wall-sconce');

 const scene={levels:[{id:'g',index:0}],rooms:[{id:'r',levelId:'g',rect:[0,0,3,3]}],walls:[{id:'w',levelId:'g',axis:'N',x:1,y:3}],openings:[],objects:[{id:'light',levelId:'g',x:1,y:3,parts:r.sourceLayout.N,wallMounts:[{part:0,wallId:'w'}]}]};
 const meshes=sceneFurnitureVolumes(scene,{squares:[]},{tian_wall_sconce_N:{TianMount:'wall',attachedN:''}},{recipe,geometry},{cellSize:1,storeyHeight:3});assert.ok(meshes.length);assert.ok(meshes.flatMap(m=>m.vertices).every(v=>v[1]<3));const light=meshes.find(m=>m.light)?.light;assert.ok(light.target[1]<light.position[1]);
});
import {readVolume} from './helpers/volume-delivery.mjs';
test('studio upholstery has curved height sections without changing its authored footprint',()=>{
 const recipe=JSON.parse(fs.readFileSync(new URL('../assets/recipes/volume/studio-sectional-sofa.json',import.meta.url)));
 const part=studioFurnitureVolume(recipe).parts.find(p=>p.id==='seat:0');
 assert.ok(new Set(part.vertices.map(v=>v[2])).size>4);
 assert.ok(Math.abs(Math.max(...part.vertices.map(v=>v[0]))-1.8)<1e-9);
 assert.ok(Math.abs(Math.min(...part.vertices.map(v=>v[0]))-1)<1e-9);
 const min=Math.min(...part.vertices.map(v=>v[2])),low=part.vertices.filter(v=>v[2]===min),wide=part.vertices.filter(v=>v[2]>min);
 assert.ok(Math.min(...low.map(v=>v[0]))>Math.min(...wide.map(v=>v[0])));
});
test('television screen transforms with all four object orientations and tabletop support',()=>{
 const recipe=read('television-85'),host=read('media-console'),assets=[{recipe,geometry:studioFurnitureVolume(recipe)},{recipe:host,geometry:studioFurnitureVolume(host)}];
 for(const direction of ['N','E','S','W']){const properties=Object.fromEntries(host.sourceLayout[direction].map(p=>[p.tile,{IsTable:'',Surface:16}]));const scene={levels:[{id:'g',index:0}],objects:[{id:'console',levelId:'g',x:10,y:20,parts:host.sourceLayout[direction]},{id:'tv',hostId:'console',levelId:'g',x:10,y:20,parts:recipe.sourceLayout[direction]}]};
 const v=sceneFurnitureVolumes(scene,{squares:[]},properties,assets,{cellSize:1,storeyHeight:3}).find(v=>v.televisionScreen);assert.ok(v,direction);const q=v.televisionScreen;assert.ok(Math.abs(Math.hypot(...q[1].map((v,i)=>v-q[0][i]))-1.8762)<1e-8);assert.ok(Math.abs(q[2][2]-q[1][2]-1.0659)<1e-8);assert.ok(q[0][2]>.4);}
});

test('storage bench has a hollow body and hinged leather cushion; trainer bar is supported',()=>{
 const bench=studioFurnitureVolume(read('piano-bench'));assert.ok(bench.parts.some(p=>p.lidHinge&&p.materialId==='leather'));assert.ok(!bench.parts.flatMap(p=>p.collision).some(s=>sweepSolidBox(s,[.5,.24,.405],[.5,.24,.405],[.12,.08,.025])));
 const trainer=studioFurnitureVolume(read('functional-trainer'));assert.equal(trainer.parts.filter(p=>p.id.startsWith('pullup-bracket:')).length,2);assert.equal(trainer.parts.filter(p=>p.id.startsWith('neutral-grip:')).length,2);
 const chair=studioFurnitureVolume(read('office-chair'));assert.equal(chair.parts.filter(p=>p.id.startsWith('caster:')).length,5);assert.ok(chair.parts.some(p=>p.id==='gas-lift'));
});
