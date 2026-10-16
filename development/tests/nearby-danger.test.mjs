import test from 'node:test';import assert from 'node:assert/strict';
import {nearbyDanger} from '../src/nearby-danger.js';
import {VolumeGameSpatial} from '../src/volume-game-spatial.js';
import {wallVolume} from '../src/wall-volume.js';
test('solid partition screens an unaware enemy, but not an alerted one',()=>{
 const state={player:{x:2,y:-1,z:0},zombies:[{x:2,y:1,z:0,hp:100,alert:0}]};
 const spatial=new VolumeGameSpatial({cellSize:1,storeyHeight:3});spatial.setVolumes([wallVolume({id:'w',a:[0,0],b:[5,0],height:3,thickness:.2})]);
 assert.equal(nearbyDanger(state,spatial),false);
 state.zombies[0].alert=1;assert.equal(nearbyDanger(state,spatial),true);
 state.zombies[0].alert=0;spatial.setVolumes([]);assert.equal(nearbyDanger(state,spatial),true);
 state.zombies[0].z=1;assert.equal(nearbyDanger(state,spatial),false);
 state.zombies[0].z=0;state.zombies[0].hp=0;assert.equal(nearbyDanger(state,spatial),false);
});
test('legacy and partial spatial adapters retain conservative radius behavior',()=>{
 const state={player:{x:0,y:0,z:0},zombies:[{x:2,y:1,z:0,hp:100,alert:0}]};
 assert.ok(nearbyDanger(state));assert.ok(nearbyDanger(state,{clearViewPoints:()=>false}));
 state.zombies[0].x=9;assert.equal(nearbyDanger(state),false);
});
