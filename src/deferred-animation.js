import * as THREE from 'three';
import {counterRotateBone,deferredRotationZ,closestBodyAngle,unwrapDeferredRotations} from './turning.js';

export function counterRotationTrack(name,times,values){
 const track=new THREE.QuaternionKeyframeTrack(name,times,values);
 track.createInterpolant=function(result){
  const interpolant=new THREE.QuaternionLinearInterpolant(this.times,this.values,4,result);
  const evaluate=interpolant.evaluate;
  interpolant.evaluate=function(time){const sample=evaluate.call(this,time);sample.set(counterRotateBone(sample));return sample;};
  return interpolant;
 };
 return track;
}

export function deferredRotationSampler(channel){
 const quaternions=channel.values.map(([w,x,y,z])=>[x,y,z,-w]);
 const track=new THREE.QuaternionKeyframeTrack('rotation',channel.times,quaternions.flat());
 const interpolant=track.createInterpolant(),unwrapped=unwrapDeferredRotations(quaternions);
 return (time,cycle=0)=>{
  let index=0;while(index+1<channel.times.length&&channel.times[index+1]<=time)index++;
  const local=unwrapped[index]+closestBodyAngle(deferredRotationZ(quaternions[index]),deferredRotationZ(interpolant.evaluate(time)));
  return local+cycle*unwrapped.at(-1);
 };
}
