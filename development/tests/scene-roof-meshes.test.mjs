import test from 'node:test';import assert from 'node:assert/strict';import {sceneRoofMeshes} from '../src/scene-roof-meshes.js';
const scene={roofVolumes:[{id:'roof',levelId:'g',elevationUnit:'storeys',surfaceTile:'tile',closureTile:'wall',vertices:[[0,0],[4,0],[4,3],[0,3]],baseElevation:1,profile:{axis:'X',knots:[[0,1],[1,2],[3,1.5]]}}]},metrics={cellSize:2,storeyHeight:3,roofThickness:.15,wallThickness:.2};
test('roof adapter preserves asymmetric heights, thickness and source identity',()=>{
 const before=structuredClone(scene),meshes=sceneRoofMeshes(scene,metrics);assert.deepEqual(scene,before);assert.ok(meshes.some(m=>m.role==='roof-closure'));
 const slopes=meshes.filter(m=>m.role==='roof');assert.equal(Math.max(...slopes.flatMap(m=>m.vertices.map(p=>p[2]))),6);assert.equal(Math.min(...slopes.flatMap(m=>m.vertices.map(p=>p[2]))),2.85);
 for(const m of meshes){assert.equal(m.roofId,'roof');const edges=new Map();for(let i=0;i<m.indices.length;i+=3){const t=m.indices.slice(i,i+3);for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join();const v=edges.get(key)||[0,0];v[0]++;v[1]+=a<b?1:-1;edges.set(key,v);}}for(const v of edges.values())assert.deepEqual(v,[2,0]);}
 assert.throws(()=>sceneRoofMeshes(scene,{...metrics,roofThickness:0}),/dimensions/);
});

import {segmentSolidInterval} from '../src/convex-solid.js';
test('roof collision follows slope and thin skin instead of filling the attic',()=>{
 const meshes=sceneRoofMeshes(scene,metrics),hit=(a,b)=>meshes.flatMap(m=>m.collision).map(c=>segmentSolidInterval(c,a,b)).filter(Boolean);
 const intervals=hit([4,1,0],[4,1,10]);assert.ok(intervals.length);for(const h of intervals){assert.ok(Math.abs(h.enter-.435)<1e-8);assert.ok(Math.abs(h.exit-.45)<1e-8);}
 assert.equal(hit([3,1,4],[5,1,4]).length,0);
 assert.ok(hit([4,1,4.45],[4,1,4.45]).length);
 assert.equal(hit([4,1,4],[4,1,4]).length,0);
});
test('concave roof collision leaves the courtyard open, including large coordinates',()=>{
 for(const offset of [0,11400]){
  const roof={...scene.roofVolumes[0],vertices:[[0,0],[4,0],[4,1],[1,1],[1,3],[0,3]].map(p=>p.map(v=>v+offset)),profile:{axis:'X',knots:[[offset,1.5],[offset+3,1.5]]}};
  const meshes=sceneRoofMeshes({roofVolumes:[roof]},metrics),hit=(x,y)=>meshes.some(m=>m.collision.some(c=>segmentSolidInterval(c,[(x+offset)*2,(y+offset)*2,0],[(x+offset)*2,(y+offset)*2,10])));
  assert.equal(hit(2,2),false);assert.equal(hit(.5,2),true);assert.equal(hit(2,.5),true);
 }
});
test('segment clipping handles reverse travel, inside starts and invalid endpoints',()=>{
 const solids=sceneRoofMeshes(scene,metrics).filter(m=>m.role==='roof').flatMap(m=>m.collision);
 const inside=solids.map(s=>segmentSolidInterval(s,[4,1,4.45],[4,1,5])).filter(Boolean);assert.ok(inside.length);for(const h of inside)assert.equal(h.enter,0);
 const reverse=solids.map(s=>segmentSolidInterval(s,[4,1,10],[4,1,0])).filter(Boolean);assert.ok(reverse.length);for(const h of reverse){assert.ok(Math.abs(h.enter-.55)<1e-8);assert.ok(Math.abs(h.exit-.565)<1e-8);}
 assert.throws(()=>segmentSolidInterval(solids[0],[NaN,0,0],[1,2,3]),/finite/);
});

test('optional interior finish partitions underside without changing collision or exterior',()=>{
 const bare=sceneRoofMeshes(scene,metrics),lined=sceneRoofMeshes({...scene,roofVolumes:scene.roofVolumes.map(r=>({...r,interiorTile:'plaster'}))},metrics);
 assert.deepEqual(lined.flatMap(m=>m.collision),bare.flatMap(m=>m.collision));
 assert.equal(lined.reduce((n,m)=>n+m.indices.length,0),bare.reduce((n,m)=>n+m.indices.length,0));
 for(const m of lined.filter(m=>m.role==='roof-interior')){
  assert.equal(m.materialId,'plaster');assert.equal(m.roofId,'roof');assert.equal(m.collision.length,0);
  for(let i=0;i<m.indices.length;i+=3){const [a,b,c]=m.indices.slice(i,i+3).map(j=>m.vertices[j]);assert.ok((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<0);}
  const shell=lined.find(s=>s.id===m.id.replace(':interior',''));assert.equal(shell.materialId,'tile');
 }
});
