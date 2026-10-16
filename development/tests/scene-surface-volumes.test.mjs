import test from 'node:test';import assert from 'node:assert/strict';
import {sceneSurfaceVolumes} from '../src/scene-surface-volumes.js';import {polygonSignedArea,pointInPolygon} from '../src/polygon-footprint.js';import {prismSolid} from '../src/prism-solid.js';import {stepPhysicalBody} from '../src/physical-body.js';
const metrics={cellSize:1,storeyHeight:3,thickness:.2},properties={grass:{solidfloor:''},water:{solidfloor:'',water:''},rug:{solidfloor:'',FloorOverlay:''},platform:{solidfloor:'',TianGroundHeight:'8'}};
test('surfaces preserve holes, room ownership, water and basement support',()=>{
 const scene={levels:[{id:'g',index:0},{id:'b',index:-1},{id:'u',index:1}],rooms:[{id:'r',levelId:'g',floorTile:'grass',rect:[0,0,2,1],floorOpenings:[{rect:[1,0,2,1]}]}]},plan={squares:[{x:0,y:0,z:0,tiles:['grass']},{x:1,y:0,z:0,tiles:['grass']},{x:2,y:0,z:0,tiles:[]},{x:3,y:0,z:0,tiles:['grass','water']},{x:4,y:0,z:0,tiles:['rug']},{x:5,y:0,z:0,tiles:['grass','workshop_pool_water']},{x:6,y:0,z:0,tiles:['grass','rug']},{x:0,y:0,z:-1,tiles:['grass']}]},before=structuredClone({scene,plan});
 const volumes=sceneSurfaceVolumes(scene,plan,properties,metrics);assert.equal(volumes.length,2);assert.equal(volumes.reduce((n,v)=>n+v.collision.length,0),2);assert.ok(volumes.find(v=>v.levelId==='b').collision.every(c=>c.maxZ===-3));assert.deepEqual({scene,plan},before);
});
test('partial support retains polygon edges and low platform height',()=>{
 const scene={levels:[{id:'g',index:0}],rooms:[]},plan={squares:[{x:0,y:0,z:0,tiles:['platform']}],polygonGeometry:{floors:[{x:0,y:0,z:0,tile:'platform',full:false,polygons:[[[0,0],[1,0],[0,1]]]}]}};
 const [m]=sceneSurfaceVolumes(scene,plan,properties,metrics);assert.equal(polygonSignedArea(m.collision[0].polygon),.5);assert.equal(m.collision[0].maxZ,.25);assert.equal(pointInPolygon([.9,.9],m.collision[0].polygon),false);
 const solids=m.collision.map(prismSolid);let state={position:[.2,.2,2],verticalVelocity:0};for(let i=0;i<10;i++)state=stepPhysicalBody(solids,state,[0,0],.1,[.1,.1,.9]);assert.ok(state.grounded);assert.ok(Math.abs(state.position[2]-1.15)<1e-5);
});
