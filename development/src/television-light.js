import * as THREE from 'three';
import Hls from 'hls.js';
import {frameEmission} from './television-frame.js';
export const televisionChannel={id:'news',name:'FRANCE 24 · English · Live',page:'https://www.france24.com/en/live',url:'https://live.france24.com/hls/live/2037218/F24_EN_HI_HLS/master_2300.m3u8'};
export const televisionChannels=[televisionChannel,{id:'retro',name:'RetroStrange · Classic movies · Live',page:'https://live.retrostrange.com/',url:'https://live.retrostrange.com/hls/stream.m3u8'},{id:'arts',name:'Classic Arts Showcase · Arts & film · Live',page:'https://www.classicartsshowcase.org/',url:'https://classicarts.akamaized.net/hls/live/1024257/CAS/master.m3u8'}];
// Four shadowed screen patches sample actual decoded linear RGB. This is a bounded
// extended-emitter approximation, not calibrated luminance or multi-bounce video GI.
export function createTelevisionLight(scene,{draw,onStatus=()=>{},onSample=()=>{}}){
 const video=document.createElement('video');video.crossOrigin='anonymous';video.playsInline=true;video.preload='none';video.volume=.35;
 const texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;
 const sample=document.createElement('canvas');sample.width=64;sample.height=36;const ctx=sample.getContext('2d',{willReadFrequently:true});
 const lights=Array.from({length:4},()=>{const light=new THREE.SpotLight(0xffffff,0,9,Math.PI*.46,1,2);light.userData.indirectCaptureExclude=true;light.castShadow=true;light.shadow.mapSize.set(256,256);light.shadow.bias=-.00008;light.shadow.normalBias=.015;light.shadow.radius=3;scene.add(light,light.target);return light;});
 let channel=televisionChannel;
 const screens=new Map();let hls=null,active=null,frame=null,last=0,disposed=false,playing=false;
 const listeners=new Set();const report=message=>{controller.status=message;onStatus(message);for(const listener of listeners)listener(message);};
 function schedule(){if(disposed||!playing||frame!==null)return;frame=video.requestVideoFrameCallback?video.requestVideoFrameCallback(tick):requestAnimationFrame(tick);}
 function tick(now){frame=null;if(disposed||!playing)return;
  if(video.readyState>=2&&!document.hidden){
   if(now-last>=100){last=now;try{ctx.drawImage(video,0,0,64,36);const pixels=ctx.getImageData(0,0,64,36).data,rgb=frameEmission(pixels),colours=[];for(let i=0;i<4;i++){const patch=[];for(let y=(i>>1)*18;y<((i>>1)+1)*18;y++)for(let x=(i%2)*32;x<(i%2+1)*32;x++){const offset=(y*64+x)*4;patch.push(...pixels.slice(offset,offset+4));}colours.push(frameEmission(patch));lights[i].color.setRGB(...colours[i]);lights[i].intensity=active?30:0;}onSample({time:video.currentTime,rgb,colours,luminance:.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2],objectId:active});}catch(e){controller.stop();report('Television unavailable: the channel does not allow screen lighting.');return;}}
   draw();
  }schedule();
 }
 function cancel(){if(frame!==null){if(video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(frame);else cancelAnimationFrame(frame);frame=null;}}
 function activate(id){const s=screens.get(id);if(!s)throw Error('No supported television on this floor');active=id;for(const [key,v]of screens)v.mesh.visible=playing&&key===id;for(let i=0;i<4;i++){const u=i%2?.75:.25,v=i>>1?.25:.75,p=s.corners[0].clone().lerp(s.corners[1],u).addScaledVector(s.corners[3].clone().sub(s.corners[0]),v);lights[i].position.copy(p).addScaledVector(s.normal,.04);lights[i].target.position.copy(p).addScaledVector(s.normal,4);lights[i].target.updateMatrixWorld();}}
 const controller={status:'Off',get channels(){return televisionChannels;},get channelId(){return channel.id;},subscribe(listener){listeners.add(listener);listener(controller.status);return ()=>listeners.delete(listener);},get ids(){return [...screens.keys()];},get playing(){return playing;},emissionPatches(){return lights.map(l=>({position:l.position.toArray(),normal:l.target.position.clone().sub(l.position).normalize().toArray(),intensity:30}));},screenPosition(id){return screens.get(id)?.center.toArray()||null;},
  viewableFrom(position,clear,{forward=null,eyeHeight=.4}={}){if(!position||!clear)return [];const eye=new THREE.Vector3(...position).add(new THREE.Vector3(0,0,eyeHeight));return [...screens].filter(([id,s])=>{const delta=eye.clone().sub(s.center);const ahead=!forward||new THREE.Vector3(forward[0],forward[1],0).normalize().dot(new THREE.Vector3(-delta.x,-delta.y,0).normalize())>=.5;return ahead&&delta.length()<=6&&delta.dot(s.normal)>.1&&clear(eye.toArray(),s.center.clone().addScaledVector(s.normal,.08).toArray());}).map(([id])=>id);},
  rebuild(volumes,level){for(const s of screens.values()){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();}screens.clear();
   for(const v of volumes){if(!v.televisionScreen||v.levelId!==level)continue;const corners=v.televisionScreen.map(p=>new THREE.Vector3(...p)),center=corners.reduce((a,b)=>a.add(b),new THREE.Vector3()).multiplyScalar(.25),normal=new THREE.Vector3().subVectors(corners[1],corners[0]).cross(new THREE.Vector3().subVectors(corners[2],corners[0])).normalize();
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(corners.flatMap(p=>p.clone().sub(center).toArray()),3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,color:0xffffff,toneMapped:true}));mesh.userData.indirectCaptureExclude=true;mesh.position.copy(center);mesh.visible=false;scene.add(mesh);screens.set(v.objectId,{mesh,center,normal,corners});
   }if(active&&screens.has(active))activate(active);else if(active)controller.stop();
  },
  async start(id=controller.ids[0],channelId=channel.id){const next=televisionChannels.find(c=>c.id===channelId);if(!next)throw Error('Unknown television channel');if(next!==channel){controller.stop();channel=next;}activate(id);if(disposed)throw Error('Television closed');playing=true;activate(id);report('Connecting…');
   if(!hls&&!video.src){if(video.canPlayType('application/vnd.apple.mpegurl'))video.src=channel.url;else if(Hls.isSupported()){hls=new Hls({maxBufferLength:15,backBufferLength:10});hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal){controller.stop();report('Channel unavailable. Try again or open the official channel.');}});hls.loadSource(channel.url);hls.attachMedia(video);}else {controller.stop();throw Error('Live television is not supported in this browser');}}
   try{await video.play();if(disposed||!playing)return;report('Playing · '+channel.name);schedule();}catch(e){controller.stop();throw e;}
  },
  stop(){playing=false;video.pause();cancel();for(const light of lights)light.intensity=0;for(const s of screens.values())s.mesh.visible=false;hls?.destroy();hls=null;video.removeAttribute('src');video.load();onSample({time:video.currentTime,rgb:[0,0,0],colours:[],luminance:0,objectId:null});report('Off');draw();},
  setVolume(value){video.volume=Math.max(0,Math.min(1,Number(value)));},
  dispose(){disposed=true;controller.stop();texture.dispose();for(const s of screens.values()){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();}screens.clear();for(const light of lights){scene.remove(light,light.target);light.dispose();}document.removeEventListener('visibilitychange',visibility);}
 };
 function visibility(){if(document.hidden&&playing){controller.stop();report('Paused while away. Press Watch live to resume.');}}
 document.addEventListener('visibilitychange',visibility);return controller;
}
