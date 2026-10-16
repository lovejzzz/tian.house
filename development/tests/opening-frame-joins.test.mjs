import test from 'node:test';import assert from 'node:assert/strict';
import {openingFrameJoins} from '../src/opening-frame-joins.js';import {openingVolume} from '../src/opening-volume.js';import {pointInPolygon} from '../src/polygon-footprint.js';
const volumes=[{openingId:'a',levelId:'g',hostEndpoints:[[0,0],[1,0]],opening:[.06,0,1,2.6],base:0},{openingId:'b',levelId:'g',hostEndpoints:[[1,0],[2,0]],opening:[0,0,.94,2.6],base:0}],openings=['a','b'].map(id=>({id,assemblyId:'pair',kind:'door',tile:'steel'})),properties={steel:{TianDoorAssembly:'continuous'}};
test('continuous door pair has no fixed centre jamb and leaves clear passage when opened',()=>{
 const joins=openingFrameJoins(volumes,openings,properties);assert.deepEqual([...joins.values()],[[true,false],[false,true]]);
 const parts=volumes.flatMap((v,i)=>openingVolume({id:v.openingId,a:v.hostEndpoints[0],b:v.hostEndpoints[1],base:0,aperture:v.opening,kind:'door',frameWidth:.05,frameDepth:.1,panelDepth:.035,glazed:true,hingeSide:i?'end':'start',angle:i?-Math.PI/2:Math.PI/2,frameSides:joins.get(v.openingId)}));
 for(const x of [.5,.99,1,1.01,1.5])assert.equal(parts.some(p=>p.collision.some(c=>c.minZ<1&&c.maxZ>1&&pointInPolygon([x,0],c.polygon))),false);
});
test('continuous frames tolerate large world-coordinate roundoff',()=>{
 for(const v of volumes)openingVolume({id:v.openingId,a:v.hostEndpoints[0].map(c=>c+11400),b:v.hostEndpoints[1].map(c=>c+11400),base:0,aperture:v.opening,kind:'door',frameWidth:.05,frameDepth:.1,panelDepth:.035,frameSides:[true,false]});
});
test('unrelated, separated or differently elevated members keep their jambs',()=>{
 for(const changed of [volumes.map((v,i)=>({...v,base:i})),volumes.map((v,i)=>({...v,hostEndpoints:v.hostEndpoints.map(p=>[p[0]+i*.1,p[1]])}))])assert.deepEqual([...openingFrameJoins(changed,openings,properties).values()],[[true,true],[true,true]]);
 assert.deepEqual([...openingFrameJoins(volumes,openings.map((o,i)=>({...o,assemblyId:String(i)})),properties).values()],[[true,true],[true,true]]);
 assert.equal(openingFrameJoins(volumes,openings,{}).size,0);
});

test('multipart fixed picture glazing has continuous glass, unlike separate adjacent windows',()=>{
 const vs=volumes.map(v=>({...v,opening:[0,0,1,3]})),os=openings.map(o=>({...o,kind:'window',tile:'picture'})),ps={picture:{TianGlazing:'fixed'}};
 const joins=openingFrameJoins(vs,os,ps);assert.deepEqual([...joins.values()],[[true,false],[false,true]]);
 const parts=vs.flatMap(v=>openingVolume({id:v.openingId,a:v.hostEndpoints[0],b:v.hostEndpoints[1],base:0,aperture:v.opening,kind:'window',frameWidth:.05,frameDepth:.1,panelDepth:.008,frameSides:joins.get(v.openingId)}));
 for(const x of [.999,1.001]){assert.equal(parts.filter(p=>p.role==='frame').some(p=>p.collision.some(c=>c.minZ<1&&c.maxZ>1&&pointInPolygon([x,0],c.polygon))),false);assert.ok(parts.filter(p=>p.role==='glass').some(p=>p.collision.some(c=>c.minZ<1&&c.maxZ>1&&pointInPolygon([x,0],c.polygon))));}
 assert.equal(openingFrameJoins(vs,os.map(({assemblyId,...o})=>o),ps).size,0);
});

test('continuous fixed glass removes only internal render end faces, preserving collision and outer caps',()=>{
 const parts=[0,1].map(i=>openingVolume({id:String(i),a:[i,0],b:[i+1,0],base:0,aperture:[0,0,1,3],kind:'window',frameWidth:.05,frameDepth:.1,panelDepth:.008,frameSides:i?[false,true]:[true,false]})[1]);
 const onPlane=(m,x)=>{let count=0;for(let i=0;i<m.indices.length;i+=3)if(m.indices.slice(i,i+3).every(j=>Math.abs(m.vertices[j][0]-x)<1e-8))count++;return count;};
 for(const m of parts){assert.equal(onPlane(m,1),0);assert.ok(m.collision.some(c=>c.polygon.some(p=>Math.abs(p[0]-1)<1e-8)));}
 assert.ok(onPlane(parts[0],.05)>0);assert.ok(onPlane(parts[1],1.95)>0);
});
