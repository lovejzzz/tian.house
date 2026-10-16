import test from 'node:test';
import assert from 'node:assert/strict';
import {createSolidIndex} from '../src/solid-index.js';
import {prismSolid} from '../src/prism-solid.js';
import {movePhysicalBody,stepPhysicalBody} from '../src/physical-body.js';
import {sceneStairVolumes} from '../src/scene-stair-volumes.js';
const box=(x,y,z,w=1,h=1,d=1)=>prismSolid({polygon:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],minZ:z,maxZ:z+d});
const half=[.25,.25,.9];
test('index preserves collision results for negative coordinates, high speed, corners and initial penetration',()=>{
 const solids=[box(-10,-10,-.2,2000,2000,.2),box(-1,-4,0,.1,8,3),box(-4,2,0,8,.1,3),...Array.from({length:2000},(_,i)=>box(100+i*3,100,0))],index=createSolidIndex(solids);
 for(const [p,d]of [[[-3,-2,.901],[8,5,0]],[[0,0,4],[0,0,-10]],[[-500,0,1],[1000,0,0]],[[-.95,0,1],[1,0,0]],[[0,0,1],[-2,-2,0]]])assert.deepEqual(movePhysicalBody(index,p,d,half),movePhysicalBody(solids,p,d,half));
 assert.ok(index.query([0,0,1],[1,1,1],half).length<10);
 const legacy={...solids[1]};delete legacy.bounds;assert.equal(createSolidIndex([legacy]).query([0,0,1],[1,0,1],half)[0],legacy);
});
test('indexed staircase route exactly matches full scan at large world offset',()=>{
 const scene={levels:[{id:'g',index:0},{id:'u',index:1}],verticalLinks:[{id:'s',kind:'stairs',shape:'straight',axis:'E',run:5,x:7999,y:11401,fromLevelId:'g',toLevelId:'u'}]};
 const solids=sceneStairVolumes(scene,{cellSize:1,storeyHeight:3}).flatMap(v=>v.collision.map(prismSolid));solids.push(box(7997,11400,-.2,10,3,.2),box(8004,11401,2.8,3,1,.2));
 const index=createSolidIndex(solids);let a={position:[7998.5,11401.5,.901],verticalVelocity:0},b=structuredClone(a);
 for(let i=0;i<72;i++){const velocity=[i<35?1:-1,0];a=stepPhysicalBody(solids,a,velocity,.2,half);b=stepPhysicalBody(index,b,velocity,.2,half);assert.deepEqual(b,a);}
});
