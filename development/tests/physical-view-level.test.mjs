import test from 'node:test';import assert from 'node:assert/strict';import {physicalViewLevel} from '../src/physical-view-level.js';
const levels=[{id:'upper',index:1},{id:'basement',index:-1},{id:'ground',index:0}];
test('view follows arrival/departure without chatter near slab or negative floors',()=>{
 assert.equal(physicalViewLevel(levels,'ground',3,3),'upper');assert.equal(physicalViewLevel(levels,'upper',2.99,3),'upper');assert.equal(physicalViewLevel(levels,'upper',2.7,3),'ground');assert.equal(physicalViewLevel(levels,'ground',-.1,3),'ground');assert.equal(physicalViewLevel(levels,'ground',-.4,3),'basement');assert.equal(physicalViewLevel(levels,'basement',0,3),'ground');assert.equal(physicalViewLevel(levels,'upper',10,3),'upper');
});
