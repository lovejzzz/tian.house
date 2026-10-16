import test from 'node:test';import assert from 'node:assert/strict';
import {AnimationBlend,animationWeight} from '../src/animation-blend.js';
const make=()=>new AnimationBlend({idle:2/3,walk:2/3,run:2/3});
test('direct transition keeps outgoing pose and reaches incoming over .3 seconds',()=>{
 const b=make(),a={};b.sample(a,0);b.sample(a,1);a.moving=true;
 let s=b.sample(a,1);assert.deepEqual(s.layers.map(l=>l.weight),[1,0]);
 s=b.sample(a,1.15);assert.deepEqual(s.layers.map(l=>l.weight),[.5,.5]);
 assert.ok(s.layers[0].time>0);assert.ok(s.layers[1].time>0);
 assert.deepEqual(b.sample(a,1.15),s);s=b.sample(a,1.31);assert.equal(s.layers.length,1);assert.equal(s.layers[0].weight,1);
});
test('reversal preserves weights and actors remain independent',()=>{
 const b=make(),a={},other={};b.sample(a,0);b.sample(other,0);a.moving=true;b.sample(a,1);let s=b.sample(a,1.1);
 a.moving=false;const reversed=b.sample(a,1.1);assert.deepEqual(reversed.layers,s.layers);
 assert.equal(b.sample(a,1.5).layers[0].clip,'idle');assert.equal(b.sample(other,1.5).layers.length,1);
 assert.equal(b.sample(a,.1).layers[0].weight,1);
});
test('dedicated transition clips and zombie graph are not falsely replaced by generic fades',()=>{
 const b=make(),a={};b.sample(a,0);a.moving=a.running=true;
 assert.equal(b.sample(a,1).layers.length,1);
 a.running=false;b.sample(a,2,true);a.moving=false;assert.equal(b.sample(a,3,true).layers.length,1);
 assert.equal(animationWeight(0),0);assert.equal(animationWeight(.5),.5);assert.equal(animationWeight(1),1);
});
const complete=()=>new AnimationBlend({idle:2/3,walk:2/3,run:2/3,idleToRun:5/6,runToStop:1});
test('run starts with its dedicated clip and rewinds the main loop during the tail',()=>{
 const b=complete(),a={};b.sample(a,0);a.moving=a.running=true;
 assert.equal(b.sample(a,1).transition,'idleToRun');
 const s=b.sample(a,1.2);assert.equal(s.layers.length,1);assert.equal(s.layers[0].clip,'idleToRun');assert.deepEqual(b.sample(a,1.2),s);
 const end=1+(5/6)/1.04,tail=b.sample(a,end-.05);
 assert.ok(tail.layers.some(l=>l.clip==='run'&&l.weight>0&&l.weight<1));
 const finished=b.sample(a,end+.001);assert.equal(finished.layers.length,1);assert.equal(finished.layers[0].clip,'run');assert.ok(finished.time<.02);
 assert.equal(b.sample(a,end+.1).layers[0].clip,'run');
 a.moving=false;assert.equal(b.sample(a,end+.2).transition,'runToStop');
 assert.equal(b.sample(a,end+.8).layers[0].clip,'runToStop');
 assert.equal(b.sample(a,end+1.3).layers[0].clip,'idle');
});
test('interrupting a dedicated clip settles on the new input without replaying it',()=>{
 const b=complete(),a={};b.sample(a,0);a.moving=a.running=true;b.sample(a,1);b.sample(a,1.2);
 a.running=false;const s=b.sample(a,1.2);assert.ok(s.layers.some(l=>l.clip==='idleToRun'));
 const settled=b.sample(a,1.5);assert.equal(settled.layers.length,1);assert.equal(settled.layers[0].clip,'walk');
 a.moving=false;assert.ok(b.sample(a,1.6).layers.every(l=>l.clip!=='idleToRun'));
});
test('construction uses its imported loop at source speed and blend, freezes with action elapsed and returns to idle',()=>{
 const b=new AnimationBlend({idle:2/3,build:1},{build:{speed:.8,blendTime:.4,loop:true}}),a={buildMotion:{elapsed:.2,turn:null}};
 const half=b.sample(a,1);assert.equal(half.transition,'build');assert.deepEqual(half.layers.map(l=>[l.clip,l.weight]),[['idle',.5],['build',.5]]);assert.equal(half.time,9/60);assert.deepEqual(b.sample(a,8),half);
 a.buildMotion.elapsed=1.5;const loop=b.sample(a,9);assert.equal(loop.cycle,1);assert.equal(loop.layers.length,1);assert.equal(loop.time,.2);
 delete a.buildMotion;assert.equal(b.sample(a,10).clip,'idle');
});
