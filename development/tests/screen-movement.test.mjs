import test from 'node:test';
import assert from 'node:assert/strict';
import {screenMovement} from '../src/screen-movement.js';
const close=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-10));
test('up walks toward the camera target and right follows the screen after orbit',()=>{
 close(screenMovement(0,-1,0),[-1,0]);close(screenMovement(1,0,0),[0,1]);
 close(screenMovement(0,-1,Math.PI/2),[0,-1]);close(screenMovement(1,0,Math.PI/2),[-1,0]);
 close(screenMovement(0,-1,Math.PI),[1,0]);
});
test('orbit mapping preserves speed, diagonal normalization and opposite input',()=>{
 for(const yaw of [-3,-1,.82,2,4])for(const [x,y] of [[0,0],[1,0],[0,-1],[Math.SQRT1_2,Math.SQRT1_2]]){
  const v=screenMovement(x,y,yaw);assert.ok(Math.abs(Math.hypot(...v)-Math.hypot(x,y))<1e-10);
  close(screenMovement(-x,-y,yaw),v.map(n=>-n));
 }
});
