import test from 'node:test';import assert from 'node:assert/strict';import {sceneSlabVolumes} from '../src/scene-slab-volumes.js';import {prismSolid} from '../src/prism-solid.js';import {stepPhysicalBody} from '../src/physical-body.js';
test('upper floor opening falls onto lower floor while intact upper slab supports actor',()=>{
 const scene={levels:[{id:'g',index:0},{id:'u',index:1}],rooms:[{id:'ground',levelId:'g',floorTile:'f',rect:[0,0,5,5]},{id:'upper',levelId:'u',floorTile:'f',rect:[0,0,5,5],floorOpenings:[{rect:[1,1,4,4]}]}]},plan={squares:[]};for(let z=0;z<2;z++)for(let x=0;x<5;x++)for(let y=0;y<5;y++)plan.squares.push({x,y,z,tiles:['f']});
 const solids=sceneSlabVolumes(scene,plan,{cellSize:1,storeyHeight:3,thickness:.2}).flatMap(v=>v.collision.map(prismSolid));
 for(const [x,y,expected]of [[2,2,.9],[.5,.5,3.9]]){let state={position:[x,y,3.901],verticalVelocity:0};for(let i=0;i<10;i++)state=stepPhysicalBody(solids,state,[0,0],.2,[.25,.25,.9]);assert.ok(state.grounded);assert.ok(Math.abs(state.position[2]-expected)<1e-5);}
});
