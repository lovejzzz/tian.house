import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFootprintPolygon,polygonSignedArea,compilePolygonFootprint,chamferRectangle,pointInPolygon,boundaryBlocksMovement,wallCrossesBox} from '../src/polygon-footprint.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('four chamfer orientations preserve area, partial floors and closed physical wall lengths',()=>{
 for(const corner of ['NW','NE','SE','SW']){
  const outline=chamferRectangle([0,0,9,7],corner,3),p=compilePolygonFootprint(outline);
  near(p.area,58.5);assert.equal(p.cells.filter(c=>!c.full).length,3);
  for(const c of p.cells){assert.ok(c.area>0&&c.area<=1+1e-9);near(c.polygons.reduce((n,v)=>n+polygonSignedArea(v),0),c.area);for(const v of c.polygons)for(const xy of v)assert.ok(xy.every(n=>n>=-1e-9&&n<=1+1e-9));}
  for(let i=0;i<p.edges.length;i++)assert.deepEqual(p.edges[i].b,p.edges[(i+1)%p.edges.length].a);
  near(p.edges.reduce((n,e)=>n+e.length,0),26+3*Math.SQRT2);
  assert.equal(p.edges.filter(e=>e.axis.startsWith('D')).length,3);
 }
});
test('floor clipping is translation invariant near source map coordinates and supported coordinate limits',()=>{
 for(const [w,h,d]of [[16,17,15],[17,19,1],[17,19,2],[9,7,3]])for(const corner of ['NW','NE','SE','SW']){
  const origin=compilePolygonFootprint(chamferRectangle([0,0,w,h],corner,d));
  for(const [dx,dy]of [[8000,11400],[9999900,9999900],[-9999900,-9999900]]){
   const translated=compilePolygonFootprint(origin.vertices.map(([x,y])=>[x+dx,y+dy]));near(translated.area,origin.area);
   assert.deepEqual(translated.cells.map(c=>({...c,x:c.x-dx,y:c.y-dy})),origin.cells);
  }
 }
});
test('concave outline keeps its notch empty and normalization ignores start corner and winding',()=>{
 const vertices=[[0,0],[6,0],[6,2],[3,2],[3,5],[0,5]],a=compilePolygonFootprint(vertices);
 near(a.area,21);assert.equal(a.cells.length,21);assert.ok(a.cells.every(c=>c.full));assert.ok(!a.cells.some(c=>c.x===4&&c.y===3));
 assert.deepEqual(compilePolygonFootprint([...vertices].reverse()),a);
 assert.deepEqual(normalizeFootprintPolygon([[3,0],...vertices.slice(1),vertices[0],[3,0]]),vertices);
 assert.equal(pointInPolygon([4,3],vertices),false);assert.equal(pointInPolygon([3,3],vertices),true);assert.equal(pointInPolygon([3,3],vertices,{boundary:false}),false);
});
test('invalid footprints fail before producing floor or walls',()=>{
 for(const vertices of [[[0,0],[4,4],[0,4],[4,0]],[[0,0],[4,0],[2,0],[2,2],[0,2]],[[0,0],[3,2],[0,3]],[[0,0],[0,0],[3,3]],[[0,0],[1.5,0],[0,2]]])assert.throws(()=>compilePolygonFootprint(vertices));
 assert.throws(()=>compilePolygonFootprint([[0,0],[4,0],[4,4],[0,4]],{bounds:[0,0,4,4]}),/space/);
 assert.throws(()=>compilePolygonFootprint([[0,0],[400,0],[400,400],[0,400]]),/budget/);
 assert.throws(()=>chamferRectangle([0,0,4,4],'NW',4),/smaller/);
});
test('swept actor footprint blocks same-cell diagonal crossings and tunneling, with symmetric motion',()=>{
 const edges=[{a:[0,0],b:[1,1]}];
 for(const [a,b,r,blocked]of [[[.2,.8],[.8,.2],0,true],[[.1,.5],[.2,.6],.1,false],[[.2,.4],[.3,.5],.11,true],[[-2,2],[2,-2],.18,true],[[.4,.4],[.4,.4],.18,true],[[2,2],[2,2],.18,false]]){
  assert.equal(boundaryBlocksMovement(edges,a,b,r),blocked);assert.equal(boundaryBlocksMovement(edges,b,a,r),blocked);
 }
 assert.equal(wallCrossesBox([0,0],[1,1],[.4,.4,.6,.6]),true);assert.equal(wallCrossesBox([0,0],[1,1],[.1,.6,.2,.8]),false);
 assert.throws(()=>boundaryBlocksMovement(edges,[0,0],[1,1],-1),/Invalid/);
});
