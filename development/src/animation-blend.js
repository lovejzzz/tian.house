import {AnimationClock,sampleClip} from './animation-clock.js';
import {windowPhase} from './window-traversal.js';
import {windowTogglePhase,openingPose} from './window-toggle.js';

// PZMath.lerpFunc_EaseOutInQuad, preserving the source's float operations.
export function animationWeight(raw){
 const f=Math.fround,x=f(Math.max(0,Math.min(1,raw)));
 if(x<.5)return f(f(x*x)*2);
 const t=f(f(2*x)-1),one=f(1-t);
 return f(.5+f(f(1-f(one*one))/2));
}

export const PLAYER_BASE_RATES={idle:.48,walk:1.04,run:1.04};
export function advanceBlendRaw(raw,target,dt,duration=.3){
 const f=Math.fround,d=f(duration);
 if(d<=0)return target?1:0;
 const elapsed=f(f((target?raw:f(1-raw))*d)+f(dt));
 return Math.max(0,Math.min(1,target?f(elapsed/d):f(1-f(elapsed/d))));
}
// Direct transitions have no dedicated intermediate clip.
const DIRECT_BLENDS=new Set(['idle:walk','walk:idle','walk:run','run:walk']);
const SPECIAL={
 'idle:run':{clip:'idleToRun',speed:1.04,blendIn:.1,blendOut:.1},
 'run:idle':{clip:'runToStop',speed:1,blendIn:.5,blendOut:.2},
};

// Nominal uninjured forward-motion transitions. Their selection in the complete
// graph and frame-discrete activation still require source-game comparison.
export function transitionPose(sequence,now,durations){
 const {spec,target,start,from}=sequence,t=Math.max(0,now-start),duration=durations[spec.clip];
 const end=duration/spec.speed,tail=Math.max(0,end-spec.blendOut);
 const inWeight=animationWeight(Math.min(1,t/spec.blendIn)),outWeight=animationWeight(Math.min(1,Math.max(0,(t-tail)/spec.blendOut)));
 const layers=from.map(l=>({...sampleClip(l.clip,l.time+t*(l.speed||1),durations[l.clip]),speed:l.speed,weight:l.weight*(1-inWeight)})).filter(l=>l.weight>0);
 if(t<end)layers.push({...sampleClip(spec.clip,t*spec.speed,duration,{loop:false}),speed:spec.speed,weight:t<tail?inWeight:1-outWeight});
 // LiveAnimNode activates the main loop during the tail and scaledRewind
 // subtracts blendOut * target speed, wrapping back into the loop.
 const rate=PLAYER_BASE_RATES[target],d=durations[target],phase=((Math.max(0,t-tail)-spec.blendOut)*rate%d+d)%d;
 if(t>=tail)layers.push({...sampleClip(target,phase,d),speed:rate,weight:t>=end?1:outWeight});
 return {layers,phase,finished:t>=end,transition:spec.clip,tailStart:tail};
}

