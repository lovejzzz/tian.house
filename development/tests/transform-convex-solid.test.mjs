import test from 'node:test';import assert from 'node:assert/strict';
import {convexSolid,sweepSolidBox,segmentSolidInterval} from '../src/convex-solid.js';
import {transformConvexSolid} from '../src/transform-convex-solid.js';
import {readVolume} from './helpers/volume-delivery.mjs';
const part=readVolume('studio-sectional-sofa').geometry.parts.find(p=>p.id==='seat:0');
test('transformed delivered hull matches rebuilt geometry for four facings and nonuniform scale',()=>{
 for(const facing of [0,1,2,3]){
  const vector=([x,y,z])=>{const [a,b]=[[x,y],[-y,x],[-x,-y],[y,-x]][facing];return [a*1.7,b*1.7,z*1.3];},transform=p=>vector(p).map((v,i)=>v+[8000,11400,4][i]);
  const fast=transformConvexSolid(part.collision[0],transform,vector),reference=convexSolid({vertices:(part.collisionMesh??part).vertices.map(transform),indices:(part.collisionMesh??part).indices});
  for(let i=0;i<3;i++)for(const side of ['min','max'])assert.ok(Math.abs(fast.bounds[side][i]-reference.bounds[side][i])<1e-8);
  for(let i=0;i<100;i++){
   const a=transform([.8+(i%10)*.13,-.2+Math.floor(i/10)*.13,1]),b=transform([.8+(i%10)*.13,-.2+Math.floor(i/10)*.13,0]);
   for(const query of [s=>segmentSolidInterval(s,a,b),s=>sweepSolidBox(s,a,b,[.12,.16,.25])]){
    const actual=query(fast),expected=query(reference);assert.equal(!!actual,!!expected);if(actual)assert.ok(Math.abs(actual.enter-expected.enter)<1e-7);
   }
  }
 }
});
test('unsupported oblique collision transforms fail instead of dropping separating axes',()=>{
 assert.throws(()=>transformConvexSolid(part.collision[0],p=>p,([x,y,z])=>[x+y,y,z]),/axis permutation/);
});
