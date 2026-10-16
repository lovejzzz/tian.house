import test from 'node:test';
import assert from 'node:assert/strict';
import {doorwayVelocity} from '../src/doorway-steering.js';
import {wallVolume} from '../src/wall-volume.js';
import {openingVolume} from '../src/opening-volume.js';
import {prismSolid} from '../src/prism-solid.js';
import {movePhysicalBody} from '../src/physical-body.js';
const host={hostEndpoints:[[0,0],[1,0]],opening:[.0625,0,.828125,2.35]};
test('approach keeps speed and yields to intentional sideways input or retreat',()=>{
 const v=doorwayVelocity([.75,-.6,.9],[0,2],host);assert.ok(v[0]<0);assert.ok(Math.abs(Math.hypot(...v)-2)<1e-9);
 for(const [p,v]of [[[.75,-.6,.9],[1,2]],[[.75,-.6,.9],[0,-2]],[[.75,-2,.9],[0,2]]])assert.deepEqual(doorwayVelocity(p,v,host),v);
 assert.deepEqual(doorwayVelocity([.5,-.5,.9],[0,2],{...host,opening:[.2,0,.6,2]}),[0,2]);
});
test('offset approach traverses real narrow jambs without shrinking body or bypassing collisions',()=>{
 const wall=wallVolume({id:'w',a:[0,0],b:[1,0],base:0,height:3,thickness:.2,opening:host.opening});
 const door=openingVolume({id:'d',a:[0,0],b:[1,0],base:0,aperture:host.opening,kind:'door',frameWidth:.05,frameDepth:.1,panelDepth:.035,angle:Math.PI/2});
 const solids=[wall,...door].flatMap(v=>v.collision.map(prismSolid));
 let p=[.75,-.8,.901];
 for(let i=0;i<120;i++){const v=doorwayVelocity(p,[0,2],host);p=movePhysicalBody(solids,p,[v[0]/60,v[1]/60,0],[.25,.25,.9]).position;}
 assert.ok(p[1]>1,JSON.stringify(p));
});
