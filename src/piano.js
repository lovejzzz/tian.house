// One pitch map drives the 3D instrument and interactive keyboard (A0–C8).
const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const pianoKeys=Object.freeze(Array.from({length:88},(_,i)=>{
 const midi=i+21,black=[1,3,6,8,10].includes(midi%12);
 return Object.freeze({midi,black,name:names[midi%12]+(Math.floor(midi/12)-1),frequency:440*2**((midi-69)/12)});
}));
export const pianoPartMidi=new Map();
let whiteIndex=0;for(const key of pianoKeys){pianoPartMidi.set(key.black?'black-key:'+(whiteIndex-1):'white-key:'+whiteIndex,key.midi);if(!key.black)whiteIndex++;}
// Public-domain Hanon No.1 ascending figure, both hands one octave apart.
// Explicitly an ascending study, not an unverified transcription of the entire score.
export function hanonAscending({bpm=60}={}){
 if(!Number.isFinite(bpm)||bpm<30||bpm>120)throw new RangeError('Tempo must be 30–120 BPM');
 const scale=[0,2,4,5,7,9,11],note=n=>60+12*Math.floor(n/7)+scale[n%7],events=[];
 for(let base=0;base<14;base++)for(const degree of [0,2,3,4,5,4,3,2]){const right=note(base+degree);events.push({at:events.length*15/bpm,notes:[right-12,right]});}
 events.push({at:events.length*15/bpm,notes:[72,84]});return events;
}
export function createPianoAudio(Context=globalThis.AudioContext??globalThis.webkitAudioContext){
 let context=null;const voices=new Set();
 return {
  async unlock(){if(!Context)throw Error('Audio is unavailable in this browser');context??=new Context();await context.resume();},
  get currentTime(){return context?.currentTime??0;},
  play(midi,duration=.4,when=null){if(!context||context.state!=='running')return;const key=pianoKeys.find(k=>k.midi===midi);if(!key)return;
   // Small original additive struck-string voice. No sampled piano quality claim.
   const start=Math.max(context.currentTime,when??context.currentTime),gain=context.createGain();gain.connect(context.destination);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.12,start+.006);gain.gain.exponentialRampToValueAtTime(.0001,start+duration+.35);
   const oscillators=[1,2,3,4].map((partial,i)=>{const o=context.createOscillator(),g=context.createGain();o.frequency.value=key.frequency*partial;g.gain.value=[1,.3,.12,.05][i];o.connect(g);g.connect(gain);o.start(start);o.stop(start+duration+.36);o.onended=()=>{o.disconnect();g.disconnect();};return o;});
   const voice={gain,oscillators};voices.add(voice);const cleanup=oscillators[0].onended;oscillators[0].onended=()=>{cleanup();gain.disconnect();voices.delete(voice);};
  },
  stop(){for(const v of voices){for(const o of v.oscillators){try{o.stop();}catch{}}v.gain.disconnect();}voices.clear();},
  async close(){this.stop();if(context){await context.close();context=null;}}
 };
}
