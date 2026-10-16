import test from 'node:test';import assert from 'node:assert/strict';
import {AnimationClock,sampleClip} from '../src/animation-clock.js';
test('loops at the imported duration, not a fixed one or three seconds',()=>{
 const c=new AnimationClock({idle:2/3,walk:.8,run:.5}),a={};c.sample(a,0);
 assert.equal(c.sample(a,.5).time,.5);assert.equal(c.sample(a,2/3).time,0);assert.equal(c.sample(a,2/3).cycle,1);
 a.moving=true;c.sample(a,1);assert.equal(c.sample(a,1.75).time,.75);assert.ok(c.sample(a,1.81).time<.02);
 a.running=true;c.sample(a,2);assert.equal(c.sample(a,2.5).cycle,1);
});
test('actors have independent starts; pause, transition and time reset are deterministic',()=>{
 const c=new AnimationClock({idle:2/3,walk:2/3,run:2/3}),a={},b={};c.sample(a,10);c.sample(b,10.25);
 assert.equal(c.sample(a,10.5).time,.5);assert.equal(c.sample(b,10.5).time,.25);
 const frozen=c.sample(a,10.5);assert.deepEqual(c.sample(a,10.5),frozen);
 a.moving=true;assert.equal(c.sample(a,10.5).time,0);assert.equal(c.sample(b,10.5).time,.25);
 assert.equal(c.sample(a,1).time,0);assert.equal(c.sample({},10.5).time,0);
});
test('short clips remain in range and invalid timing fails explicitly',()=>{
 const c=new AnimationClock({idle:.01}),a={};c.sample(a,0);assert.equal(c.sample(a,.009).time,0);
 assert.throws(()=>new AnimationClock({idle:0}));assert.throws(()=>new AnimationClock({idle:1},0));assert.throws(()=>c.sample(a,NaN));
});
test('rate changes preserve phase and zero rate freezes clip time',()=>{
 const c=new AnimationClock({idle:2/3}),a={};c.sample(a,0,.48);
 assert.equal(c.sample(a,1,1.04).time,28/60);
 assert.equal(c.sample(a,1,0).time,28/60);
 assert.equal(c.sample(a,10,1.04).time,28/60);
 assert.equal(c.sample(a,10.5,1.04).cycle,1);
 assert.throws(()=>c.sample(a,11,-1));assert.throws(()=>c.sample(a,11,Infinity));
});
test('one-shot clips hold their exact endpoint instead of looping or losing the last key',()=>{
 const d=5/6;
 assert.equal(sampleClip('start',d-.01,d,{loop:false}).ended,false);
 for(const t of [d,1,50]){const s=sampleClip('start',t,d,{loop:false});assert.equal(s.time,d);assert.equal(s.ended,true);assert.equal(s.cycle,0);}
 assert.equal(sampleClip('loop',d,d).time,0);
 assert.equal(sampleClip('stop',-1,1,{loop:false}).time,0);
 assert.throws(()=>sampleClip('bad',NaN,1));
});
