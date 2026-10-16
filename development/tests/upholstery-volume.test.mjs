import test from 'node:test';import assert from 'node:assert/strict';
import {upholsteryVolume} from '../src/upholstery-volume.js';
import {segmentSolidInterval} from '../src/convex-solid.js';
test('padded volumes keep authored bounds and use the visible hull for collision',()=>{
 const p=upholsteryVolume({id:'seat',origin:[2,3,.4],size:[.8,.7,.16]});assert.ok(p.smoothNormals);assert.ok(p.vertices.length>100);assert.equal(p.collision.length,1);
 for(let i=0;i<3;i++){assert.ok(Math.abs(Math.min(...p.vertices.map(v=>v[i]))-[2,3,.4][i])<1e-9);assert.ok(Math.abs(Math.max(...p.vertices.map(v=>v[i]))-[2.8,3.7,.56][i])<1e-9);}
 assert.ok(segmentSolidInterval(p.collision[0],[2.4,3.35,1],[2.4,3.35,0]));
 assert.equal(segmentSolidInterval(p.collision[0],[1,2,1],[1,2,0]),null);
 assert.deepEqual(p,upholsteryVolume({id:'seat',origin:[2,3,.4],size:[.8,.7,.16]}));
});

test('tailored creases stay inside conservative padding and retain compact collision',()=>{
 const recipe={id:'seat:1',origin:[0,0,.4],size:[.8,.7,.16],creaseDepth:.008};
 const p=upholsteryVolume(recipe);assert.equal(p.softSupport,'seat');assert.match(p.collisionApproximation,/envelope/);
 assert.deepEqual(p,upholsteryVolume(recipe));
 const solid=p.collision[0],plain=upholsteryVolume({...recipe,creaseDepth:0});assert.deepEqual(solid,plain.collision[0]);
 for(const v of p.vertices)for(const plane of solid.planes){const distance=v.reduce((s,x,k)=>s+(x-solid.origin[k])*plane.normal[k],0);assert.ok(distance<=plane.distance+1e-7);}
 assert.throws(()=>upholsteryVolume({...recipe,creaseDepth:.1}),/crease depth/);
});
