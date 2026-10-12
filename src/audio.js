// Local rendered source-event samples. Full FMOD variation, spatial/bus effects
// and perceptual source parity remain separate acceptance obligations.
export class GameAudio {
 constructor(){this.context=new AudioContext();this.buffers=new Map();this.errors=[];this.played=[];this.capture=null;}
 async load(base){
  const response=await fetch(new URL('manifest.json',base));if(!response.ok)throw Error('阅读音效尚未导入');
  const data=await response.json();
  await Promise.all(Object.entries(data.events).map(async([name,event])=>{const r=await fetch(new URL(event.file,base));if(!r.ok)throw Error('音效文件缺失：'+name);this.buffers.set(name,await this.context.decodeAudioData(await r.arrayBuffer()));}));
 }
 startCapture(){
  if(this.capture)throw Error('录制已在进行');
  const destination=this.context.createMediaStreamDestination(),chunks=[];
  const recorder=new MediaRecorder(destination.stream);
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  this.capture={destination,recorder,chunks,startedAt:this.context.currentTime};recorder.start();
 }
 stopCapture(){
  const capture=this.capture;if(!capture)throw Error('没有音频录制');
  return new Promise((resolve,reject)=>{capture.recorder.onerror=e=>reject(e.error);capture.recorder.onstop=()=>{for(const t of capture.destination.stream.getTracks())t.stop();this.lastCapture={startedAt:capture.startedAt,stoppedAt:capture.stoppedAt,mimeType:capture.recorder.mimeType};this.capture=null;resolve(new Blob(capture.chunks,{type:capture.recorder.mimeType}));};capture.stoppedAt=this.context.currentTime;capture.recorder.stop();});
 }
 async unlock(){try{if(this.context.state==='suspended')await this.context.resume();}catch(e){this.errors.push(e.message);}}
 play(name){
  const buffer=this.buffers.get(name);if(!buffer){this.errors.push('未知音效：'+name);return;}
  if(this.context.state!=='running'){this.errors.push('音频尚未解锁：'+name);return;}
  const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.context.destination);if(this.capture)source.connect(this.capture.destination);source.onended=()=>source.disconnect();source.start();
  this.played.push({name,at:this.context.currentTime,duration:buffer.duration});if(this.played.length>40)this.played.shift();
 }
}
