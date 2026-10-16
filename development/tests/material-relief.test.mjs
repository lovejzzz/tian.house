import test from 'node:test';
import assert from 'node:assert/strict';
import {periodicNoise,plasterPixels} from '../src/material-relief.js';
import {createVolumeMaterialCache} from '../src/volume-material-cache.js';
test('plaster noise repeats without discontinuities at the physical tile boundary',()=>{
 for(const p of [4,16,64])for(const [x,y]of [[.37,1.29],[0,0],[-.001,2.61]]){
  assert.ok(Math.abs(periodicNoise(x,y,p)-periodicNoise(x+p,y,p))<1e-12);
  assert.ok(Math.abs(periodicNoise(x,y,p)-periodicNoise(x,y+p,p))<1e-12);
 }
 const a=plasterPixels(),b=plasterPixels();assert.deepEqual(a,b);
 assert.ok(new Set(a.relief.filter((_,i)=>i%4===0)).size>30);
 assert.notDeepEqual(a.relief,a.roughness);assert.equal(a.width,256);
});
test('plaster relief is cached in linear colour space and disposed with its maps',()=>{
 const cache=createVolumeMaterialCache(),material={texture:{kind:'plaster',size:256,seed:37}};
 const a=cache.maps(material);assert.equal(a.bumpMap,cache.maps(material).bumpMap);
 assert.equal(a.bumpMap.image.width,256);assert.notEqual(a.map.colorSpace,a.bumpMap.colorSpace);
 let disposed=0;for(const t of Object.values(a))t.addEventListener('dispose',()=>disposed++);
 cache.dispose();assert.equal(disposed,2);
});

import {finishPixels} from '../src/material-relief.js';
test('enamel and steel use reproducible independent relief and roughness maps',()=>{
 for(const kind of ['enamel-finish','brushed-steel']){const a=finishPixels({kind});assert.deepEqual(a,finishPixels({kind}));assert.notDeepEqual(a.relief,a.roughness);assert.ok(new Set(a.relief).size>8);const cache=createVolumeMaterialCache(),maps=cache.maps({texture:{kind,size:128,seed:23}});assert.ok(maps.bumpMap&&maps.map.userData.tianPackedRoughness&&!maps.roughnessMap);cache.dispose();}
 assert.throws(()=>finishPixels({kind:'plastic'}));
});

import {stonePixels} from '../src/material-relief.js';
test('honed stone retains separate reflectance, relief and linear packed finish',()=>{
 const a=stonePixels();assert.deepEqual(a,stonePixels());assert.notDeepEqual(a.color,stonePixels({seed:84}).color);assert.notDeepEqual(a.relief,a.roughness);
 assert.ok(new Set(a.color.filter((_,i)=>i%4===0)).size>30);
 const cache=createVolumeMaterialCache(),maps=cache.maps({texture:{kind:'honed-stone',size:256,seed:83}});assert.ok(maps.bumpMap);assert.ok(maps.map.userData.tianPackedRoughness);assert.equal(maps.bumpMap.colorSpace,'');assert.equal(maps.map.colorSpace,'srgb');assert.equal(maps.roughnessMap,undefined);cache.dispose();
});
