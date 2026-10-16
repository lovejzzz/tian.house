import test from 'node:test';import assert from 'node:assert/strict';
import {prismSolid} from '../src/prism-solid.js';
import {solidsOverlap,validateVolumeObjectPlacement} from '../src/volume-placement-check.js';
const box=(x,y,z,w=1,d=1,h=1)=>prismSolid({polygon:[[x,y],[x+w,y],[x+w,y+d],[x,y+d]],minZ:z,maxZ:z+h});
test('convex placement accepts contact and rejects penetration, including far-origin geometry',()=>{
 assert.equal(solidsOverlap(box(8000,11400,0),box(8001,11400,0)),false);
 assert.equal(solidsOverlap(box(8000,11400,0),box(8000.9,11400,.9)),true);
 assert.equal(solidsOverlap(box(0,0,0),box(0,0,1)),false);
 const triangle=prismSolid({polygon:[[0,0],[2,0],[0,2]],minZ:0,maxZ:1});assert.equal(solidsOverlap(triangle,box(1.6,1.6,0,.2,.2)),false);
});
test('chair cannot interpenetrate low tabletop, but assembly support contact and hollow gaps are allowed',()=>{
 const moving=[{objectId:'chair',collision:[box(0,0,.42,.7,.7,.08)]}],obstacle=[{objectId:'table',collision:[box(0,0,.44,.8,.8,.03)]}];
 assert.equal(validateVolumeObjectPlacement(moving,obstacle,['chair']).ok,false);
 assert.equal(validateVolumeObjectPlacement(moving,obstacle,['chair','table']).ok,true);
 assert.equal(validateVolumeObjectPlacement([{objectId:'mug',collision:[box(0,0,.47,.1,.1,.1)]}],obstacle,['mug']).ok,true);
 const legs=[{objectId:'table',collision:[box(0,0,0,.1,.1),box(.9,0,0,.1,.1)]}];
 assert.equal(validateVolumeObjectPlacement([{objectId:'chair',collision:[box(.3,0,0,.2,.2)]}],legs,['chair']).ok,true);
});
