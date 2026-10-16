import test from 'node:test';import assert from 'node:assert/strict';
import {groundDropPlacement} from '../src/ground-placement.js';
const tile={z:2};
function rng(values){return()=>{assert.ok(values.length,'unexpected RNG draw');return values.shift();};}
test('new drops use random offsets and yaw with apparent stair height',()=>{
 const result=groundDropPlacement({},tile,(x,y)=>2+x/2,{random:rng([.25,.75,.5])});
 assert.deepEqual(result,{groundOffset:{x:.25,y:.75,z:.125},worldXRotation:0,worldYRotation:0,worldZRotation:180});
});
test('center option consumes initial float draws then integer tenths and recomputes height',()=>{
 const values=[.1,.9,0,.99,.25];const result=groundDropPlacement({},tile,(x,y)=>2+y,{center:true,seatedZ:4.5,random:rng(values)});
 assert.deepEqual(result.groundOffset,{x:Math.fround(.3),y:Math.fround(.6),z:Math.fround(.6)});assert.equal(result.worldZRotation,90);assert.equal(values.length,0);
});
test('redrop retains yaw but resets tilt; zero offsets reroll after yaw',()=>{
 const values=[0,0,.123,.456],item={worldXRotation:30,worldYRotation:50,worldZRotation:270};
 const result=groundDropPlacement(item,tile,()=>2,{random:rng(values)});
 assert.deepEqual(result,{groundOffset:{x:Math.fround(.123),y:Math.fround(.456),z:0},worldXRotation:0,worldYRotation:0,worldZRotation:270});assert.equal(values.length,0);
});