export class AnimationBlend {
 constructor(durations,metadata={}){this.clock=new AnimationClock(durations);this.metadata=metadata;this.actors=new WeakMap();}
 sample(actor,now,zombie=false){
  if(!Number.isFinite(now))throw Error('Invalid animation clock');
  if(actor.readMotion&&!zombie){
   this.actors.delete(actor);const elapsed=actor.readMotion.elapsed,meta=this.metadata.readBook??{speed:.8,blendTime:.32},w=animationWeight(Math.min(1,elapsed/meta.blendTime));
   const sample=sampleClip('readBook',elapsed*meta.speed,this.clock.durations.readBook);
   return {...sample,transition:'readBook',layers:[{...sampleClip('idle',elapsed*.48,this.clock.durations.idle),weight:1},{...sample,speed:meta.speed,weight:w}]};
  }
  if(actor.buildMotion&&!zombie){
   const motion=actor.buildMotion,t=motion.turn;this.actors.delete(actor);
   if(t){const sample=sampleClip(t.clip,t.clipElapsed,this.clock.durations[t.clip],{loop:t.clip.includes('90')});return {...sample,transition:'buildTurn',layers:[{...sampleClip('idle',t.elapsed*.48,this.clock.durations.idle),weight:1-t.weight},{...sample,weight:t.weight}]};}
   const meta=this.metadata.build??{speed:.8,blendTime:.4,loop:true},elapsed=motion.elapsed,w=animationWeight(Math.min(1,elapsed/(meta.blendTime??.4))),sample=sampleClip('build',elapsed*meta.speed,this.clock.durations.build,{loop:meta.loop}),layers=[];
   if(w<1)layers.push({...sampleClip('idle',elapsed*.48,this.clock.durations.idle),weight:1-w});layers.push({...sample,speed:meta.speed,weight:w});
   return {...sample,transition:'build',layers};
  }
  if(actor.windowTurn&&!zombie){const t=actor.windowTurn,sample=sampleClip(t.clip,t.clipElapsed,this.clock.durations[t.clip],{loop:t.clip.includes('90')}),layers=[];
   if(t.weight<1)layers.push({...sampleClip('idle',t.elapsed*.48,this.clock.durations.idle),weight:1-t.weight});layers.push({...sample,weight:t.weight});this.actors.delete(actor);return {...sample,transition:'windowTurn',layers};}
  if(actor.windowToggle?.stage&&!zombie){const pose=openingPose(actor.windowToggle),w=animationWeight(pose.blend),sample=sampleClip(pose.clip,pose.time,this.clock.durations[pose.clip],{loop:pose.loop}),layers=[];if(pose.previous&&w<1)layers.push({...sampleClip(pose.previous.clip,pose.previous.duration,pose.previous.duration,{loop:false}),weight:1-w});layers.push({...sample,weight:w});this.actors.delete(actor);return {...sample,transition:'windowToggle',layers};}
  if(actor.windowToggle&&!zombie){const phase=windowTogglePhase(actor.windowToggle.open,actor.windowToggle.elapsed),sample=sampleClip(phase.clip,phase.time,this.clock.durations[phase.clip],{loop:false});
   const w=phase.success?animationWeight(Math.min(1,phase.successElapsed/.2)):1,layers=[];
   if(phase.success&&w<1)layers.push({...sampleClip(phase.spec.start,phase.spec.startDuration,phase.spec.startDuration,{loop:false}),weight:1-w});
   layers.push({...sample,weight:w});this.actors.delete(actor);return {...sample,transition:'windowToggle',layers};
  }
  if(actor.windowMotion&&!zombie){const phase=windowPhase(actor.windowMotion.elapsed),sample=sampleClip(phase.clip,phase.time,this.clock.durations[phase.clip],{loop:false});this.actors.delete(actor);return {...sample,transition:'window',layers:[{...sample,weight:1}]};}
  let clip=actor.moving?(actor.running?'run':'walk'):'idle';
  if(!this.clock.durations[clip])clip='idle';
  let state=this.actors.get(actor);
  if(!state||now<state.last||state.zombie!==zombie){state={last:now,active:clip,zombie,tracks:new Map()};this.actors.set(actor,state);}
  const dt=now-state.last;state.last=now;
  if(state.special){
   const pose=transitionPose(state.special,now,this.clock.durations);
   if(clip===state.active&&!pose.finished)return {...pose.layers.at(-1),...pose};
   const previous=state.active;state.special=null;state.tracks.clear();
   if(clip===previous){
    const proxy={moving:clip!=='idle',running:clip==='run'};
    state.tracks.set(clip,{actor:proxy,raw:1,target:true,fade:false,sample:this.clock.sample(proxy,now,PLAYER_BASE_RATES[clip],pose.phase)});
   }else {
    // Preserve the visible pose while new input takes over; full source graph
    // interruption arbitration is still a separate fidelity obligation.
    state.residual={start:now,layers:pose.layers};
    state.active=clip;
   }
  }
  for(const [name,track]of state.tracks){
   if(track.fade)track.raw=advanceBlendRaw(track.raw,track.target,dt);
   track.sample=this.clock.sample(track.actor,now,zombie?1:PLAYER_BASE_RATES[name]);
   if(track.raw===0&&!track.target)state.tracks.delete(name);
  }
  if(clip!==state.active){
   const spec=SPECIAL[`${state.active}:${clip}`];
   if(spec&&!zombie&&!actor.isTurningAround&&!(actor.walkInjury>0)&&!actor.isOverEncumbered&&this.clock.durations[spec.clip]){
    state.special={spec,target:clip,start:now,from:[...state.tracks.values()].map(t=>({...t.sample,weight:animationWeight(t.raw)}))};state.active=clip;
    const pose=transitionPose(state.special,now,this.clock.durations);return {...pose.layers.at(-1),...pose};
   }
   if(!zombie&&DIRECT_BLENDS.has(`${state.active}:${clip}`)&&!actor.isTurningAround){
    for(const [name,track]of state.tracks){track.target=name===clip;track.fade=true;}
   }else state.tracks.clear();
   state.active=clip;
  }
  if(!state.tracks.has(clip)){
   const proxy={moving:clip!=='idle',running:clip==='run'};
   state.tracks.set(clip,{actor:proxy,raw:state.tracks.size?0:1,target:true,fade:!!state.tracks.size,sample:this.clock.sample(proxy,now,zombie?1:PLAYER_BASE_RATES[clip])});
  }
  const layers=[...state.tracks.values()].map(t=>({...t.sample,weight:animationWeight(t.raw)}));
  if(state.residual){
   const elapsed=now-state.residual.start,w=animationWeight(Math.min(1,elapsed/.2));
   for(const l of layers)l.weight*=w;
   if(w<1)layers.unshift(...state.residual.layers.map(l=>({...l,...sampleClip(l.clip,l.time+elapsed*(l.speed||1),this.clock.durations[l.clip],{loop:!['idleToRun','runToStop'].includes(l.clip)}),weight:l.weight*(1-w)})));
   else state.residual=null;
  }
  return {...state.tracks.get(clip).sample,layers};
 }
}
