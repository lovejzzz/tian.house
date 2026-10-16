// Audio time is authoritative. Rendering reads the current note; it never queues
// stale notes after a slow frame. A long main-thread stall can leave silence, but
// cannot stretch the score or produce a burst of overdue notes.
export function createPianoTransport(audio,events,{duration=.25,lead=.05,lookahead=.25}={}){
 const start=audio.currentTime+lead;let next=0,stopped=false;
 return {
  pump(){
   if(stopped)return;
   const now=audio.currentTime;
   while(next<events.length&&start+events[next].at<=now+lookahead){
    const event=events[next++],at=start+event.at;
    if(at<now-.015)continue;
    for(const midi of event.notes)audio.play(midi,duration,Math.max(now,at));
   }
  },
  snapshot(){
   const elapsed=audio.currentTime-start;
   if(stopped)return {notes:[],done:true};
   let current=null;for(const event of events){if(event.at>elapsed)break;current=event;}
   return {notes:current&&elapsed<current.at+duration?current.notes:[],done:elapsed>(events.at(-1)?.at??0)+duration+.4};
  },
  stop(){stopped=true;audio.stop();},
 };
}
