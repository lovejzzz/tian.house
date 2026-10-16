import test from 'node:test';import assert from 'node:assert/strict';
import {woodFinishPixels} from '../src/wood-finish.js';import {sourceTextureKey} from '../src/source-patch-texture.js';
test('wood finish is deterministic, bounded and separate from source colour',()=>{
 const a=woodFinishPixels(),b=woodFinishPixels();assert.deepEqual(a,b);assert.equal(a.color,undefined);
 const rough=[];for(let i=0;i<a.normal.length;i+=4){rough.push(a.roughness[i+1]);const n=[0,1,2].map(k=>a.normal[i+k]/127.5-1);assert.ok(Math.abs(Math.hypot(...n)-1)<.015);assert.equal(a.normal[i+3],255);}
 assert.ok(Math.min(...rough)>=221);assert.ok(Math.max(...rough)-Math.min(...rough)>5);
 assert.notDeepEqual(a.normal,woodFinishPixels({seed:74}).normal);
});
test('zero relief gives flat normals; physical amplitude and cache recipe remain explicit',()=>{
 const a=woodFinishPixels({relief:0});for(let i=0;i<a.normal.length;i+=4)assert.deepEqual([...a.normal.slice(i,i+4)],[128,128,255,255]);
 const t={kind:'source-patch',sourceTile:'reviewed',finish:{seed:1}};assert.notEqual(sourceTextureKey(t),sourceTextureKey({...t,finish:{seed:2}}));
 assert.throws(()=>woodFinishPixels({relief:.01}),/Invalid/);assert.throws(()=>woodFinishPixels({metres:[0,1]}),/Invalid/);
});
