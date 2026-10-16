import test from 'node:test';import assert from 'node:assert/strict';
import {surfaceTexture} from '../src/volume-material-texture.js';
import {createVolumeMaterialCache} from '../src/volume-material-cache.js';
import {applyArchitecturalMaterial,architecturalSurfaceUV} from '../src/architectural-materials.js';
test('surface recipes are deterministic, distinct and shared through material cache',()=>{
 const cache=createVolumeMaterialCache(),hashes=[];
 for(const kind of ['planks','grass','paving','plaster','roof']){
  const recipe={kind,size:32,seed:7};const a=surfaceTexture(recipe),b=surfaceTexture(recipe);assert.deepEqual(a,b);hashes.push(Buffer.from(a.color).toString('base64'));
  const m={texture:recipe};assert.equal(cache.maps(m),cache.maps(structuredClone(m)));assert.ok(cache.maps(m).map.isTexture);assert.equal(cache.maps(m).map.userData.tianPackedRoughness,true);assert.equal(cache.maps(m).roughnessMap,undefined);
 }
 assert.equal(new Set(hashes).size,5);cache.dispose();
});
test('adjacent top-face triangles retain world UV phase independently of bounding shape',()=>{
 const a={vertices:[[10,20,0],[11,20,0],[11,21,0]],indices:[0,1,2]},b={vertices:[[11,20,0],[12,21,0],[11,21,0]],indices:[0,1,2]};
 const u=architecturalSurfaceUV(a,[2,3]),v=architecturalSurfaceUV(b,[2,3]);assert.deepEqual(u.slice(2,4),v.slice(0,2));assert.deepEqual(u.slice(4,6),v.slice(4,6));assert.deepEqual(u.slice(0,2),[5,20/3]);
});
test('source material recipe changes appearance without changing support geometry or roof identity',()=>{
 const mesh={role:'roof',roofId:'roof',materialId:'tile',vertices:[[0,0,0],[1,0,0],[1,1,0]],indices:[0,1,2],collision:[{kind:'fixture'}]},original=structuredClone(mesh),material={color:0xabc123,texture:{kind:'roof',repeatMetres:[1,1]}};
 const output=applyArchitecturalMaterial(mesh,[{recipe:{surfaces:[{usage:'roof',tiles:['tile'],material}]}}]);
 assert.deepEqual(mesh,original);assert.equal(output.material,material);assert.equal(output.vertices,mesh.vertices);assert.equal(output.collision,mesh.collision);assert.equal(output.roofId,'roof');assert.equal(output.uv.length,6);
 assert.equal(applyArchitecturalMaterial(mesh,[{recipe:{surfaces:[{usage:'floor',tiles:['tile'],material}]}}]),mesh);
});
