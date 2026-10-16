// Pinned normal-success nodes. Struggle/failure, panic and contested closing
// remain separate source-state branches, not successful toggles.
export const WINDOW_TOGGLE={
 open:{start:'openWindowStart',success:'openWindowSuccess',startDuration:1/3,successDuration:16/15,eventFraction:.45,rate:.8},
 close:{start:'closeWindowStart',success:'closeWindowSuccess',startDuration:13/30,successDuration:37/30,eventFraction:.35,rate:.8},
};
export function windowTogglePhase(open,elapsed){
 const spec=WINDOW_TOGGLE[open?'open':'close'],split=spec.startDuration/spec.rate,success=elapsed>=split;
 return {spec,clip:success?spec.success:spec.start,time:success?(elapsed-split)*spec.rate:elapsed*spec.rate,success,successElapsed:Math.max(0,elapsed-split),commit:elapsed>=split+spec.successDuration*spec.eventFraction/spec.rate,finished:elapsed>=split+spec.successDuration/spec.rate,duration:split+spec.successDuration/spec.rate};
}

// OpenWindowState.onAttemptFinished uses a cascading sequence, not one roll
// selected by strength. The final comparison accepts both 0 and 1.
export function windowOpenOutcome(state,exterior){return state.permaLocked||state.locked&&exterior?'struggle':'success';}
export function windowOpenAttempt({permaLocked,locked,exterior,strength=5,burglar=false},nextInt){
 if(permaLocked)return {outcome:'fail',breakLock:false};
 if(!locked||!exterior)return {outcome:'success',breakLock:false};
 if(nextInt(100)<(burglar?5:10))return {outcome:'fail',breakLock:true};
 for(const [level,chance]of [[7,20],[5,10],[3,6],[1,4]])if(strength>level&&nextInt(100)<chance)return {outcome:'success',breakLock:false};
 return {outcome:nextInt(100)<=1?'success':'struggle',breakLock:false};
}
export function windowAttemptExertion(fitness){return [0.011,.01,.009,.008,.007,.006,.005,.004,.003,.0025,.002][fitness]??.012;}
export const OPEN_STAGES={start:{clip:'openWindowStart',duration:1/3},struggle:{clip:'openWindowStruggle',duration:2/3},success:{clip:'openWindowSuccess',duration:16/15},fail:{clip:'openWindowFail',duration:2/3}};
export function openingPose(motion){const spec=OPEN_STAGES[motion.stage],previous=OPEN_STAGES[motion.previousStage];return {clip:spec.clip,time:motion.stageElapsed*.8,previous:previous?{clip:previous.clip,duration:previous.duration}:null,blend:motion.previousStage?Math.min(1,motion.stageElapsed/.2):1,loop:motion.stage==='struggle'};}
export function advanceWindowOpening(motion,dt,context,hooks){
 motion.elapsed+=dt;
 while(dt>0&&!motion.finished){const duration=OPEN_STAGES[motion.stage].duration/.8,step=Math.min(dt,duration-motion.stageElapsed);motion.stageElapsed+=step;dt-=step;
  if(motion.stage==='success'&&!motion.committed&&motion.stageElapsed>=duration*.45){hooks.commit();motion.committed=true;}
  if(motion.stageElapsed<duration)break;
  if(motion.stage==='success'||motion.stage==='fail'){motion.finished=true;break;}
  let next;
  if(motion.stage==='start')next=windowOpenOutcome(context.state(),context.exterior());
  else {const result=windowOpenAttempt({...context.state(),exterior:context.exterior(),strength:context.strength,burglar:context.burglar},context.nextInt);hooks.exert(windowAttemptExertion(context.fitness));if(result.breakLock)hooks.breakLock();next=result.outcome;motion.attempts++;}
  motion.previousStage=next===motion.stage?null:motion.stage;motion.stage=next;motion.stageElapsed=0;
 }
 return motion.finished;
}
