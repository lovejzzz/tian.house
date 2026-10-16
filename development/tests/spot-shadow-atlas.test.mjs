import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {spotAtlasLayout,patchSpotAtlasShader} from '../src/spot-shadow-atlas.js';import {installSoftShadowFilter} from '../src/soft-shadow-filter.js';
test('spot atlas rectangles retain every lamp resolution without overlapping neighbours',()=>{
 const sizes=Array.from({length:11},(_,i)=>i===0?[256,256]:[512,512]),layout=spotAtlasLayout(sizes);assert.equal(layout.width,2048);assert.equal(layout.height,2048);assert.deepEqual(layout.rects[0],[0,0,.125,.125]);assert.deepEqual(layout.rects[5],[.25,.25,.25,.25]);assert.equal(spotAtlasLayout(Array(20).fill([512,512])).height,2560);assert.throws(()=>spotAtlasLayout(Array(21).fill([512,512])));
});
test('atlas shader replaces the spot sampler array and retains receiver-corrected PCF',()=>{
 const material=new THREE.MeshStandardMaterial();installSoftShadowFilter(material);const shader={uniforms:{},fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);patchSpotAtlasShader(shader,{tianSpotAtlas:{value:null}});
 assert.doesNotMatch(shader.fragmentShader,/uniform sampler2DShadow spotShadowMap/);assert.doesNotMatch(shader.fragmentShader,/getShadow\( spotShadowMap/);assert.match(shader.fragmentShader,/tianSpotShadow\( UNROLLED_LOOP_INDEX,/);assert.match(shader.fragmentShader,/tianSpotSample\( index, vec3/);assert.match(shader.fragmentShader,/receiverSlope/);assert.match(shader.fragmentShader,/r.xy\+r.zw-texel\*0.5/);assert.equal((shader.fragmentShader.match(/uniform sampler2DShadow tianSpotAtlas/g)||[]).length,1);material.dispose();
});
test('spot atlas calls survive the installed renderer loop unroller',()=>{
 const shader={uniforms:{},fragmentShader:THREE.ShaderLib.standard.fragmentShader};patchSpotAtlasShader(shader,{});
 // Match WebGLProgram's loop expansion: only array indices and the explicit
 // UNROLLED_LOOP_INDEX token are substituted; bare i would be undefined.
 const expanded=shader.fragmentShader.replaceAll('NUM_SPOT_LIGHTS','11').replace(/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g,(_,start,end,body)=>Array.from({length:+end-+start},(_,j)=>body.replace(/\[\s*i\s*\]/g,`[ ${j+(+start)} ]`).replace(/UNROLLED_LOOP_INDEX/g,j+(+start))).join(''));
 assert.doesNotMatch(expanded,/tianSpotShadow\( i,/);assert.match(expanded,/tianSpotShadow\( 10,/);
 assert.match(shader.fragmentShader,/tianSpotShadow\( UNROLLED_LOOP_INDEX,/);
});

test('immutable capture atlas survives interleaved live renders and invalidates on new maps',async()=>{
 const {createSpotShadowAtlas}=await import('../src/spot-shadow-atlas.js');let blits=0,current=null;
 const gl={READ_FRAMEBUFFER:1,DRAW_FRAMEBUFFER:2,DEPTH_BUFFER_BIT:4,NEAREST:5,blitFramebuffer(){blits++;}};
 const renderer={info:{render:{frame:0}},capabilities:{maxTextureSize:4096},properties:{get:()=>({__webglFramebuffer:{}})},state:{bindFramebuffer(){}},getRenderTarget:()=>current,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,getScissorTest:()=>false,setScissorTest(){},initRenderTarget(){},getContext:()=>gl,setRenderTarget(t){current=t;}};
 const scene=new THREE.Scene(),light=new THREE.SpotLight();light.castShadow=true;scene.add(light);const camera=new THREE.PerspectiveCamera();
 const live=new THREE.WebGLRenderTarget(512,512,{depthTexture:new THREE.DepthTexture(512,512)}),frozen=new THREE.WebGLRenderTarget(512,512,{depthTexture:new THREE.DepthTexture(512,512)});frozen.userData={tianStaticCaptureShadow:true};
 const atlas=createSpotShadowAtlas(renderer),material=new THREE.MeshStandardMaterial();atlas.install(material);
 const draw=map=>{light.shadow.map=map;renderer.info.render.frame++;material.onBeforeRender(renderer,scene,camera);};
 draw(live);draw(frozen);assert.equal(blits,2);
 draw(live);draw(frozen);assert.equal(blits,3,'live recopies; unchanged capture does not');
 const replacement=new THREE.WebGLRenderTarget(512,512,{depthTexture:new THREE.DepthTexture(512,512)});replacement.userData={tianStaticCaptureShadow:true};draw(replacement);assert.equal(blits,4);
 atlas.dispose();live.dispose();frozen.dispose();replacement.dispose();material.dispose();
});
