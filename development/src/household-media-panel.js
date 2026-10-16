import {createPianoTransport} from './piano-transport.js';
import {pianoKeys,hanonAscending,createPianoAudio} from './piano.js';
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
export function openHouseholdMedia({parent,kind,onClose=()=>{},television=null,objectId=null,onSit=null,onPractice=null}){
 const dialog=el('dialog');dialog.className='house-library-dialog household-media';dialog.setAttribute('aria-label',kind==='piano'?'Piano':'Television');
 const heading=el('h2',kind==='piano'?'Upright piano':'Television'),status=el('p'),close=el('button','Return to house');status.setAttribute('role','status');dialog.append(heading);let dispose=()=>{};
 if(kind==='television'&&television){
  dispose=television.subscribe(message=>status.textContent=message);
  const channels=el('select');channels.setAttribute('aria-label','Television channel');for(const channel of television.channels){const option=el('option',channel.name);option.value=channel.id;channels.append(option);}channels.value=television.channelId;
  const start=el('button','Watch live'),stop=el('button','Turn off'),volume=el('input'),label=el('label','Volume ');volume.type='range';volume.min=0;volume.max=1;volume.step=.05;volume.value=.35;volume.setAttribute('aria-label','TV volume');label.append(volume);volume.oninput=()=>television.setVolume(volume.value);
  start.onclick=async()=>{start.disabled=true;try{await television.start(objectId||undefined,channels.value);status.textContent=television.status;}catch(e){status.textContent=e.message;}finally{start.disabled=false;}};stop.onclick=()=>{television.stop();status.textContent=television.status;};status.textContent=television.status;dialog.append(channels,el('p','Return to the room to watch. The television stays on until you switch it off or leave the house.'),start,stop,label);
 }else if(kind==='television'){
  const description=el('p','FRANCE 24 · English news · Live'),start=el('button','Watch live'),screen=el('div');
  const source=el('a','Official FRANCE 24 live channel');source.href='https://www.france24.com/en/live';source.target='_blank';source.rel='noopener noreferrer';
  start.onclick=()=>{const frame=el('iframe');frame.title='FRANCE 24 official live television';frame.src='https://www.youtube-nocookie.com/embed/HvZt-nh9sGg?autoplay=1';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allowFullscreen=true;screen.replaceChildren(frame);status.textContent='Use the player for volume, captions and full screen. If this channel is offline, open the official channel.';};
  dialog.append(description,start,screen,source);dispose=()=>screen.replaceChildren();
 }else{
  if(onSit){const sit=el('button','Sit at piano');sit.onclick=()=>{const result=onSit();if(result?.ok)dialog.close();else status.textContent=result?.error||'Piano bench unavailable';};dialog.append(sit);}
  const audio=createPianoAudio(),keyboard=el('div'),tempo=el('input'),label=el('label','Tempo · BPM '),play=el('button','Play Hanon No. 1 · ascending study'),stop=el('button','Stop');
  keyboard.className='piano-keyboard';keyboard.setAttribute('aria-label','88-key piano A0 to C8');tempo.type='number';tempo.min='30';tempo.max='120';tempo.value='60';tempo.setAttribute('aria-label','Practice tempo');label.append(tempo);
  let frame=null,timer=null,active=false,transport=null,generation=0,lit=[];
  const hidden=()=>{if(document.hidden){halt();status.textContent='Practice stopped while this tab is hidden.';}};document.addEventListener('visibilitychange',hidden);
  const buttons=new Map();let whites=0;
  for(const key of pianoKeys){const b=el('button',key.name);b.className='piano-key '+(key.black?'black':'white');b.setAttribute('aria-label',key.name);b.style.left=(key.black?whites*24-7:whites++*24)+'px';b.onclick=async()=>{try{await audio.unlock();audio.play(key.midi);status.textContent=key.name;}catch(e){status.textContent=e.message;}};buttons.set(key.midi,b);keyboard.append(b);}
  const unlight=()=>{for(const b of lit)b.classList.remove('playing');lit=[];};
  function halt(){generation++;active=false;if(frame!==null)cancelAnimationFrame(frame);if(timer!==null)clearInterval(timer);frame=null;timer=null;transport?.stop();transport=null;audio.stop();unlight();play.disabled=false;tempo.disabled=false;}
  function tick(){if(!active)return;if(document.hidden){halt();status.textContent='Practice stopped while this tab is hidden.';return;}
   const state=transport.snapshot();unlight();for(const midi of state.notes){const b=buttons.get(midi);b.classList.add('playing');lit.push(b);}
   if(state.notes.length)status.textContent='Hanon No. 1 · '+state.notes.map(m=>pianoKeys[m-21].name).join(' + ');
   if(state.done){halt();status.textContent='Ascending study complete';return;}frame=requestAnimationFrame(tick);
  }
  play.onclick=async()=>{try{if(onPractice){play.disabled=true;const result=await onPractice(Number(tempo.value));if(result?.ok){dialog.close();return;}status.textContent=result?.error||'Practice unavailable';play.disabled=false;return;}halt();const token=generation,bpm=Number(tempo.value),events=hanonAscending({bpm});play.disabled=true;tempo.disabled=true;await audio.unlock();if(token!==generation)return;if(!dialog.isConnected||document.hidden){halt();return;}transport=createPianoTransport(audio,events,{duration:15/bpm});transport.pump();timer=setInterval(()=>transport?.pump(),25);active=true;frame=requestAnimationFrame(tick);}catch(e){halt();status.textContent=e.message;}};stop.onclick=()=>{halt();status.textContent='Stopped';};
  const scroller=el('div');scroller.className='piano-scroll';scroller.append(keyboard);dialog.append(el('p','88 keys · A0–C8. Scroll horizontally to reach every key.'),label,play,stop,scroller);
  dispose=()=>{document.removeEventListener('visibilitychange',hidden);halt();void audio.close();};
 }
 dialog.append(status,close);parent.append(dialog);close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{dispose();dialog.remove();onClose();},{once:true});dialog.showModal();return dialog;
}
