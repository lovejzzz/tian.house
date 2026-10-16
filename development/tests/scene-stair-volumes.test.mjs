import test from 'node:test';import assert from 'node:assert/strict';import {sceneStairVolumes} from '../src/scene-stair-volumes.js';
const scene=link=>({levels:[{id:'g',index:0},{id:'u',index:1}],verticalLinks:[{id:'s',kind:'stairs',fromLevelId:'g',toLevelId:'u',x:0,y:0,...link}]});
test('straight flights ascend in all four directions and preserve full storey rise',()=>{
 for(const axis of ['N','W','E','S']){const s=scene({shape:'straight',run:4,axis}),before=structuredClone(s),parts=sceneStairVolumes(s,{cellSize:1,storeyHeight:3});assert.deepEqual(s,before);assert.equal(parts.at(-1).supportTop,3);const first=parts[0].vertices,last=parts.at(-1).vertices,mean=(v,k)=>v.reduce((s,p)=>s+p[k],0)/v.length;const k=['E','W'].includes(axis)?0:1;assert.equal(Math.sign(mean(last,k)-mean(first,k)),['E','S'].includes(axis)?1:-1);for(let i=1;i<parts.length;i++)assert.ok(parts[i].supportTop-parts[i-1].supportTop<=.18+1e-8);}
});
test('return landing stays half-height and legacy flight preserves apparent-height breakpoints',()=>{
 const returned=sceneStairVolumes(scene({shape:'return',run:3,axis:'E',handedness:'left'}),{cellSize:1,storeyHeight:3});assert.ok(returned.filter(v=>v.supportTop===1.5).length>=3);assert.equal(returned.at(-1).supportTop,3);
 const legacy=sceneStairVolumes(scene({axis:'N'}),{cellSize:1,storeyHeight:3});assert.ok(legacy.some(v=>Math.abs(v.supportTop-.4333*3)<1e-8));assert.ok(legacy.some(v=>Math.abs(v.supportTop-.7666*3)<1e-8));
});
