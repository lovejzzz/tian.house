import test from 'node:test';import assert from 'node:assert/strict';
import {windowPhase,WINDOW_START_TIME,WINDOW_FINISH_TIME,slideWindowAxis,advanceWindowPosition} from '../src/window-traversal.js';
import {AnimationBlend} from '../src/animation-blend.js';
test('source-derived phase events are distinct from clip end',()=>{
 assert.equal(windowPhase(WINDOW_START_TIME-1e-6).clip,'climbWindowStart');assert.equal(windowPhase(WINDOW_START_TIME).clip,'climbWindowEnd');
 const end=windowPhase(WINDOW_FINISH_TIME);assert.ok(end.finished);assert.ok(Math.abs(end.time-.8)<1e-10);
 const clock=new AnimationBlend({idle:2/3,climbWindowStart:.5,climbWindowEnd:4/3}),actor={windowMotion:{elapsed:.8}};
 const sample=clock.sample(actor,0);assert.equal(sample.clip,'climbWindowEnd');assert.ok(sample.time>0&&sample.time<.3);
 delete actor.windowMotion;assert.equal(clock.sample(actor,.1).clip,'idle');
});
test('sliding clamps and progresses in both directions without teleporting to cell center',()=>{
 assert.equal(slideWindowAxis(3.5,3.51,1),Math.fround(3.51));assert.equal(slideWindowAxis(3.5,3.49,1),Math.fround(3.49));
 for(const axis of ['x','y'])for(const sign of [-1,1]){
  const p={x:3.5,y:3.5},from={...p},to={...p,[axis]:p[axis]+sign},motion={elapsed:.6,from,to};
  advanceWindowPosition(p,motion,.1);assert.ok(Math.abs(p[axis]-3.5)<.16);assert.ok(sign*(p[axis]-3.5)>0);
  for(let i=0;i<10;i++)advanceWindowPosition(p,motion,.1);
  assert.equal(Math.floor(p[axis]),Math.floor(to[axis]));assert.notEqual(p[axis],to[axis]);
 }
});
