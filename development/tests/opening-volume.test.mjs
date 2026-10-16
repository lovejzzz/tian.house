import test from 'node:test';import assert from 'node:assert/strict';import {openingVolume} from '../src/opening-volume.js';
const spec={id:'window',a:[0,0],b:[3,0],base:3,aperture:[.4,.8,2.6,2.5],kind:'window',frameWidth:.05,frameDepth:.1,panelDepth:.008};
test('window frame and glass fit the aperture with independent identity and physical depth',()=>{const [frame,glass]=openingVolume(spec);assert.equal(frame.openingId,'window');assert.equal(glass.role,'glass');assert.equal(frame.thickness,.1);assert.equal(glass.thickness,.008);for(const part of [frame,glass])for(const [x,y,z]of part.vertices){assert.ok(x>=.4-1e-8&&x<=2.6+1e-8&&Math.abs(y)<=.05+1e-8&&z>=3.8-1e-8&&z<=5.5+1e-8);}assert.ok(frame.collision.length>glass.collision.length);});
test('door has no raised sill and pivot rotates leaf geometry and collision together',()=>{const [frame,leaf]=openingVolume({...spec,kind:'door',aperture:[.4,0,2.6,2.5],angle:Math.PI/2});assert.equal(Math.min(...leaf.vertices.map(v=>v[2])),3);assert.ok(leaf.vertices.every(v=>Math.abs(v[0]-.45)<.01));assert.ok(leaf.collision.every(c=>c.polygon.every(p=>Math.abs(p[0]-.45)<.01)));assert.equal(frame.opening[1],0);});
test('oversized frames and invalid poses reject instead of silently filling the opening',()=>{assert.throws(()=>openingVolume({...spec,frameWidth:2}),/fit/);assert.throws(()=>openingVolume({...spec,angle:NaN}),/Invalid/);});

test('glazed door preserves a hollow metal leaf and glass at either hinge',()=>{
 for(const hingeSide of ['start','end'])for(const angle of [0,Math.PI/2]){
  const parts=openingVolume({...spec,kind:'door',aperture:[.4,0,2.6,2.5],panelDepth:.035,glazed:true,hingeSide,angle});
  assert.deepEqual(parts.map(p=>p.role),['frame','leaf-frame','glass']);
  const leaf=parts[1],glass=parts[2];assert.ok(leaf.opening);assert.equal(glass.thickness,.008);
  const pivot=hingeSide==='start'?.45:2.55;
  if(angle){for(const part of [leaf,glass]){assert.ok(part.vertices.every(p=>Math.abs(p[0]-pivot)<.018));assert.ok(part.collision.every(c=>c.polygon.every(p=>Math.abs(p[0]-pivot)<.018)));}}
  else for(const p of glass.vertices)assert.ok(p[0]>.49&&p[0]<2.51);
 }
 assert.throws(()=>openingVolume({...spec,hingeSide:'guess'}),/Invalid/);
});
