import {rootInterval,projectRootDelta} from './root-motion.js';
// Normal, unobstructed player branch from the pinned climbwindow nodes and
// ClimbThroughWindowState. Counter, fall, rope, injury and root rotation remain
// separate obligations. This is not the complete source state machine.
export const WINDOW_START_DURATION=.5,WINDOW_END_DURATION=4/3,WINDOW_RATE=.96;
export const WINDOW_START_TIME=WINDOW_START_DURATION/WINDOW_RATE;
export const WINDOW_FINISH_TIME=WINDOW_START_TIME+WINDOW_END_DURATION*.6/WINDOW_RATE;
export function windowPhase(elapsed){
 const end=elapsed>=WINDOW_START_TIME;
 return {clip:end?'climbWindowEnd':'climbWindowStart',time:end?(elapsed-WINDOW_START_TIME)*WINDOW_RATE:elapsed*WINDOW_RATE,started:end,finished:elapsed>=WINDOW_FINISH_TIME};
}
// Source slideX/slideY clamps each update to .05 * ThirtyFPSMultiplier.
export function slideWindowAxis(current,target,thirtyFPSMultiplier){
 const f=Math.fround,c=f(current),t=f(target),step=f(f(.05)*f(thirtyFPSMultiplier)),delta=f(t-c);
 return f(c+(t>c?Math.min(step,delta):Math.max(-step,delta)));
}
export function advanceWindowPosition(player,motion,dt){
 if(motion.continuous){
  const phase=windowPhase(motion.elapsed),t=Math.max(0,Math.min(1,(motion.elapsed-WINDOW_START_TIME)/(WINDOW_FINISH_TIME-WINDOW_START_TIME))),e=t*t*(3-2*t);
  player.x=motion.from.x+(motion.to.x-motion.from.x)*e;player.y=motion.from.y+(motion.to.y-motion.from.y)*e;
  return phase;
 }

 const north=motion.from.y!==motion.to.y,phase=windowPhase(motion.elapsed),axis=north?'y':'x',cross=north?'x':'y';
 if(!phase.started)player[cross]=slideWindowAxis(player[cross],motion.from[cross],dt*30);
 else {
  const direction=Math.sign(motion.to[axis]-motion.from[axis]);
  const target=Math.floor(motion.from[axis])+(direction<0?-.1:1.1);
  if(Math.floor(player[axis])!==Math.floor(target))player[axis]=slideWindowAxis(player[axis],target,dt*30);
 }
 return phase;
}

export function windowRootDelta(data,previous,elapsed,angle){
 const start=Math.max(0,previous),end=Math.min(elapsed,WINDOW_FINISH_TIME),delta=[0,0,0];
 if(end<=start)return {x:0,y:0};
 for(const [clip,offset,limit]of [['climbWindowStart',0,WINDOW_START_TIME],['climbWindowEnd',WINDOW_START_TIME,WINDOW_FINISH_TIME]]){
  const a=Math.max(start,offset),b=Math.min(end,limit);if(b<=a)continue;
  const d=rootInterval(data.animations[clip],(a-offset)*WINDOW_RATE,(b-offset)*WINDOW_RATE);
  for(let i=0;i<3;i++)delta[i]+=d[i];
 }
 return projectRootDelta(delta,angle+Math.PI/2,data.motionScale);
}
