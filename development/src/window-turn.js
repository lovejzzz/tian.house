import {deferredRotationSampler} from './deferred-animation.js';
import {closestBodyAngle,interpolateBodyAngle} from './turning.js';
import {animationWeight} from './animation-blend.js';
const caches=new WeakMap();
function sampler(data,clip){let cache=caches.get(data);if(!cache){cache={};caches.set(data,cache);}return cache[clip]??=(deferredRotationSampler(data.animations[clip].find(c=>c.bone==='Bip01'&&c.kind===0)));}
function choose(delta){return `turnIdle${Math.abs(delta)*180/Math.PI>110?'180':'90'}${delta<0?'L':'R'}`;}
// Standing, non-aiming player path. Partial bone weights, torso twist during
// small turns, modifiers and full action-group arbitration remain unverified.
export function startWindowTurn(data,angle,target){
 const delta=closestBodyAngle(angle,target);
 // Character constructor initializes maxTwist to 15 degrees; effective idle
 // graph overrides remain to be verified. shouldBeTurning uses excess >1.
 if(Math.abs(delta)*180/Math.PI<=16||!data)return null;
 const clip=choose(delta);
 if(!data.animations?.[clip]?.some(c=>c.bone==='Bip01'&&c.kind===0))return null;
 return {target,clip,elapsed:0,clipElapsed:0,weight:0,remaining:delta};
}
export function advanceWindowTurn(data,player,motion,dt){
 const metadata=data.animationMetadata[motion.clip],duration=metadata.duration,rate=metadata.speed;
 const sample=sampler(data,motion.clip),at=time=>metadata.loop?sample(time%duration,Math.floor(time/duration)):sample(Math.min(time,duration));
 const previous=motion.clipElapsed;motion.elapsed+=dt;motion.clipElapsed+=dt*rate;
 motion.weight=animationWeight(Math.min(1,motion.elapsed/.1));
 const result=interpolateBodyAngle({angle:player.angle,target:motion.target,step:Math.min(Math.fround(.15)*Math.fround(Math.fround(dt*.8)*60),Math.PI),scale:.5,weight:motion.weight,deferred:at(motion.clipElapsed)-at(previous)});
 player.angle=result.angle;motion.remaining=result.twist;
 if(Math.abs(result.twist)*180/Math.PI<=1)return true;
 if(motion.clip.includes('180')&&Math.abs(result.twist)*180/Math.PI<=45){motion.clip=`turnIdle90${result.twist<0?'L':'R'}`;motion.clipElapsed=0;}
 return false;
}
