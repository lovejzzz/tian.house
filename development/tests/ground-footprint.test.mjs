import test from 'node:test';import assert from 'node:assert/strict';
import {groundGeometry,groundContains,subtractConvex} from '../src/ground-footprint.js';
import {polygonSignedArea} from '../src/polygon-footprint.js';
import {World} from '../src/world.js';
const square={x:8006,y:11410,z:0,tiles:['paving','indoor']},triangle=[[0,0],[1,0],[0,1]],geometry={floors:[{...square,tile:'indoor',full:false,polygons:[triangle]}],walls:[]};
test('raised exterior excludes a chamfer interior with exact complementary area',()=>{
 const result=groundGeometry('paving',square,geometry);
 assert.equal(result.floors[0].polygons.reduce((n,p)=>n+Math.abs(polygonSignedArea(p)),0),.5);
 assert.equal(groundContains('paving',square,geometry,8006.2,11410.2),false);
 assert.equal(groundContains('paving',square,geometry,8006.8,11410.8),true);
 assert.equal(groundGeometry('paving',square,geometry),result);
});
test('multiple room triangles subtract without overlap or slivers',()=>{
 const unit=[[0,0],[1,0],[1,1],[0,1]],other=[[1,0],[1,1],[0,1]];
 const pieces=subtractConvex(unit,triangle).flatMap(p=>subtractConvex(p,other));assert.deepEqual(pieces,[]);
 assert.deepEqual(subtractConvex(unit,[...unit].reverse()),[]);
});
test('actor support follows the exterior half and does not lift the indoor floor',()=>{
 const world=new World({playableBounds:[8000,11400,8015,11420],cells:[]},{paving:{solidfloor:'',TianGroundHeight:'6'},indoor:{solidfloor:''}});
 world.setHousePlan({version:1,squares:[square],items:[],polygonGeometry:geometry});
 assert.equal(world.apparentZ({x:8006.2,y:11410.2,z:0}),0);
 assert.equal(world.apparentZ({x:8006.8,y:11410.8,z:0}),6/96);
});

test('asset ground profiles share geometry with actor height, even without room geometry',()=>{
 const properties={road:{solidfloor:''},cut:{solidfloor:'',TianGroundHeight:'6',TianGroundPolygon:JSON.stringify(triangle)}};
 const s={x:0,y:0,z:0,tiles:['road','cut']};
 const world=new World({playableBounds:[0,0,5,5],cells:[]},properties);
 world.setHousePlan({version:1,squares:[s],items:[]});
 assert.equal(world.apparentZ({x:.2,y:.2,z:0}),6/96);
 assert.equal(world.apparentZ({x:.8,y:.8,z:0}),0);
 assert.equal(groundGeometry('cut',s,null,properties).floors[0].full,false);
 assert.equal(groundContains('cut',s,null,.8,.8,properties),false);
 assert.equal(groundContains('road',s,null,.8,.8,properties),true);
 const changed={cut:{...properties.cut,TianGroundPolygon:JSON.stringify([[0,0],[1,0],[1,1],[0,1]])}};
 assert.equal(groundGeometry('cut',s,null,changed).floors[0].full,true);
});
test('invalid asset ground geometry fails instead of silently using a full tile',()=>{
 const s={x:0,y:0,z:0,tiles:['cut']};
 for(const polygon of ['null','[[0,0],[1,0],[2,1]]','[[0,0],[0,1],[1,0]]','[[0,0],[1,0],[0.3,0.3],[0,1]]'])assert.throws(()=>groundGeometry('cut',s,null,{cut:{TianGroundPolygon:polygon}}));
});
