// Local rendered source-event samples. Full FMOD variation, spatial/bus effects
// and perceptual source parity remain separate acceptance obligations.
export class GameAudio {
 constructor(){this.context=new AudioContext();this.buffers=new Map();this.errors=[];this.played=[];this.capture=null;this.volume=.65;}
 async load(base){
  const response=await fetch(new URL('manifest.json',base));if(!response.ok)throw Error('Reading audio has not been imported');
  const data=await response.json();
  await Promise.all(Object.entries(data.events).map(async([name,event])=>{const r=await fetch(new URL(event.file,base));if(!r.ok)throw Error('Missing audio file: '+name);this.buffers.set(name,await this.context.decodeAudioData(await r.arrayBuffer()));}));
 }
 startCapture(){
  if(this.capture)throw Error('Recording is already in progress');
  const destination=this.context.createMediaStreamDestination(),chunks=[];
  const recorder=new MediaRecorder(destination.stream);
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  this.capture={destination,recorder,chunks,startedAt:this.context.currentTime};recorder.start();
 }
 stopCapture(){
  const capture=this.capture;if(!capture)throw Error('No audio recording is active');
  return new Promise((resolve,reject)=>{capture.recorder.onerror=e=>reject(e.error);capture.recorder.onstop=()=>{for(const t of capture.destination.stream.getTracks())t.stop();this.lastCapture={startedAt:capture.startedAt,stoppedAt:capture.stoppedAt,mimeType:capture.recorder.mimeType};this.capture=null;resolve(new Blob(capture.chunks,{type:capture.recorder.mimeType}));};capture.stoppedAt=this.context.currentTime;capture.recorder.stop();});
 }
 async unlock(){try{if(this.context.state==='suspended')await this.context.resume();}catch(e){this.errors.push(e.message);}}
 play(name){
  const buffer=this.buffers.get(name);if(!buffer){this.errors.push('Unknown audio event: '+name);return;}
  if(this.context.state!=='running'){this.errors.push('Audio has not been unlocked: '+name);return;}
  const source=this.context.createBufferSource();source.buffer=buffer;const gain=this.context.createGain();gain.gain.value=this.volume;source.connect(gain);gain.connect(this.context.destination);if(this.capture)source.connect(this.capture.destination);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
  this.played.push({name,at:this.context.currentTime,duration:buffer.duration});if(this.played.length>40)this.played.shift();
 }
}
