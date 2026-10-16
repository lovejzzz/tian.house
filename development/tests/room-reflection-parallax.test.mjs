import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {boxProjectedDirection,createReflectionParallax} from '../src/room-reflection-parallax.js';
const room={rect:[0,0,6,4],minZ:0,maxZ:3,position:[3,2,1.5]};
test('offset receiver samples the room-wall hit relative to capture origin',()=>{
 assert.deepEqual(boxProjectedDirection([1,1,1],[1,0,0],room),[3,-1,-.5]);
 assert.deepEqual(boxProjectedDirection([1,1,1],[-1,0,0],room),[-3,-1,-.5]);
 assert.deepEqual(boxProjectedDirection([1,1,1],[0,0,1],room),[-2,-1,1.5]);
});
test('parallel rays at boundaries stay finite, exterior and zero rays keep their direction',()=>{
 assert.deepEqual(boxProjectedDirection([0,1,1],[0,1,0],room),[-3,2,-.5]);
 assert.deepEqual(boxProjectedDirection([7,1,1],[1,0,0],room),[1,0,0]);
 assert.deepEqual(boxProjectedDirection([1,1,1],[0,0,0],room),[0,0,0]);
});
test('box projection has no sampler cost and updates existing uniforms on recapture',()=>{
 const projection=createReflectionParallax(),shader={uniforms:{},fragmentShader:THREE.ShaderLib.standard.fragmentShader};
 projection.install(shader);assert.equal(shader.uniforms.tianReflectionBoxEnabled.value,0);
 projection.setRegion(room);assert.deepEqual(shader.uniforms.tianReflectionOrigin.value.toArray(),room.position);
 assert.equal(shader.uniforms.tianReflectionBoxEnabled.value,1);
 assert.match(shader.fragmentShader,/tianBoxReflection\(reflectVec\)/);
 assert.equal((shader.fragmentShader.match(/uniform sampler/g)||[]).length,(THREE.ShaderLib.standard.fragmentShader.match(/uniform sampler/g)||[]).length);
 projection.setRegion(null);assert.equal(shader.uniforms.tianReflectionBoxEnabled.value,0);
});
