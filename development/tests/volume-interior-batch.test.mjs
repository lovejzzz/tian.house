import test from 'node:test';import assert from 'node:assert/strict';
import {readVolume} from './helpers/volume-delivery.mjs';import {interiorDetailsVolume} from '../src/interior-details-volume.js';import {sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';import {applyArchitecturalMaterial} from '../src/architectural-materials.js';
const kinds=['tea','books','desk','radio','kitchen','wash','art','curtain','wardrobe','bath-mirror','bath-towel'];
test('whole interior batch regenerates deterministic finite assemblies',()=>{for(const kind of kinds){const a=readVolume('detail-'+kind);assert.deepEqual(a.geometry,JSON.parse(JSON.stringify(interiorDetailsVolume(a.recipe))));assert.ok(a.geometry.parts.length>2);for(const p of a.geometry.parts){assert.ok(p.vertices.flat().every(Number.isFinite));assert.ok(p.indices.every(i=>i>=0&&i<p.vertices.length));}}});
test('curtains require their actual opening and use wall mounting instead of freestanding rotation',()=>{
 const a=readVolume('detail-curtain');for(const axis of ['N','W']){const tile=a.recipe.migration[axis][0],props={[tile]:{TianMount:'window',['attached'+axis]:''}},scene={levels:[{id:'g',index:0}],walls:[{id:'w',axis,x:10,y:20,levelId:'g'}],openings:[{id:'win',hostWallId:'w',kind:'window'}],objects:[{id:'drape',x:10,y:20,levelId:'g',parts:a.recipe.sourceLayout[axis],wallMounts:[{part:0,wallId:'w',openingId:'win'}]}]};const compile=()=>sceneFurnitureVolumes(scene,{squares:[]},props,a,{cellSize:1,storeyHeight:3,wallThickness:.2});assert.equal(compile().length,15);assert.ok(compile().flatMap(m=>m.vertices).every(v=>v[axis==='N'?1:0]>(axis==='N'?20:10)+.1));scene.openings[0].kind='door';assert.equal(compile().length,0);}
});
test('tabletop set refuses missing host, and wardrobe mapping keeps all source directions',()=>{
 const a=readVolume('detail-desk'),scene={levels:[{id:'g',index:0}],objects:[{id:'set',levelId:'g',x:0,y:0,parts:a.recipe.sourceLayout.S}]};assert.equal(sceneFurnitureVolumes(scene,{squares:[]},{},a,{cellSize:1,storeyHeight:3}).length,0);
 const w=readVolume('detail-wardrobe');for(const parts of Object.values(w.recipe.sourceLayout)){scene.objects[0].parts=parts;assert.equal(sceneFurnitureVolumes(scene,{squares:[]},{},w,{cellSize:1,storeyHeight:3}).length,w.geometry.parts.length);}
});
test('architectural finishes are scoped so roof and wall source choices do not repaint floors',()=>{
 const a=readVolume('surface-materials'),triangle={vertices:[[0,0,0],[1,0,0],[1,1,0]],indices:[0,1,2]};
 const roof={...triangle,role:'roof',materialId:'roofs_01_22'};assert.equal(applyArchitecturalMaterial(roof,[a]).material.texture.kind,'roof');
 const floor={...roof,role:'surface'};assert.equal(applyArchitecturalMaterial(floor,[a]),floor);
 const wall={...triangle,hostEndpoints:[[0,0],[1,0]],materialId:'tian_masonry_ivory_1'};assert.equal(applyArchitecturalMaterial(wall,[a]).material.texture.kind,'plaster');
});
test('exterior window drapes face the occupied room instead of hanging outside',()=>{
 const a=readVolume('detail-curtain'),scene={levels:[{id:'g',index:0}],rooms:[{id:'room',levelId:'g',rect:[8,19,10,22]}],walls:[{id:'w',axis:'W',x:10,y:20,levelId:'g'}],openings:[{id:'win',hostWallId:'w',kind:'window'}],objects:[{id:'drape',x:10,y:20,levelId:'g',parts:a.recipe.sourceLayout.W,wallMounts:[{part:0,wallId:'w',openingId:'win'}]}]},props={tian_curtain_W:{TianMount:'window',attachedW:''}};
 const out=sceneFurnitureVolumes(scene,{squares:[]},props,a,{cellSize:1,storeyHeight:3,wallThickness:.2});assert.equal(out.length,15);assert.ok(out.flatMap(m=>m.vertices).every(v=>v[0]<9.9));
});

test('bathroom fixtures expose all wall faces and remain shallow enough for a compact bathroom',()=>{
 for(const kind of ['bath-mirror','bath-towel']){
  const a=readVolume('detail-'+kind);assert.deepEqual(Object.keys(a.recipe.migration).sort(),['E','N','S','W']);
  const points=a.geometry.parts.flatMap(p=>p.vertices);assert.ok(Math.max(...points.map(p=>p[1]))<.21);assert.ok(Math.min(...points.map(p=>p[2]))>=.7);
 }
});
