import test from 'node:test';import assert from 'node:assert/strict';import {sweepSolidBox} from '../src/convex-solid.js';import {prismSolid} from '../src/prism-solid.js';import {wallVolume} from '../src/wall-volume.js';import {sceneRoofMeshes} from '../src/scene-roof-meshes.js';
const body=[.25,.25,.9];
const blockers=opening=>wallVolume({id:'wall',a:[0,0],b:[3,0],height:3,thickness:.02,opening}).collision.map(prismSolid);
const hit=(solids,a,b,size=body)=>solids.map(s=>sweepSolidBox(s,a,b,size)).filter(Boolean);
test('body fits wide doorway but cannot cross narrow jamb or lintel, even at high speed',()=>{
 assert.equal(hit(blockers([1,0,2,2.1]),[1.5,-100,.9],[1.5,100,.9]).length,0);
 assert.ok(hit(blockers([1.3,0,1.7,2.1]),[1.5,-100,.9],[1.5,100,.9]).length);
 assert.ok(hit(blockers([1,0,2,1.7]),[1.5,-100,.9],[1.5,100,.9]).length);
 const contacts=hit(blockers(null),[1.5,-100,.9],[1.5,100,.9]);assert.ok(contacts.length);assert.ok(Math.abs(Math.min(...contacts.map(h=>h.enter))-(100-.26)/200)<1e-8);
});
test('touching floor permits lateral movement and outward motion but blocks penetration',()=>{
 const floor=prismSolid({polygon:[[0,0],[3,0],[3,3],[0,3]],minZ:-.2,maxZ:0});
 assert.equal(sweepSolidBox(floor,[1,1,.9],[2,1,.9],body),null);assert.equal(sweepSolidBox(floor,[1,1,.9],[1,1,1.5],body),null);assert.ok(sweepSolidBox(floor,[1,1,.9],[1,1,.5],body));
});
test('sloped roof allows a crouched box where an upright body hits the skin',()=>{
 const roofs=sceneRoofMeshes({roofVolumes:[{id:'r',levelId:'g',elevationUnit:'storeys',vertices:[[0,0],[3,0],[3,3],[0,3]],baseElevation:0,profile:{axis:'X',knots:[[0,1.5],[3,3]]}}]},{cellSize:1,storeyHeight:1,roofThickness:.1,wallThickness:.1}).filter(m=>m.role==='roof').flatMap(m=>m.collision);
 assert.ok(hit(roofs,[1,.5,.9],[2,.5,.9]).length);assert.equal(hit(roofs,[1,.5,.5],[2,.5,.5],[.25,.25,.5]).length,0);
});
