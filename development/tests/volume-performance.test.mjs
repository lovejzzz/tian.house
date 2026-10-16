import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeRenderSample} from '../src/volume-performance.js';
test('continuous samples distinguish CPU time, cadence and resource counts',()=>{
 const result=summarizeRenderSample([3,1,2,NaN],[16,32,16],{render:{calls:400,triangles:6000},memory:{geometries:100,textures:5}});
 assert.deepEqual(result.cpuSubmission,{samples:3,p50Ms:2,p95Ms:3,p99Ms:3,maxMs:3,framesOver50ms:0,framesOver100ms:0});
 assert.equal(result.browserFrameCadence.p95Ms,32);
 assert.equal(result.allocatedResourceCounts.textures,5);
 assert.equal(result.memoryBytes,'not measured');
});
test('empty sample does not invent zero-time performance',()=>{
 const result=summarizeRenderSample([],[],{render:{},memory:{}});
 assert.equal(result.cpuSubmission.p95Ms,null);
});

test('tail metrics expose long stalls instead of hiding them behind median cadence',()=>{const r=summarizeRenderSample([],[...Array(98).fill(16.7),70,120],{render:{},memory:{}}).browserFrameCadence;assert.equal(r.p99Ms,70);assert.equal(r.maxMs,120);assert.equal(r.framesOver50ms,2);assert.equal(r.framesOver100ms,1);});
