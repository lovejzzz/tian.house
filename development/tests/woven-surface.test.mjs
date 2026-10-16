import test from 'node:test';import assert from 'node:assert/strict';
import {wovenSurfacePixels,sourceTextureKey} from '../src/source-patch-texture.js';
test('authored yarn relief is deterministic and separate from source colour',()=>{
 const a=wovenSurfacePixels({size:64,threads:[8,8]});assert.deepEqual(a,wovenSurfacePixels({size:64,threads:[8,8]}));
 assert.equal(a.width,64);assert.equal(a.height,64);assert.equal(a.normal.length,64*64*4);assert.equal(a.color,undefined);assert.ok(new Set(a.relief.filter((_,i)=>i%4===0)).size>8);
 assert.ok(a.roughness.filter((_,i)=>i%4===0).every(v=>v>=214&&v<=253));
 for(let y=0;y<64;y++)for(let c=0;c<4;c++)assert.equal(a.relief[(y*64)*4+c],a.relief[(y*64+63)*4+c]);
 assert.throws(()=>wovenSurfacePixels({threads:[127,72]}),/Invalid/);
});
test('different weave recipes cannot reuse the wrong source material cache',()=>{
 const t={kind:'source-patch',sourceTile:'cloth'};assert.notEqual(sourceTextureKey(t),sourceTextureKey({...t,weave:{threads:[128,72]}}));
 assert.notEqual(sourceTextureKey({...t,weave:{threads:[128,72]}}),sourceTextureKey({...t,weave:{threads:[64,36]}}));
});
test('authored irregular yarn changes relief and finish without replacing imported colour',()=>{
 const recipe={size:64,threads:[8,8],irregularity:.35,seed:41};
 const varied=wovenSurfacePixels(recipe),regular=wovenSurfacePixels({...recipe,irregularity:0});
 assert.deepEqual(varied,wovenSurfacePixels(recipe));
 assert.notDeepEqual(varied.normal,regular.normal);assert.notDeepEqual(varied.roughness,regular.roughness);
 assert.equal(varied.color,undefined);
 assert.notDeepEqual(varied.normal,wovenSurfacePixels({...recipe,seed:42}).normal);
 assert.throws(()=>wovenSurfacePixels({...recipe,irregularity:2}),/Invalid/);
});
