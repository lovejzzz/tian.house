import test from 'node:test';import assert from 'node:assert/strict';
import {profiledRoofGeometry} from '../src/profiled-roof-geometry.js';
import {roofRenderFaces} from '../src/roof-render.js';import {polygonSignedArea} from '../src/polygon-footprint.js';
test('roof render pieces preserve area, heights, closure lengths and stable cached ownership',()=>{
 const source={vertices:[[8000,11000],[8006,11000],[8006,11003],[8003,11003],[8003,11006],[8000,11006]],profile:{axis:'X',knots:[[11000,1.4],[11003.2,2.5],[11006,1.8]]},baseElevation:1};
 const geometry=[{id:'r',surfaceTile:'floor',closureTile:'wall',...profiledRoofGeometry(source)}],faces=roofRenderFaces(geometry);assert.equal(roofRenderFaces(geometry),faces);
 const slopes=faces.filter(f=>f.roofFace.kind==='slope');assert.ok(slopes.length>27);const area=slopes.reduce((s,f)=>s+Math.abs(polygonSignedArea(f.roofFace.vertices.map(p=>p.slice(0,2)))),0);assert.ok(Math.abs(area-27)<1e-8);
 for(const f of slopes)for(const p of f.roofFace.vertices){assert.ok(p[0]>=f.x&&p[0]<=f.x+1&&p[1]>=f.y&&p[1]<=f.y+1);assert.ok(Math.abs(p[2]-f.roofFace.height(p[0],p[1]))<1e-8);}
 const closures=faces.filter(f=>f.roofFace.kind==='closure');assert.equal(closures.reduce((s,f)=>{const [a,b]=f.roofFace.vertices;return s+Math.hypot(b[0]-a[0],b[1]-a[1]);},0),24);
 assert.deepEqual(roofRenderFaces(undefined),[]);
});
