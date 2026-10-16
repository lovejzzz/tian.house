import {resolveBoneMask} from './bone-mask.js';
import * as THREE from 'three';
import {characterProjection,characterModelTransform,CHARACTER_ELEVATION,CHARACTER_TEXTURE} from './character-projection.js';
import {AnimationBlend} from './animation-blend.js';
import {sampleClip} from './animation-clock.js';
import {counterRotationTrack,deferredRotationSampler} from './deferred-animation.js';
import {HeldModels,heldSelection} from './held-models.js';

// Original mesh topology, UVs, weights and animation keys, decoded from local X
// assets. Rasterization is a browser adapter; calibration is still in progress.
export class CharacterRenderer {
 async init(){
  const assetBase=new URL('../private-assets/characters/',import.meta.url);
  const res=await fetch(new URL('character.json',assetBase));if(!res.ok)throw new Error('Character assets are missing, Run import_characters.py');
  const data=await res.json();this.data=data;this.cache=new Map();
  this.durations=Object.fromEntries(Object.entries(data.animations).map(([name,channels])=>[name,Math.max(...channels.flatMap(c=>c.times))]));
  this.clock=new AnimationBlend(this.durations,data.animationMetadata);
  this.deferredRotations={};
  for(const [name,channels] of Object.entries(data.animations))if(data.animationMetadata?.[name]?.useDeferredRotation){
   const channel=channels.find(c=>c.bone==='Bip01'&&c.kind===0);
   if(!channel)throw Error(`Missing counter-rotation channel: ${name}`);
   this.deferredRotations[name]=deferredRotationSampler(channel);
  }
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});this.renderer.setSize(CHARACTER_TEXTURE.width,CHARACTER_TEXTURE.height);this.renderer.setPixelRatio(1);
  this.renderer.setClearColor(0x000000,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight(0xffffff,0x55534a,2.2));
  const sun=new THREE.DirectionalLight(0xfff4df,2.2);sun.position.set(-3,6,4);this.scene.add(sun);
  this.projection=characterProjection();const b=this.projection;
  this.camera=new THREE.OrthographicCamera(b.left,b.right,b.top,b.bottom,.01,100);
  const distance=10,horizontal=distance*Math.cos(CHARACTER_ELEVATION)/Math.SQRT2;
  this.camera.position.set(horizontal,.5+distance*Math.sin(CHARACTER_ELEVATION),horizontal);this.camera.lookAt(0,.5,0);this.camera.updateMatrixWorld(true);
  // Project the model's ground origin instead of guessing an offset in the
  // transparent frame. Scaling the frame must not move the feet off the tile.
  const origin=new THREE.Vector3(0,0,0).project(this.camera);
  this.anchor={x:(origin.x+1)*b.width/2,y:(1-origin.y)*b.height/2};
  this.actor=new THREE.Group();this.scene.add(this.actor);this.mixers=[];this.actions=[];this.readingActions=[];
  const loader=new THREE.TextureLoader();
  for(const part of data.parts){
   const group=new THREE.Group();group.userData.characterPart=part.name;this.actor.add(group);const bones=new Map();
   for(const def of part.bones){const b=new THREE.Bone();b.name=def.name;new THREE.Matrix4().fromArray(def.matrix).decompose(b.position,b.quaternion,b.scale);bones.set(def.name,b);}
   for(const def of part.bones)(bones.get(def.parent)||group).add(bones.get(def.name));
   if(part.name==='body')this.bodyBones=bones;
   const texture=part.texture?await loader.loadAsync(new URL(part.texture,assetBase).href):null;
   if(texture){texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;}
   for(const def of part.meshes){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(def.vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(def.uvs,2));g.setIndex(def.indices);g.computeVertexNormals();
    const influences=Array.from({length:def.vertices.length/3},()=>[]);
    def.weights.forEach((w,index)=>w.indices.forEach((vertex,i)=>influences[vertex].push([index,w.weights[i]])));
    const skin=[],weights=[];for(const list of influences){list.sort((a,b)=>b[1]-a[1]);const top=list.slice(0,4);const total=top.reduce((n,v)=>n+v[1],0)||1;for(let i=0;i<4;i++){skin.push(top[i]?.[0]||0);weights.push((top[i]?.[1]||0)/total);}}
    g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skin,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
    const colors={body:0xffffff,shirt:0x729b87,trousers:0xffffff,hair:0x45372d};
    const material=new THREE.MeshLambertMaterial({map:texture,color:texture?0xffffff:colors[part.name],side:THREE.DoubleSide});
    const mesh=new THREE.SkinnedMesh(g,material);mesh.frustumCulled=false;group.add(mesh);
    const skelBones=def.weights.map(w=>bones.get(w.bone));if(skelBones.some(b=>!b))throw new Error('Incomplete character bone mapping');
    group.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(skelBones,def.weights.map(w=>new THREE.Matrix4().fromArray(w.inverse))),new THREE.Matrix4());
   }
   const mixer=new THREE.AnimationMixer(group);const actions={},trackSets={};
   for(const[name,channels]of Object.entries(data.animations)){
    const tracks=[];
    for(const channel of channels){if(!bones.has(channel.bone))continue;
     // World/root translation is owned by gameplay, never by an imported clip.
     if(channel.kind===2&&(channel.bone==='Dummy01'||channel.bone==='Translation_Data'))continue;
     if(channel.kind===0){const v=channel.values.flatMap(q=>[q[1],q[2],q[3],-q[0]]);tracks.push(data.animationMetadata?.[name]?.useDeferredRotation&&channel.bone==='Bip01'?counterRotationTrack(`${channel.bone}.quaternion`,channel.times,v):new THREE.QuaternionKeyframeTrack(`${channel.bone}.quaternion`,channel.times,v));}
     else if(channel.kind===1||channel.kind===2)tracks.push(new THREE.VectorKeyframeTrack(`${channel.bone}.${channel.kind===1?'scale':'position'}`,channel.times,channel.values.flat()));
    }
    trackSets[name]=tracks;
    actions[name]=mixer.clipAction(new THREE.AnimationClip(name,this.durations[name],tracks));
   }
   const reading=[];
   if(trackSets.readBook){
    const mask=resolveBoneMask(part.bones,data.animationMetadata.readBook.boneWeights);
    for(const clip of ['idle','readBook']){
     const buckets=new Map();
     for(const track of trackSets[clip]){
      const weight=mask.get(track.name.split('.')[0])??0;
      if(!buckets.has(weight))buckets.set(weight,[]);buckets.get(weight).push(track);
     }
     for(const [weight,tracks] of buckets)reading.push({clip,weight,action:mixer.clipAction(new THREE.AnimationClip(clip+'-mask-'+weight,this.durations[clip],tracks))});
    }
   }
   this.readingActions.push(reading);
   this.mixers.push(mixer);this.actions.push(actions);
  }
  const heldBase=new URL('../private-assets/held-models/',import.meta.url),heldResponse=await fetch(new URL('held-models.json',heldBase));
  if(!heldResponse.ok)throw Error('Held models are missing, Run import_held_models.py');
  this.heldModels=new HeldModels(await heldResponse.json(),this.bodyBones);await this.heldModels.init(heldBase,loader);
  this.ready=true;
 }
 frame(actor,time,zombie=false,preview=null,inventory=null,{poseOnly=false}={}){
  if(!this.ready)return null;
  let sample;
  if(preview){
   if(!this.data.animationMetadata?.[preview.clip])throw Error('Missing preview clip metadata');
   const s=sampleClip(preview.clip,preview.elapsed,this.durations[preview.clip],this.data.animationMetadata[preview.clip]);sample={...s,layers:[{...s,weight:1}]};
  }else sample=this.clock.sample(actor,time,zombie);
  // A research preview owns its extracted rotation. Gameplay must instead pass
  // the simulation's accumulated actor angle, so it is never applied twice.
  const deferred=preview&&this.deferredRotations[preview.clip]?this.deferredRotations[preview.clip](sample.time,sample.cycle):0;
  const angle=actor.angle+deferred;
  if(preview&&this.deferredRotations[preview.clip])sample.deferredRotation=deferred;
  const dir=((angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2);this.lastSample=sample;if(!zombie)this.lastPlayerSample=sample;
  const held=zombie?[]:heldSelection(inventory,actor.readMotion?.handModels??(actor.buildMotion&&!actor.buildMotion.turn?actor.buildMotion.handModels:undefined));
  const key=`${dir}:${sample.layers.map(l=>`${l.clip}:${l.frame}:${l.weight}`).join('|')}:${zombie}:${JSON.stringify(held)}`;if(!poseOnly&&this.cache.has(key))return this.cache.get(key);
  this.heldModels.select(held);
  const transform=characterModelTransform(angle);this.actor.rotation.y=transform.yaw;this.actor.scale.z=transform.scaleZ;
  this.actions.forEach((actions,i)=>{for(const a of Object.values(actions))a.stop();
   for(const entry of this.readingActions[i])entry.action.stop();
   if(sample.transition==='readBook'){
    const readingLayer=sample.layers.find(l=>l.clip==='readBook'),idleLayer=sample.layers.find(l=>l.clip==='idle');
    for(const entry of this.readingActions[i]){
     const weight=entry.clip==='readBook'?entry.weight*readingLayer.weight:1-entry.weight*readingLayer.weight;
     if(weight<=0)continue;
     const a=entry.action,layer=entry.clip==='readBook'?readingLayer:idleLayer;
     a.reset().setEffectiveWeight(weight);a.setLoop(THREE.LoopRepeat,Infinity);a.play();a.time=layer.time;
    }
   }else for(const layer of sample.layers){const a=actions[layer.clip];a.reset().setEffectiveWeight(layer.weight);a.setLoop(this.data.animationMetadata?.[layer.clip]?.loop===false?THREE.LoopOnce:THREE.LoopRepeat,Infinity);a.clampWhenFinished=true;a.play();a.time=layer.time;}
   this.mixers[i].update(0);
  });
  if(poseOnly){this.actor.updateMatrixWorld(true);return this.actor;}
  this.renderer.render(this.scene,this.camera);
  const out=document.createElement('canvas');out.width=CHARACTER_TEXTURE.width;out.height=CHARACTER_TEXTURE.height;out.getContext('2d').drawImage(this.renderer.domElement,0,0);
  if(zombie){const c=out.getContext('2d');c.globalCompositeOperation='source-atop';c.fillStyle='rgba(73,87,45,.2)';c.fillRect(0,0,out.width,out.height);}
  const frame={image:out,width:this.projection.width,height:this.projection.height,anchor:this.anchor};
  this.cache.set(key,frame);if(this.cache.size>450)this.cache.delete(this.cache.keys().next().value);return frame;
 }
}
