import test from 'node:test';import assert from 'node:assert/strict';
import {profiledRoofGeometry} from '../src/profiled-roof-geometry.js';
import {roofPresentation} from '../src/roof-presentation.js';
const geometry=[{id:'L',surfaceTile:'floor',closureTile:'wall',...profiledRoofGeometry({vertices:[[0,0],[6,0],[6,3],[3,3],[3,6],[0,6]],profile:{axis:'X',knots:[[0,1.4],[3,2.5],[6,1.8]]},baseElevation:1})}];
test('volume cutaway distinguishes the courtyard, covered interior and above-roof player',()=>{
 const targets=[],visibility={brightness:()=>.7,wallAlpha:(id,target)=>{targets.push([id,target]);return target;}};
 assert.deepEqual(roofPresentation(geometry,{x:4,y:4,z:0},visibility,{},.1).get('L'),{alpha:1,brightness:.7});
 assert.equal(roofPresentation(geometry,{x:1,y:1,z:0},visibility,{},.1).get('L').alpha,0);
 assert.equal(roofPresentation(geometry,{x:1,y:1,z:3},visibility,{},.1).get('L').alpha,1);
 assert.deepEqual(targets.map(t=>t[0]),['roof:L','roof:L','roof:L']);
});
test('unexplored roof does not become visible and one lit edge illuminates a coherent volume',()=>{
 const visibility={brightness:()=>0,wallAlpha:(_,target)=>target};assert.equal(roofPresentation(geometry,{x:8,y:4,z:0},visibility,{},.1).get('L').brightness,0);
 visibility.brightness=(x,y)=>x===6&&y===2?.5:0;assert.equal(roofPresentation(geometry,{x:8,y:4,z:0},visibility,{},.1).get('L').brightness,.5);
});
