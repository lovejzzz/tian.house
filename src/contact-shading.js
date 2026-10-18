import * as THREE from 'three';
import {EffectComposer} from '../node_modules/three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from '../node_modules/three/examples/jsm/postprocessing/RenderPass.js';
import {GTAOPass} from '../node_modules/three/examples/jsm/postprocessing/GTAOPass.js';
import {OutputPass} from '../node_modules/three/examples/jsm/postprocessing/OutputPass.js';
import {createCinematicGrade} from './cinematic-grade.js?v=1d7ffb1877ce';
import {createShaftsPass} from './atmosphere-effects.js?v=1d7ffb1877ce';
// Screen-space contact layer, not GI. Keep it outside radiance captures and use
// one final tone/color conversion.
export function withContactVisibility(scene,renderer,draw){
 const hidden=[],auto=renderer.shadowMap.autoUpdate,needs=renderer.shadowMap.needsUpdate;
 scene.traverse(o=>{if(!o.visible||!o.isMesh)return;const materials=Array.isArray(o.material)?o.material:[o.material];// Cut-out foliage too: the occlusion pass's override material ignores alphaTest,
  // so leaf and flower cards would occlude as solid rectangles. Thin wall-hugging
  // dressing (userData.noContactAO) reads as fully occluded at grazing depth.
  if(o.userData.noContactAO||materials.some(m=>m.opacity<.98||m.depthWrite===false||m.alphaTest>0)){hidden.push(o);o.visible=false;}});
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
 try{return draw();}finally{for(const o of hidden)o.visible=true;renderer.shadowMap.autoUpdate=auto;renderer.shadowMap.needsUpdate=needs;}
}
export const CONTACT_MODES=['indirect','legacy','off'];
// Indirect mode: occlusion multiplies only indirect diffuse and environment
// specular inside the material, as ambient occlusion should. Lamp, sun and
// television direct light keep their own shadow maps instead of being darkened
// a second time by a post-process blend. Legacy blends over the final image.
export const SCREEN_OCCLUSION_GLSL=`
 if(tianScreenOcclusionEnabled>0.5){
  float tianAO=mix(1.0,texelFetch(tianScreenOcclusion,ivec2(gl_FragCoord.xy),0).r,tianScreenOcclusionStrength);
  reflectedLight.indirectDiffuse*=tianAO;
  #if defined( USE_ENVMAP ) && defined( STANDARD )
   reflectedLight.indirectSpecular*=computeSpecularOcclusion(saturate(dot(geometryNormal,geometryViewDir)),tianAO,material.roughness);
  #endif
 }`;
export function installScreenOcclusion(material,uniforms){
 if(!material||material.transparent||material.userData.tianScreenOcclusion)return false;
 if(!(material.isMeshStandardMaterial||material.isMeshLambertMaterial||material.isMeshPhongMaterial))return false;
 material.userData.tianScreenOcclusion=true;
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,renderer)=>{previous.call(material,shader,renderer);
  Object.assign(shader.uniforms,{tianScreenOcclusion:uniforms.map,tianScreenOcclusionEnabled:uniforms.enabled,tianScreenOcclusionStrength:uniforms.strength});
  shader.fragmentShader='uniform sampler2D tianScreenOcclusion;\nuniform float tianScreenOcclusionEnabled;\nuniform float tianScreenOcclusionStrength;\n'+shader.fragmentShader.replace('#include <aomap_fragment>','#include <aomap_fragment>\n'+SCREEN_OCCLUSION_GLSL);
 };
 material.customProgramCacheKey=()=>key+'|tian-screen-occlusion-v1';material.needsUpdate=true;return true;
}
export function createContactShading(renderer,scene,camera,{mode='indirect',radius=.5,thickness=1,scale=2,distanceExponent=2,strength=1,legacyBlend=.35}={}){
 if(!CONTACT_MODES.includes(mode))throw Error('Unknown contact shading mode');
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:2});
 const composer=new EffectComposer(renderer,target),base=new RenderPass(scene,camera),ao=new GTAOPass(scene,camera,1,1,undefined,{radius,thickness,samples:8,distanceFallOff:1,screenSpaceRadius:false},{samples:8,radius:4}),output=new OutputPass(),cine=createCinematicGrade(),shafts=createShaftsPass();let lastFrame=performance.now();
 const render=ao.render.bind(ao);ao.render=(...args)=>withContactVisibility(scene,renderer,()=>render(...args));
 // A white 1×1 texture keeps the sampler valid whenever occlusion is not bound.
 const white=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);white.needsUpdate=true;
 const uniforms={map:{value:white},enabled:{value:0},strength:{value:strength}};
 // Legacy reproduces the pre-505 blend exactly for comparisons. Indirect uses a
 // stronger near-field falloff (browser-reviewed505): it no longer darkens direct light.
 const legacy={radius:.35,thickness:.15,scale:1,distanceExponent:1};let current=null,indirect={radius,thickness,scale,distanceExponent};
 const setMode=value=>{
  if(!CONTACT_MODES.includes(value))throw Error('Unknown contact shading mode');
  if(value===current)return;current=value;
  composer.passes.length=0;
  if(value==='indirect'){ao.output=GTAOPass.OUTPUT.Off;ao.needsSwap=false;ao.updateGtaoMaterial(indirect);composer.addPass(ao);composer.addPass(base);composer.addPass(cine.sanitize);composer.addPass(shafts);composer.addPass(cine.bloom);composer.addPass(cine.grade);composer.addPass(output);}
  else if(value==='legacy'){ao.output=GTAOPass.OUTPUT.Default;ao.needsSwap=true;ao.blendIntensity=legacyBlend;ao.updateGtaoMaterial(legacy);composer.addPass(base);composer.addPass(ao);composer.addPass(output);}
 };
 setMode(mode);
 return {uniforms,pass:ao,install:material=>installScreenOcclusion(material,uniforms),
  get mode(){return current;},setMode,
  setEnabled(value){setMode(value?'indirect':'off');},
  setParameters({strength:s=uniforms.strength.value,...gtao}={}){indirect={...indirect,...gtao};uniforms.strength.value=s;if(current==='indirect')ao.updateGtaoMaterial(indirect);},
  grade:cine,shafts,
  // Sun shafts: screen position of the sun and strength (0 disables).
  setShafts(uv,strength){shafts.uniforms.sunUV.value.copy(uv);shafts.uniforms.strength.value=strength;shafts.enabled=strength>0;},
  resize(w,h){composer.setSize(w,h);cine.resize(w,h);},
  render(){
   const auto=renderer.info.autoReset;renderer.info.autoReset=false;renderer.info.reset();
   try{
    if(current==='off')renderer.render(scene,camera);
    else{if(current==='indirect'){uniforms.map.value=ao.pdRenderTarget.texture;uniforms.enabled.value=1;}const now=performance.now();cine.tick(Math.min(.1,(now-lastFrame)/1000));lastFrame=now;composer.render();}
   }finally{uniforms.enabled.value=0;uniforms.map.value=white;renderer.info.autoReset=auto;}
  },
  dispose(){base.dispose();ao.dispose();output.dispose();cine.dispose();shafts.dispose?.();composer.dispose();target.dispose();white.dispose();}};
}
