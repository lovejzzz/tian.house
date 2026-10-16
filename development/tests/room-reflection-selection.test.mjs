import test from 'node:test';import assert from 'node:assert/strict';
import {roomReflectionIndex} from '../src/room-reflection-selection.js';
const regions=[
 {rect:[0,0,4,4],minZ:0,maxZ:3,position:[1,1,1.35]},
 {rect:[0,0,4,4],minZ:0,maxZ:3,position:[3,3,1.35]},
 {rect:[4,0,6,4],minZ:0,maxZ:3,position:[4.1,2,1.35]},
 {rect:[0,0,4,4],minZ:3,maxZ:6,position:[1,1,4.35]}];
test('reflection lookup remains in the room and floor even when another probe is closer',()=>{
 assert.equal(roomReflectionIndex([3.9,2,1],regions),1);
 assert.equal(roomReflectionIndex([4.2,2,1],regions),2);
 assert.equal(roomReflectionIndex([1,1,4],regions),3);
 assert.equal(roomReflectionIndex([8,8,1],regions),-1);
});
