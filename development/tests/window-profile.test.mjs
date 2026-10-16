import test from 'node:test';
import assert from 'node:assert/strict';
import {windowProfile,windowAperture,windowSurroundRectangles} from '../src/window-profile.js';

test('window profiles are explicit, immutable, finite and nondegenerate',()=>{
 assert.equal(windowProfile({}),null);
 const rect=[.1,.08,.8,.9],copy=windowProfile({TianWindowProfile:rect});copy[0]=0;assert.equal(rect[0],.1);
 assert.deepEqual(windowProfile({TianWindowProfile:JSON.stringify(rect)}),rect);
 for(const bad of [null,{},'invalid',[0,0,1],[0,0,NaN,1],[0,0,Infinity,1],[-.1,0,1,1],[0,0,1,1.1],[.5,0,.5,1],[.8,0,.2,1],[0,.9,1,.1]]){
  assert.throws(()=>windowProfile({TianWindowProfile:bad}),/Invalid window profile/);
 }
});

test('tall and offset windows preserve all surrounding wall without overlapping the hole',()=>{
 for(const length of [1,Math.SQRT2,2])for(const profile of [[.12,.1,.88,.86],[.05,.2,.6,.95],[0,0,1,1]]){
  const a=windowAperture(profile,length),rects=windowSurroundRectangles(profile,length);
  assert.ok(Math.abs(rects.reduce((sum,r)=>sum+r[2]*r[3],0)+a.width*(a.bottom-a.top)-length)<1e-12);
  for(const [x,y,w,h]of rects){
   assert.ok(x>=0&&y>=0&&x+w<=length+1e-12&&y+h<=1);
   const overlapX=Math.max(0,Math.min(x+w,a.right)-Math.max(x,a.left));
   const overlapY=Math.max(0,Math.min(y+h,a.bottom)-Math.max(y,a.top));
   assert.ok(overlapX*overlapY<1e-12);
  }
  assert.ok(Math.abs(a.t0*length-a.left)<1e-12);
  assert.ok(Math.abs(a.t1*length-a.right)<1e-12);
 }
 const shifted=windowAperture([.05,.1,.6,.9],Math.SQRT2);
 assert.notEqual(shifted.center,Math.SQRT2/2,'an asymmetric aperture must not silently recenter');
 for(const length of [0,.9,NaN,Infinity])assert.throws(()=>windowAperture([0,0,1,1],length));
});
