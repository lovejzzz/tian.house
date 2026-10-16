// Source body-angle component. Integration needs the actual animation graph's
// deferred rotation, step scale and twist inputs; this is not a fixed turn timer.
const f=Math.fround,PI=f(Math.PI),TAU=f(2*Math.PI);
// Ordinary source counterRotationBone branch: retain roll/pitch and replace
// Euler Z by +pi/2. Apply after quaternion interpolation, before track blending.
export function counterRotateBone(quaternion){
 const [x,y,z,w]=Array.from(quaternion,f);
 const roll=f(Math.atan2(2*f(f(w*x)+f(y*z)),1-2*f(f(x*x)+f(y*y))));
 const sine=2*f(f(w*y)-f(z*x));
 const pitch=f(Math.abs(sine)>=1?Math.sign(sine)*f(Math.PI/2):Math.asin(sine));
 const cy=Math.cos(f(Math.PI/2)/2),sy=Math.sin(f(Math.PI/2)/2),cp=Math.cos(pitch/2),sp=Math.sin(pitch/2),cr=Math.cos(roll/2),sr=Math.sin(roll/2);
 return [f(cy*cp*sr-sy*sp*cr),f(sy*cp*sr+cy*sp*cr),f(sy*cp*cr-cy*sp*sr),f(cy*cp*cr+sy*sp*sr)];
}
// Input quaternion is [x,y,z,w], after the asset coordinate conversion.
export function deferredRotationZ(quaternion){
 const [x,y,z,w]=quaternion.map(f),ww=f(w*w),squares=f(f(f(x*x)+f(y*y))+f(z*z));
 const vx=f(f(ww-squares)+f(f(2*x)*x));
 const vy=f(f(f(2*w)*z)+f(f(2*y)*x));
 return f(Math.atan2(vy,vx));
}

// Add shortest differences along sampled keys, so a turn crossing ±pi and a
// looping clip retain their motion instead of snapping at the wrap boundary.
export function unwrapDeferredRotations(quaternions){
 let previous=0,total=0;
 return quaternions.map((q,index)=>{const angle=deferredRotationZ(q);if(index)total=f(total+closestBodyAngle(previous,angle));previous=angle;return total;});
}
function wrap(value,range){
 value=f(value);range=f(range);if(range<=0)return 0;
 const q=f(Math.abs(value)/range),frac=f(q-Math.floor(q));
 return f((value<0?f(1-frac):frac)*range);
}
export function closestBodyAngle(from,to){
 const delta=f(wrap(to,TAU)-wrap(from,TAU));
 return f(-PI+wrap(f(delta+PI),TAU));
}
export function interpolateBodyAngle({angle,target,step,scale=1,weight=0,deferred=0}){
 angle=f(angle);target=f(target);step=f(step);scale=f(scale);weight=f(weight);deferred=f(deferred);
 const delta=closestBodyAngle(angle,target);
 if(Math.abs(delta)<f(.001))return {angle:target,twist:0};
 const direction=Math.sign(delta),base=f(f(step*direction)*scale);
 const movement=weight>0?f(f(deferred*weight)+f(base*f(1-weight))):base;
 const next=f(angle+movement),remaining=closestBodyAngle(next,target);
 if(Math.sign(remaining)!==direction&&Math.sign(movement)===direction)return {angle:target,twist:0};
 return {angle:next,twist:remaining};
}
