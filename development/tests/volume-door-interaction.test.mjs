import test from 'node:test';
import assert from 'node:assert/strict';
import {wallVolume} from '../src/wall-volume.js';
import {openingVolume} from '../src/opening-volume.js';
import {nearbyVolumeDoor,doorPoseOverlapsBody} from '../src/volume-door-interaction.js';
const args={id:'door',a:[0,0],b:[1,0],base:0,aperture:[.1,0,.9,2.2],kind:'door',frameWidth:.05,frameDepth:.1,panelDepth:.035};
const host={...wallVolume({id:'host',a:args.a,b:args.b,base:0,height:3,thickness:.2,opening:args.aperture}),hostEndpoints:[args.a,args.b],opening:args.aperture,openingId:'door',base:0};
const parts=openingVolume(args),ids=new Set(['door']);
test('door can be reached from either side but not another floor or far away',()=>{
 for(const y of [-.6,.6])assert.equal(nearbyVolumeDoor([.5,y,.9],[host,...parts],ids,new Map()).id,'door');
 assert.equal(nearbyVolumeDoor([.5,0,3.9],[host,...parts],ids,new Map()),null);
 assert.equal(nearbyVolumeDoor([.5,3,.9],[host,...parts],ids,new Map()),null);
 assert.equal(nearbyVolumeDoor([.5,.6,.9],[host,...parts],ids,new Map([['door',90]])).action,'Close door');
});
test('solid partition prevents reaching through walls',()=>{
 const barrier=wallVolume({id:'partition',a:[0,.3],b:[1,.3],base:0,height:3,thickness:.1});
 assert.equal(nearbyVolumeDoor([.5,.6,.9],[host,...parts,barrier],ids,new Map()),null);
});
test('pose cannot end intersecting the person in the doorway',()=>{
 assert.equal(doorPoseOverlapsBody(parts,[.5,0,.9],[.25,.25,.9]),true);
 assert.equal(doorPoseOverlapsBody(parts,[.5,.8,.9],[.25,.25,.9]),false);
});
test('interaction preparation retains raw floor polygon data for spawn consumers',async()=>{
 const {prepareDoorInteractionVolumes}=await import('../src/volume-door-interaction.js');
 const floor={roomId:'room',collision:[{polygon:[[0,0],[1,0],[1,1],[0,1]],minZ:-.2,maxZ:0}]};
 const copy=structuredClone(floor),prepared=prepareDoorInteractionVolumes([floor]);
 assert.equal(prepared[0].collision[0].kind,'convex');
 assert.deepEqual(floor,copy);
});
