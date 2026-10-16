import test from 'node:test';import assert from 'node:assert/strict';
import {groundBoundaryFaces,drawGroundBoundary} from '../src/ground-boundary.js';
const p={low:{solidfloor:'',TianGroundHeight:'4'},high:{solidfloor:'',TianGroundHeight:'8'},flat:{solidfloor:''}};
const square=(x,y,tile='high',z=0)=>({x,y,z,tiles:[tile]});
test('a contiguous terrace has no interior risers and only its outer perimeter is drawn',()=>{
 const cells=[square(0,0),square(1,0),square(0,1),square(1,1)],lookup=(x,y,z)=>cells.find(s=>s.x===x&&s.y===y&&s.z===z);
 assert.deepEqual(groundBoundaryFaces(cells[0],p,lookup),[]);
 const faces=cells.flatMap(s=>groundBoundaryFaces(s,p,lookup));assert.equal(faces.length,4);assert(faces.every(f=>f.height===8));
});
test('different platform heights expose only the difference, including basement coordinates',()=>{
 const faces=groundBoundaryFaces(square(9000,11400,'high',-1),p,(x,y,z)=>square(x,y,'low',z));
 assert.equal(faces.length,2);assert(faces.every(f=>f.height===4));
 assert.equal(faces[0].vertices[0][2],-1+4/96);assert.equal(faces[0].vertices[2][2],-1+8/96);
 assert.deepEqual(groundBoundaryFaces(square(0,0,'low'),p,(x,y,z)=>square(x,y,'high',z)),[]);
});
test('destroyed adjacent support reveals a riser and draw applies ghost-layer height consistently',()=>{
 const paths=[];let path;const ctx={save(){},restore(){},beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},closePath(){},fill(){paths.push(path);}};
 const r={ctx,world:{properties:p,state:(x,y,z,tile)=>({destroyed:x===1}),square:(x,y,z)=>square(x,y,'high',z)},project:(x,y,z)=>({x:x-y,y:(x+y)/2-z*96})};
 drawGroundBoundary(r,'high',square(0,0),1,1,1);
 assert.equal(paths.length,1);assert.deepEqual(paths[0][0],[1,-95.5]);assert.deepEqual(paths[0][3],[1,-103.5]);
});
test('a chamfer has a diagonal riser, without full-cell faces or triangulation seams',()=>{
 const s=square(8000,11400),geometry={floors:[{...s,tile:'high',full:false,polygons:[[[0,0],[1,0],[0,1]]]}]},lookup=(x,y,z)=>x===s.x&&y===s.y?s:null;
 const faces=groundBoundaryFaces(s,p,lookup,geometry);
 assert.equal(faces.length,1);assert.equal(faces[0].axis,'D');assert.deepEqual(faces[0].vertices[0],[8001,11400,0]);assert.deepEqual(faces[0].vertices[1],[8000,11401,0]);
 const whole={floors:[{...s,tile:'high',full:false,polygons:[[[0,0],[1,0],[0,1]],[[1,0],[1,1],[0,1]]]}]};
 const outer=groundBoundaryFaces(s,p,lookup,whole);assert.equal(outer.length,2);assert(outer.every(f=>f.axis!=='D'));
});
test('a partially supported neighbor splits the exposed edge at the actual height transition',()=>{
 const s=square(0,0),n=square(1,0,'low'),lookup=(x,y)=>x===0&&y===0?s:x===1&&y===0?n:null;
 const geometry={floors:[{...n,tile:'low',full:false,polygons:[[[0,0],[1,0],[1,.5],[0,.5]]]}]};
 const east=groundBoundaryFaces(s,p,lookup,geometry).filter(f=>f.axis==='E');assert.equal(east.length,2);assert.deepEqual(east.map(f=>f.height),[4,8]);assert.equal(east[0].vertices[1][1],.5);
});

test('asset-shaped neighboring platform exposes the unsupported portion without room geometry',()=>{
 const props={...p,low:{...p.low,TianGroundPolygon:'[[0,0],[1,0],[1,0.5],[0,0.5]]'}};
 const s=square(0,0),n=square(1,0,'low'),lookup=(x,y)=>x===0&&y===0?s:x===1&&y===0?n:null;
 const east=groundBoundaryFaces(s,props,lookup).filter(f=>f.axis==='E');
 assert.deepEqual(east.map(f=>f.height),[4,8]);
 assert.equal(east[0].vertices[1][1],.5);
});
