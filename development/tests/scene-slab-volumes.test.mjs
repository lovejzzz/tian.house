import test from 'node:test';import assert from 'node:assert/strict';
import {sceneSlabVolumes} from '../src/scene-slab-volumes.js';import {roomCells} from '../src/room-footprint.js';import {polygonSignedArea,pointInPolygon} from '../src/polygon-footprint.js';
const metrics={cellSize:1,storeyHeight:3,thickness:.2};
function fixture(room){const scene={levels:[{id:'upper',index:1}],rooms:[{id:'r',levelId:'upper',floorTile:'floor',...room}]};return {scene,plan:{squares:roomCells(scene.rooms[0]).map(([x,y])=>({x,y,z:1,tiles:['floor']}))}};}
function checkMesh(m){const edges=new Map();let volume=0;for(let i=0;i<m.indices.length;i+=3){const ids=m.indices.slice(i,i+3),[a,b,c]=ids.map(k=>m.vertices[k]);volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');const e=edges.get(key)||[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(key,e);}}for(const e of edges.values())assert.deepEqual(e,[2,0]);assert.ok(Math.abs(volume-m.collision.reduce((s,c)=>s+polygonSignedArea(c.polygon)*(c.maxZ-c.minZ),0))<1e-8);}
test('slab preserves explicit void and compiler stair cut, with real underside',()=>{
 const {scene,plan}=fixture({rect:[0,0,4,4],floorOpenings:[{rect:[1,1,2,2]}]}),copy=structuredClone(scene);plan.squares.find(s=>s.x===2&&s.y===2).tiles=[];const [m]=sceneSlabVolumes(scene,plan,metrics);checkMesh(m);assert.equal(m.collision.length,14);assert.ok(m.vertices.every(v=>v[2]===3||v[2]===2.8));assert.ok(!m.collision.some(c=>pointInPolygon([1.5,1.5],c.polygon)||pointInPolygon([2.5,2.5],c.polygon)));assert.deepEqual(scene,copy);
});
test('diagonal room and sparse concave footprints preserve area',()=>{
 for(const [room,area]of [[{rect:[0,0,3,3],polygon:[[0,0],[3,0],[0,3]]},4.5],[{rect:[0,0,2,2],cells:[[0,0],[1,0],[0,1]]},3]]){const {scene,plan}=fixture(room),[m]=sceneSlabVolumes(scene,plan,metrics);checkMesh(m);assert.ok(Math.abs(m.collision.reduce((s,c)=>s+polygonSignedArea(c.polygon),0)-area)<1e-8);}
});
