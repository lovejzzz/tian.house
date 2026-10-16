import * as THREE from 'three';
import {EffectComposer} from '../node_modules/three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from '../node_modules/three/examples/jsm/postprocessing/RenderPass.js';
import {GTAOPass} from '../node_modules/three/examples/jsm/postprocessing/GTAOPass.js';
import {OutputPass} from '../node_modules/three/examples/jsm/postprocessing/OutputPass.js';
// Screen-space contact layer, not GI. Keep it outside radiance captures and use
// one final tone/color conversion. It also attenuates direct light approximately.
export function withContactVisibility(scene,renderer,draw){
 const hidden=[],auto=renderer.shadowMap.autoUpdate,needs=renderer.shadowMap.needsUpdate;
 scene.traverse(o=>{if(!o.visible||!o.isMesh)return;const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.some(m=>m.opacity<.98||m.depthWrite===false)){hidden.push(o);o.visible=false;}});
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
 try{return draw();}finally{for(const o of hidden)o.visible=true;renderer.shadowMap.autoUpdate=auto;renderer.shadowMap.needsUpdate=needs;}
}
export function createContactShading(renderer,scene,camera){
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:2});
 const composer=new EffectComposer(renderer,target),base=new RenderPass(scene,camera),ao=new GTAOPass(scene,camera,1,1,undefined,{radius:.35,thickness:.15,samples:8,distanceFallOff:1,screenSpaceRadius:false},{samples:8,radius:4}),output=new OutputPass();
 ao.blendIntensity=.35;const render=ao.render.bind(ao);ao.render=(...args)=>withContactVisibility(scene,renderer,()=>render(...args));
 composer.addPass(base);composer.addPass(ao);composer.addPass(output);
 let enabled=true;
 return {setEnabled(value){enabled=!!value;},resize(w,h){composer.setSize(w,h);},render(){
  const auto=renderer.info.autoReset;renderer.info.autoReset=false;renderer.info.reset();
  try{if(enabled)composer.render();else renderer.render(scene,camera);}finally{renderer.info.autoReset=auto;}
 },dispose(){base.dispose();ao.dispose();output.dispose();composer.dispose();}};
}
