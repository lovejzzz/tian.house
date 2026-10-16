import test from 'node:test';import assert from 'node:assert/strict';
import {createVolumeSurfaceMaterial} from '../src/volume-surface-material.js';
test('authored fibre material preserves source maps and gives only fabrics a fibre lobe',()=>{
 const map={},bumpMap={},options={color:0xc4bba2,roughness:.92,map,bumpMap,bumpScale:.001};
 const cloth=createVolumeSurfaceMaterial(options,{fibre:{sheen:.35,roughness:.85,specular:.35}});
 assert.ok(cloth.isMeshPhysicalMaterial);assert.equal(cloth.map,map);assert.equal(cloth.bumpMap,bumpMap);assert.equal(cloth.bumpScale,.001);assert.equal(cloth.sheen,.35);assert.equal(cloth.sheenColor.getHex(),options.color);
 const wood=createVolumeSurfaceMaterial(options);assert.ok(!wood.isMeshPhysicalMaterial);cloth.dispose();wood.dispose();
 assert.throws(()=>createVolumeSurfaceMaterial(options,{fibre:{sheen:2,roughness:.85,specular:.35}}),/Invalid fibre/);
});
