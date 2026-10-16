import test from 'node:test';import assert from 'node:assert/strict';import {movePhysicalBody} from '../src/physical-body.js';import {wallVolume} from '../src/wall-volume.js';import {prismSolid} from '../src/prism-solid.js';
const body=[.25,.25,.9],wall=(a,b)=>wallVolume({id:'w',a,b,height:3,thickness:.1}).collision.map(prismSolid);
test('controller stops before thin wall while preserving tangential motion',()=>{const r=movePhysicalBody(wall([0,0],[5,0]),[1,-1,.9],[2,3,0],body);assert.ok(r.blocked);assert.ok(Math.abs(r.position[0]-3)<1e-6);assert.ok(Math.abs(r.position[1]+.3)<1e-5);});
test('controller handles two-wall corner and can move away afterwards',()=>{const solids=[...wall([0,0],[5,0]),...wall([5,0],[5,-5])],r=movePhysicalBody(solids,[4,-1,.9],[3,3,0],body);assert.ok(r.position[0]<=4.700001&&r.position[1]<=-.299999);const away=movePhysicalBody(solids,r.position,[-1,-1,0],body);assert.equal(away.blocked,false);assert.ok(away.position[0]<4);});
import {stepPhysicalBody} from '../src/physical-body.js';
const platform=prismSolid({polygon:[[0,0],[3,0],[3,3],[0,3]],minZ:-.2,maxZ:0});
test('gravity lands on thin floor, stays stable, and resumes falling off the edge',()=>{
 let state={position:[1,1,4],verticalVelocity:0};for(let i=0;i<10;i++)state=stepPhysicalBody([platform],state,[0,0],.2,body);
 assert.ok(state.grounded);assert.ok(Math.abs(state.position[2]-.9)<1e-5);assert.equal(state.verticalVelocity,0);
 for(let i=0;i<8;i++)state=stepPhysicalBody([platform],state,[2,0],.2,body);
 assert.equal(state.grounded,false);assert.ok(state.position[2]<.5);assert.ok(state.verticalVelocity<0);
});
test('upward motion stops at underside without falsely reporting grounded',()=>{
 const ceiling=prismSolid({polygon:[[0,0],[3,0],[3,3],[0,3]],minZ:2.1,maxZ:2.3});const state=stepPhysicalBody([ceiling],{position:[1,1,1],verticalVelocity:5},[0,0],.05,body,{gravity:0});
 assert.ok(state.position[2]<=1.200001);assert.equal(state.verticalVelocity,0);assert.equal(state.grounded,false);
});
test('frame partitioning yields the same floor landing and horizontal path',()=>{
 let a={position:[1,1,2],verticalVelocity:0},b=structuredClone(a);a=stepPhysicalBody([platform],a,[.2,0],1,body);for(let i=0;i<10;i++)b=stepPhysicalBody([platform],b,[.2,0],.1,body);for(let i=0;i<3;i++)assert.ok(Math.abs(a.position[i]-b.position[i])<1e-8);
 assert.throws(()=>stepPhysicalBody([platform],a,[0,0],10,body),/Invalid/);
});
import {sceneStairVolumes} from '../src/scene-stair-volumes.js';
test('grounded body climbs generated flight to upper landing and descends without teleport',()=>{
 const stairScene={levels:[{id:'g',index:0},{id:'u',index:1}],verticalLinks:[{id:'stair',kind:'stairs',shape:'straight',axis:'E',run:5,x:0,y:0,fromLevelId:'g',toLevelId:'u'}]};
 const solids=sceneStairVolumes(stairScene,{cellSize:1,storeyHeight:3}).flatMap(v=>v.collision.map(prismSolid));solids.push(prismSolid({polygon:[[-2,-2],[7,-2],[7,2],[-2,2]],minZ:-.2,maxZ:0}),prismSolid({polygon:[[5,0],[7,0],[7,1],[5,1]],minZ:2.8,maxZ:3}));
 let state={position:[-.5,.5,.901],verticalVelocity:0};for(let i=0;i<35;i++)state=stepPhysicalBody(solids,state,[1,0],.2,body);
 assert.ok(state.position[0]>5.9);assert.ok(Math.abs(state.position[2]-3.9)<1e-5);
 for(let i=0;i<36;i++)state=stepPhysicalBody(solids,state,[-1,0],.2,body);
 assert.ok(state.position[0]<0);assert.ok(Math.abs(state.position[2]-.9)<1e-5);
});
test('step-up rejects overheight and overhead obstruction',()=>{
 for(const [height,ceiling]of [[.3,false],[.15,true]]){const obstacle=prismSolid({polygon:[[1,0],[2,0],[2,2],[1,2]],minZ:0,maxZ:height}),solids=[platform,obstacle];if(ceiling)solids.push(prismSolid({polygon:[[0,0],[3,0],[3,3],[0,3]],minZ:1.85,maxZ:2.1}));let state={position:[.5,1,.900001],verticalVelocity:0,grounded:true};for(let i=0;i<10;i++)state=stepPhysicalBody(solids,state,[1,0],.1,body);assert.ok(state.position[0]<.751);}
});
