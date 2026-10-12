// Samples imported clip time in seconds. This does not implement PZ's complete
// animation graph, blend transitions, movement-speed modifiers or root motion.
export function sampleClip(clip,elapsed,duration,{loop=true,rate=60}={}){
 if(!Number.isFinite(elapsed)||!Number.isFinite(duration)||duration<=0||!Number.isFinite(rate)||rate<=0)throw Error('Invalid clip timing');
 elapsed=Math.max(0,elapsed);
 const ended=!loop&&elapsed>=duration,local=loop?elapsed%duration:Math.min(duration,elapsed);
 const frame=ended?Math.ceil(duration*rate):Math.min(Math.ceil(duration*rate)-1,Math.floor(local*rate+1e-9));
 return {clip,frame,time:ended?duration:frame/rate,duration,cycle:loop?Math.floor(elapsed/duration):0,ended};
}
export class AnimationClock {
 constructor(durations,rate=60){
  if(!Number.isFinite(rate)||rate<=0)throw Error('Invalid animation sample rate');
  for(const [name,duration]of Object.entries(durations))if(!Number.isFinite(duration)||duration<=0)throw Error(`Invalid animation duration: ${name}`);
  if(!durations.idle)throw Error('Missing idle animation');
  this.durations=durations;this.rate=rate;this.actors=new WeakMap();
 }
 sample(actor,now,speed=1,initialTime=0){
  if(!Number.isFinite(now))throw Error('Invalid animation clock');
  if(!Number.isFinite(speed)||speed<0)throw Error('Invalid animation speed');
  const requested=actor.moving?(actor.running?'run':'walk'):'idle';
  const clip=this.durations[requested]?requested:'idle';let state=this.actors.get(actor);
  if(!Number.isFinite(initialTime))throw Error('Invalid initial animation time');
  if(!state||state.clip!==clip||now<state.last){const d=this.durations[clip];state={clip,last:now,elapsed:((initialTime%d)+d)%d,speed};this.actors.set(actor,state);}
  // Integrate the previous interval's rate so a rate change never jumps phase.
  state.elapsed+=(now-state.last)*state.speed;state.last=now;state.speed=speed;
  const duration=this.durations[clip],elapsed=state.elapsed,local=elapsed%duration;
  const frame=Math.min(Math.ceil(duration*this.rate)-1,Math.floor(local*this.rate+1e-9));
  return {clip,frame,time:frame/this.rate,duration,speed,cycle:Math.floor(elapsed/duration)};
 }
}
