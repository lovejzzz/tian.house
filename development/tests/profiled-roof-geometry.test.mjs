import test from 'node:test';import assert from 'node:assert/strict';
import {profiledRoofGeometry,roofProfileHeight} from '../src/profiled-roof-geometry.js';
import {polygonSignedArea,pointInPolygon} from '../src/polygon-footprint.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('asymmetric measured profiles retain both eaves and ridge without assuming a fixed pitch',()=>{
 const profile={axis:'X',knots:[[0,6.34],[4.28,7.55],[8.86,4.1]]};
 near(roofProfileHeight(profile,0),6.34);near(roofProfileHeight(profile,4.28),7.55);near(roofProfileHeight(profile,8.86),4.1);
 near(roofProfileHeight(profile,2.14),6.945);assert.throws(()=>roofProfileHeight(profile,9));
});
test('concave courtyard stays uncovered; every raised edge closes and all slope pieces stay planar',()=>{
 for(const axis of ['X','Y'])for(const shift of [0,8000]){
 const shape=[[0,0],[9,0],[9,4],[5,4],[5,9],[0,9]],vertices=shape.map(([x,y])=>[x+shift,y+shift]),profile={axis,knots:[[shift,4.1],[shift+4.28,7.55],[shift+9,6.34]]},g=profiledRoofGeometry({vertices,profile,baseElevation:3});
 near(g.footprintArea,61);near(g.slopes.reduce((s,p)=>s+Math.abs(polygonSignedArea(p.vertices.map(v=>v.slice(0,2)))),0),61);
 for(const face of g.slopes){const centre=[0,1].map(k=>face.vertices.reduce((s,p)=>s+p[k],0)/face.vertices.length);assert.equal(pointInPolygon(centre,vertices),true);const index=axis==='X'?1:0;for(const p of face.vertices){near(p[2],roofProfileHeight(profile,p[index]));assert.ok(p[index]>=profile.knots[face.segment][0]-1e-8&&p[index]<=profile.knots[face.segment+1][0]+1e-8);}}
 for(let edge=0;edge<vertices.length;edge++){const parts=g.closures.filter(c=>c.edge===edge);assert.ok(parts.length);const a=vertices[edge],b=vertices[(edge+1)%vertices.length];near(parts.reduce((s,c)=>s+Math.hypot(c.vertices[1][0]-c.vertices[0][0],c.vertices[1][1]-c.vertices[0][1]),0),Math.hypot(b[0]-a[0],b[1]-a[1]));for(const c of parts){near(c.vertices[0][2],3);near(c.vertices[1][2],3);}}
 }
});
test('roof profile rejects uncovered footprint, crossed outline and invalid heights',()=>{
 const request={vertices:[[0,0],[6,0],[6,6],[0,6]],baseElevation:3,profile:{axis:'Y',knots:[[0,4],[3,7],[6,5]]}};
 for(const profile of [{axis:'Z',knots:[[0,4],[6,5]]},{axis:'X',knots:[[0,4],[0,7]]},{axis:'X',knots:[[0,4],[6,Infinity]]},{axis:'X',knots:[[0,2],[6,5]]},{axis:'X',knots:[[0,4],[5,5]]}])assert.throws(()=>profiledRoofGeometry({...request,profile}));
 assert.throws(()=>profiledRoofGeometry({...request,vertices:[[0,0],[6,6],[0,6],[6,0]]}));
});
