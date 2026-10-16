import test from 'node:test';import assert from 'node:assert/strict';
import {polygonSignedArea} from '../src/polygon-footprint.js';
import {wallVolume} from '../src/wall-volume.js';import {sceneWallVolumes} from '../src/scene-wall-volumes.js';
function signedVolume(m){let sum=0;for(let i=0;i<m.indices.length;i+=3){const [a,b,c]=m.indices.slice(i,i+3).map(k=>m.vertices[k]);sum+=a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]);}return sum/6;}
function closed(m){const edges=new Map();for(let i=0;i<m.indices.length;i+=3){const t=m.indices.slice(i,i+3);for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');const counts=edges.get(key)||[0,0];counts[0]++;counts[1]+=a<b?1:-1;edges.set(key,counts);}}for(const v of edges.values())assert.deepEqual(v,[2,0]);}
for(const [name,opening,area]of [['solid',null,9],['window',[1,1,2,2.4],7.6],['door',[1,0,2,2.4],6.6]])test(name+' wall has closed outward geometry and matching collision volume',()=>{
 const m=wallVolume({id:name,a:[2,3],b:[5,3],base:2,height:3,thickness:.2,opening});closed(m);assert.ok(Math.abs(signedVolume(m)-area*.2)<1e-8);assert.ok(Math.abs(m.collision.reduce((s,c)=>s+Math.abs(polygonSignedArea(c.polygon))*(c.maxZ-c.minZ),0)-area*.2)<1e-8);
});
test('diagonal wall keeps physical thickness and full-height passage is empty',()=>{
 const m=wallVolume({id:'d',a:[0,0],b:[2,2],height:3,thickness:.25});closed(m);assert.ok(Math.abs(signedVolume(m)-Math.sqrt(8)*3*.25)<1e-8);
 assert.equal(wallVolume({id:'p',a:[0,0],b:[2,0],height:3,thickness:.25,opening:[0,0,2,3]}).indices.length,0);
 assert.throws(()=>wallVolume({id:'bad',a:[0,0],b:[1,0],height:3,thickness:.2,opening:[0,0,2,2]}),/fit/);
});
test('scene adapter preserves identity, explicit calibration and reports unknown apertures',()=>{
 const scene={levels:[{id:'l',index:1}],walls:[{id:'w',levelId:'l',x:1,y:2,axis:'N',tile:'plaster'}],openings:[{id:'o',hostWallId:'w',kind:'window',tile:'window'}]},original=structuredClone(scene),metrics={cellSize:2,storeyHeight:3,wallHeight:2.8,thickness:.2};
 assert.equal(sceneWallVolumes(scene,{},metrics).complete,false);
 const r=sceneWallVolumes(scene,{window:{TianWindowProfile:[.1,.2,.9,.7]}},metrics);assert.equal(r.complete,true);assert.equal(r.volumes[0].id,'w');assert.equal(r.volumes[0].openingId,'o');assert.deepEqual(scene,original);closed(r.volumes[0]);assert.throws(()=>sceneWallVolumes(scene,{},{}),/calibration/);
});

import {wallJunctions} from '../src/wall-junctions.js';
import {convexIntersectionArea,pointInPolygon} from '../src/polygon-footprint.js';
for(const [name,rays]of [['corner',[[2,0],[0,2]]],['T',[[2,0],[-2,0],[0,2]]],['cross',[[2,0],[-2,0],[0,2],[0,-2]]],['diagonal',[[2,0],[-2,2]]]])test(name+' junction has closed nonoverlapping physical partitions',()=>{
 const walls=rays.map((b,i)=>({id:String(i),levelId:'g',a:[0,0],b})),joins=wallJunctions(walls),meshes=walls.map(w=>wallVolume({...w,height:3,thickness:.2,junction:joins.get(w.id)}));
 for(const m of meshes){closed(m);const v=m.collision.reduce((s,c)=>s+Math.abs(polygonSignedArea(c.polygon))*(c.maxZ-c.minZ),0);assert.ok(Math.abs(signedVolume(m)-v)<1e-8);}
 for(let i=0;i<meshes.length;i++)for(let j=i+1;j<meshes.length;j++)for(const a of meshes[i].collision)for(const b of meshes[j].collision)assert.ok(convexIntersectionArea(a.polygon,b.polygon)<1e-8);
 // Every point in an original branch near its centre remains covered by the union.
 for(const b of rays){const len=Math.hypot(...b),t=b.map(v=>v/len),n=[-t[1],t[0]];for(const d of [.001,.05,.15])for(const side of [-.099,0,.099]){const p=[t[0]*d+n[0]*side,t[1]*d+n[1]*side];assert.ok(meshes.some(m=>m.collision.some(c=>pointInPolygon(p,c.polygon))),name+': uncovered '+p);}}
});
test('reversing a wall keeps joined volume while duplicate rays fail explicitly',()=>{
 const walls=[{id:'a',levelId:'g',a:[0,0],b:[2,0]},{id:'b',levelId:'g',a:[0,2],b:[0,0]}],joins=wallJunctions(walls);for(const w of walls)closed(wallVolume({...w,height:3,thickness:.2,junction:joins.get(w.id)}));
 assert.throws(()=>wallJunctions([...walls,{...walls[0],id:'duplicate'}]),/Overlapping/);
});

test('authored fixed glazing clears the whole host while unknown windows remain unresolved',()=>{
 const metrics={cellSize:2,storeyHeight:3,wallHeight:2.8,thickness:.2};
 for(const axis of ['N','W','D+','D-']){
  const materialAxis=axis==='W'?'W':'N',scene={levels:[{id:'g',index:0}],walls:[{id:'w',levelId:'g',x:0,y:0,axis,materialAxis,tile:'wall'}],openings:[{id:'o',hostWallId:'w',kind:'window',tile:'glass'}]},before=structuredClone(scene);
  const r=sceneWallVolumes(scene,{glass:{TianGlazing:'fixed',['Window'+materialAxis]:''}},metrics);
  assert.equal(r.complete,true);assert.equal(r.volumes[0].indices.length,0);
  assert.deepEqual(r.volumes[0].opening,[0,0,axis.startsWith('D')?Math.hypot(2,2):2,2.8]);assert.deepEqual(scene,before);
  assert.equal(sceneWallVolumes(scene,{glass:{MaterialType:'Glass'}},metrics).unresolved.length,1);
  assert.equal(sceneWallVolumes(scene,{glass:{TianGlazing:'fixed'}},metrics).unresolved.length,1);
 }
});
test('corner-clipped jamb stays closed, outward, and matches original wall minus aperture',()=>{
 for(const rays of [[[2,0],[0,2]],[[2,0],[-2,0],[0,2]],[[2,0],[-2,2]]]){
  const walls=rays.map((b,i)=>({id:String(i),levelId:'g',a:[0,0],b})),join=wallJunctions(walls).get('0'),options={id:'0',a:[0,0],b:[2,0],height:3,thickness:.4,junction:join},full=wallVolume(options),m=wallVolume({...options,opening:[.06,.4,1.8,2.4]});
  closed(m);assert.ok(signedVolume(m)>0);assert.ok(Math.abs(signedVolume(m)-m.collision.reduce((s,c)=>s+polygonSignedArea(c.polygon)*(c.maxZ-c.minZ),0))<1e-8);
  for(let x=-.39;x<2.3;x+=.037)for(let y=-.19;y<.2;y+=.041)for(const z of [.2,1,2.8]){
   const contains=cs=>cs.some(c=>z>c.minZ&&z<c.maxZ&&pointInPolygon([x,y],c.polygon));
   assert.equal(contains(m.collision),contains(full.collision)&&!(x>.06&&x<1.8&&z>.4&&z<2.4));
  }
 }
});
test('clipping preserves end-jamb orientation and rejects a completely inverted short wall',()=>{
 const options={id:'end',a:[2,2],b:[2,0],height:3,thickness:.4,junction:{start:[0,0],end:[1,-1]},opening:[.2,0,1.94,2.4]},m=wallVolume(options);closed(m);assert.equal(m.junctionClipped,true);assert.ok(signedVolume(m)>0);
 assert.throws(()=>wallVolume({id:'short',a:[0,0],b:[.1,0],height:3,thickness:.4,junction:{start:[-1,1],end:[0,0]},opening:[.01,0,.09,2]}),/junction/);
});
