import {createPianoAudio,hanonAscending} from './piano.js';
import {createPianoTransport} from './piano-transport.js';
export function createPianoPractice(getGame,{audio=createPianoAudio(),schedule=setInterval,unschedule=clearInterval}={}){
 let action=null,transport=null,timer=null,generation=0;
 function stop(){generation++;if(timer!==null)unschedule(timer);timer=null;transport?.stop();transport=null;audio.stop();if(action){delete action.piano;action.name='Sitting at piano';}action=null;}
 return {
  async start(id,position,bpm=60){
   const events=hanonAscending({bpm});stop();const game=getGame(),sim=game.session.sim;
   const result=game.sitAtPiano(id,position);if(!result.ok)return result;
   action=sim.action;const seated=action,token=generation;
   try{await audio.unlock();if(token!==generation||sim.action!==seated)return {ok:false,error:'Practice interrupted'};
    transport=createPianoTransport(audio,events,{duration:15/bpm});
    action.name='Hanon No. 1 · ascending study';action.piano={objectId:action.rest.pianoObjectId,notes:[],elapsed:0,remaining:events.at(-1).at+15/bpm+.4};
    const started=audio.currentTime;
    const pump=()=>{if(sim.action!==seated){stop();return;}transport.pump();const state=transport.snapshot();if(state.done){sim.log('Hanon ascending study complete');stop();return;}action.piano.notes=state.notes;action.piano.elapsed=audio.currentTime-started;action.piano.remaining=Math.max(0,events.at(-1).at+15/bpm+.45-action.piano.elapsed);};
    pump();timer=schedule(pump,25);return {ok:true};
   }catch(error){stop();if(sim.action===seated)sim.cancel();return {ok:false,error:error.message};}
  },
  stop,
  dispose(){stop();void audio.close();},
 };
}
