import {applyConsumptionPose} from './consumption-pose.js?v=1d7ffb1877ce';
import {createHeldConsumable} from './held-consumable.js?v=1d7ffb1877ce';
import {fixtureSeatContact} from './fixture-seat-contact.js?v=1d7ffb1877ce';
import {applyPianoPose} from './piano-pose.js?v=1d7ffb1877ce';
import {showerPartVisible} from './shower-presentation.js?v=1d7ffb1877ce';
import {applyHandRinsePose} from './hand-rinse-pose.js?v=1d7ffb1877ce';
import {applyFurnitureRestPose} from './furniture-rest-pose.js?v=1d7ffb1877ce';
import * as THREE from 'three';
import {clone} from '../node_modules/three/examples/jsm/utils/SkeletonUtils.js';
import {loadResidentHD,createResidentHDActor,syncResidentHD} from './resident-hd-character.js?v=1d7ffb1877ce';
export function bodyBounds(root){const box=new THREE.Box3(),point=new THREE.Vector3();root.traverse(n=>{if(!n.isMesh||(!n.isSkinnedMesh&&n.parent!==root))return;for(let parent=n;parent;parent=parent.parent){if(!parent.visible)return;if(parent===root)break;}const indices=n.geometry.index?new Set(n.geometry.index.array):Array.from({length:n.geometry.attributes.position.count},(_,i)=>i);for(const i of indices){n.getVertexPosition(i,point);box.expandByPoint(point.applyMatrix4(n.matrixWorld));}});return box;}
// Character colour maps remain imported. The volume view owns material instances
// so threat styling and room irradiance cannot contaminate the 2D source actor.
export function volumeActorMaterial(source,{zombie=false,install=()=>{}}={}){
 const material=source.isMeshStandardMaterial?source.clone():new THREE.MeshStandardMaterial({
  color:source.color?.clone()??0xffffff,map:source.map??null,normalMap:source.normalMap??null,
  bumpMap:source.bumpMap??null,bumpScale:source.bumpScale??1,alphaMap:source.alphaMap??null,
  alphaTest:source.alphaTest??0,opacity:source.opacity??1,transparent:source.transparent??false,
  side:source.side,depthWrite:source.depthWrite,roughness:.88,metalness:0,
 });
 install(material);
 if(zombie){
  // Apply the threat wash in linear space before tone mapping, for both direct
  // rendering and the HDR post-processing target.
  // This is readability styling, not a new skin texture or physical reflectance.
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>','gl_FragColor.rgb = mix(gl_FragColor.rgb, sRGBTransferEOTF(vec4(vec3(73.0,87.0,45.0)/255.0,1.0)).rgb,0.2);\n#include <tonemapping_fragment>');};
  material.customProgramCacheKey=()=>key+'|threat-linear-wash-v2';
 }
 return material;
}
// Reuse imported geometry, skeletons, textures and the game's animation sampler.
// Each actor owns its bones; immutable geometry and textures stay shared.
export function createVolumeCharacters(scene,source,onMeasure=()=>{},{installMaterial=()=>{},assets=[],residentDetail='hd',loadDetail=loadResidentHD}={}){
 const instances=new Map(),held=createHeldConsumable(scene,assets,installMaterial);let scale=null,footOffset=0;
 // The resident (not zombies) uses the high-detail body once it has loaded; the
 // imported actor stays as the fallback and for comparison ('legacy').
 let detail=residentDetail,hdAsset=null,hdError=null;
 const hdReady=detail==='hd'?loadDetail().then(a=>{hdAsset=a;},e=>{hdError=e;console.warn('High-detail resident unavailable',e);}):Promise.resolve();
 const dropEntry=id=>{const e=instances.get(id);if(!e)return;scene.remove(e.root);for(const m of e.materials.values())m.dispose();e.model.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.dispose();});instances.delete(id);};
 function sync(sim,metrics,position,contact=null){
  if(!source?.ready)return;
  contact=fixtureSeatContact(sim.action)||contact;held.hide();
  const p=sim.state.player,actors=[['player',p,false],...sim.state.zombies.filter(z=>z.hp>0&&z.z===p.z&&Math.hypot(z.x-p.x,z.y-p.y)<30).map(z=>['zombie:'+z.id,z,true])],live=new Set();
  for(const [id,actor,zombie] of actors){
   // Source pose yaw belongs to its X/Z projection; the volume root's Rx(90) flips Z into world -Y.
   source.frame(!zombie&&contact?{...actor,angle:Math.atan2(contact.forward?.[1]??1,contact.forward?.[0]??0)+Math.PI,moving:false}:{...actor,angle:-actor.angle},sim.state.elapsed,zombie,null,sim.state.inventory,{poseOnly:true});
   source.actor.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});
   if(scale===null){const bounds=bodyBounds(source.actor.children[0]);scale=1.8/Math.max(.1,bounds.max.y-bounds.min.y);footOffset=-bounds.min.y*scale;}
   const wantHD=!zombie&&detail==='hd'&&!!hdAsset;let entry=instances.get(id);
   if(entry&&!!entry.hd!==wantHD){dropEntry(id);entry=null;}
   if(!entry&&wantHD){const hd=createResidentHDActor(hdAsset,{install:installMaterial}),root=new THREE.Group();root.userData.indirectCaptureExclude=true;root.rotation.x=Math.PI/2;root.scale.setScalar(scale);root.add(hd.model);scene.add(root);entry={root,model:hd.model,hd,nodes:[],materials:new Map(hd.materials.map(m=>[m,m]))};instances.set(id,entry);}
   if(!entry){const model=clone(source.actor),root=new THREE.Group();root.userData.indirectCaptureExclude=true;root.rotation.x=Math.PI/2;root.scale.setScalar(scale);root.add(model);scene.add(root);const nodes=[],materials=new Map();const own=m=>{if(!materials.has(m))materials.set(m,volumeActorMaterial(m,{zombie,install:installMaterial}));return materials.get(m);};model.traverse(n=>{nodes.push(n);if(n.isMesh){n.material=Array.isArray(n.material)?n.material.map(own):own(n.material);n.castShadow=true;n.receiveShadow=true;}});entry={root,model,nodes,materials};instances.set(id,entry);}
   if(entry.hd)syncResidentHD(entry.hd,source,{showering:!zombie&&!!sim.action?.shower,partVisible:showerPartVisible});
   else{let i=0;source.actor.traverse(n=>{const target=entry.nodes[i++];target.position.copy(n.position);target.quaternion.copy(n.quaternion);target.scale.copy(n.scale);target.visible=showerPartVisible(n.userData.characterPart,n.visible,!zombie&&!!sim.action?.shower);});}
   entry.root.rotation.set(Math.PI/2,0,0);entry.root.position.set(actor.x*metrics.cellSize,actor.y*metrics.cellSize,footOffset+(zombie?actor.z*metrics.storeyHeight:position[2]-.9));
   if(!zombie){applyFurnitureRestPose(entry.root,contact);if(sim.action?.piano)applyPianoPose(entry.root,sim.action.piano,contact?.forward);if(sim.action?.handRinse)applyHandRinsePose(entry.root,sim.action.handRinse,sim.action.duration-sim.action.left);if(held.supports(sim.action))held.update(sim.action,applyConsumptionPose(entry.root,sim.action,actor.angle));}entry.root.updateMatrixWorld(true);entry.model.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});if(id==='player'&&!entry.measured){entry.measured=true;const b=bodyBounds(entry.hd?entry.model:entry.model.children[0]);onMeasure({scale,height:b.max.z-b.min.z,min:b.min.z,max:b.max.z,count:actors.length});}live.add(id);
  }
  for(const [id,entry]of instances)entry.root.visible=live.has(id);
 }
 // Bounding spheres of visible characters (feet at root): moving shadow casters.
 // Only characters whose pose changed since the last frame count: a paused or
 // idle-frozen resident does not keep re-rendering the shadow maps around it.
 const POSE_BONES=['Bip01_Pelvis','Bip01_Head','Bip01_L_Hand','Bip01_R_Hand','Bip01_L_Foot','Bip01_R_Foot'];
 const casterSpheres=()=>{const moving=[];for(const e of instances.values()){if(!e.root.visible)continue;e.poseBones??=POSE_BONES.map(n=>e.root.getObjectByName(n)).filter(Boolean);
  const sig=[e.root.position.x,e.root.position.y,e.root.position.z,e.root.quaternion.z,e.root.quaternion.w,...e.poseBones.flatMap(b=>[b.quaternion.x,b.quaternion.y,b.quaternion.z,b.position.x,b.position.y])].map(v=>v.toFixed(4)).join(',');
  if(sig!==e.lastPoseSignature)moving.push({center:[e.root.position.x,e.root.position.y,e.root.position.z+.9],radius:1.15});e.lastPoseSignature=sig;}
  return moving;};
 return {sync,hdReady,casterSpheres,get detail(){return detail;},get detailError(){return hdError?.message||null;},setDetail(mode){if(!['hd','legacy'].includes(mode))throw Error('Unknown character detail');detail=mode;if(mode==='hd'&&!hdAsset&&!hdError)loadDetail().then(a=>{hdAsset=a;},e=>{hdError=e;});},focusPoints(){const root=instances.get('player')?.root;if(!root?.visible)return null;return ['Bip01_Head','Bip01_Pelvis','Bip01_L_Foot','Bip01_R_Foot'].map(name=>root.getObjectByName(name)).filter(Boolean).map(bone=>bone.getWorldPosition(new THREE.Vector3()).toArray());},hide(){held.hide();for(const e of instances.values())e.root.visible=false;},dispose(){held.dispose();hdAsset?.dispose();for(const e of instances.values()){scene.remove(e.root);for(const m of e.materials.values())m.dispose();e.model.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.dispose();});}instances.clear();}};
}
