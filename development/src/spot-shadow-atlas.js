import * as THREE from 'three';
export const SPOT_SHADOW_CAPACITY=20;
const MAX=SPOT_SHADOW_CAPACITY,COLUMNS=4;
export function spotAtlasLayout(sizes,tileSize=512){
 if(sizes.length>MAX)throw Error('Spot shadow atlas capacity exceeded');
 const tile=Math.max(tileSize,...sizes.flat()),width=tile*COLUMNS,height=tile*Math.ceil(Math.max(16,sizes.length)/COLUMNS);
 return {tile,width,height,rects:sizes.map(([w,h],i)=>[(i%COLUMNS)*tile/width,Math.floor(i/COLUMNS)*tile/height,w/width,h/height])};
}
export function patchSpotAtlasShader(shader,uniforms){
 Object.assign(shader.uniforms,uniforms);
 let chunk=shader.fragmentShader.includes('#include <shadowmap_pars_fragment>')?THREE.ShaderChunk.shadowmap_pars_fragment:null;
 if(chunk)shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>',chunk);
 const source=shader.fragmentShader,start=source.indexOf('float getShadow( sampler2DShadow'),end=source.indexOf('\n\t#elif',start);
 if(start<0||end<0)throw Error('Unsupported PCF shader for shadow atlas');
 const body=source.slice(start,end).replace('float getShadow( sampler2DShadow shadowMap,','float tianSpotShadow( int index,').replaceAll('texture( shadowMap,','tianSpotSample( index,');
 const helper=`\n#if defined(USE_SHADOWMAP) && defined(SHADOWMAP_TYPE_PCF) && NUM_SPOT_LIGHT_SHADOWS > 0
 uniform sampler2DShadow tianSpotAtlas;
 uniform vec4 tianSpotRects[${MAX}];
 float tianSpotSample(int index,vec3 coord){
  vec4 r=tianSpotRects[index];
  vec2 texel=1.0/vec2(textureSize(tianSpotAtlas,0));
  vec2 uv=clamp(r.xy+coord.xy*r.zw,r.xy+texel*0.5,r.xy+r.zw-texel*0.5);
  return texture(tianSpotAtlas,vec3(uv,coord.z));
 }
 ${body}
 #endif\n`;
 shader.fragmentShader=source.replace(/uniform sampler2DShadow spotShadowMap\[ NUM_SPOT_LIGHT_SHADOWS \];/g,'').replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin).replaceAll('getShadow( spotShadowMap[ i ],','tianSpotShadow( UNROLLED_LOOP_INDEX,');
 // Functions must follow the original PCF helpers (Vogel taps, receiver correction).
 const main=shader.fragmentShader.indexOf('void main()');
 if(main<0)throw Error('Missing standard fragment entry');shader.fragmentShader=shader.fragmentShader.slice(0,main)+helper+shader.fragmentShader.slice(main);
}
export function createSpotShadowAtlas(renderer){
 const uniforms={tianSpotAtlas:{value:null},tianSpotRects:{value:Array.from({length:MAX},()=>new THREE.Vector4())}};let lastFrame=-1,copies=0;const banks={live:{target:null,tile:512,maps:[]},capture:{target:null,tile:512,maps:[]}};
 function sync(scene,camera){
  if(lastFrame===renderer.info.render.frame)return;
  const lights=[];scene.traverseVisible(o=>{if(o.isSpotLight&&o.castShadow&&o.layers.test(camera.layers))lights.push(o);});lights.sort((a,b)=>Number(!!b.map)-Number(!!a.map));
  const maps=lights.map(l=>l.shadow.map);
  const immutable=maps.length>0&&maps.every(map=>map?.userData?.tianStaticCaptureShadow===true);
  const bank=immutable?banks.capture:banks.live;let {target,tile}=bank;
  const sizes=lights.map(l=>[l.shadow.map?.width||l.shadow.mapSize.x,l.shadow.map?.height||l.shadow.mapSize.y]),layout=spotAtlasLayout(sizes,tile);
  if(Math.max(layout.width,layout.height)>renderer.capabilities.maxTextureSize)throw Error('Spot atlas exceeds GPU texture dimensions');
  // Live animation keeps its own atlas. Immutable capture maps can then survive
  // the normal gameplay renders interleaved between cube directions.
  if(immutable&&target&&layout.tile===tile&&target.height===layout.height&&maps.length===bank.maps.length&&maps.every((map,i)=>map===bank.maps[i])){
   uniforms.tianSpotAtlas.value=target.depthTexture;layout.rects.forEach((rect,i)=>uniforms.tianSpotRects.value[i].set(...rect));lastFrame=renderer.info.render.frame;return;
  }
  const oldTarget=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel(),scissor=renderer.getScissorTest();
  try{
   if(!target||layout.tile>tile||target.height!==layout.height){target?.dispose();tile=layout.tile;target=new THREE.WebGLRenderTarget(layout.width,layout.height,{depthTexture:new THREE.DepthTexture(layout.width,layout.height,THREE.UnsignedIntType)});target.depthTexture.compareFunction=THREE.LessEqualCompare;target.depthTexture.minFilter=target.depthTexture.magFilter=THREE.LinearFilter;renderer.initRenderTarget(target);bank.target=target;bank.tile=tile;}
   uniforms.tianSpotAtlas.value=target.depthTexture;
   const gl=renderer.getContext(),destination=renderer.properties.get(target).__webglFramebuffer;
   renderer.setScissorTest(false);
   lights.forEach((light,i)=>{
    const map=light.shadow.map;if(!map?.depthTexture)throw Error('PCF spot depth map is not ready');
    const rect=layout.rects[i];uniforms.tianSpotRects.value[i].set(...rect);const x=(i%COLUMNS)*tile,y=Math.floor(i/COLUMNS)*tile;
    // Installed Three copyTextureToTexture depth branch uses width/height as
    // destination endpoints, losing nonzero offsets. Use its tracked FBO binder.
    renderer.state.bindFramebuffer(gl.READ_FRAMEBUFFER,renderer.properties.get(map).__webglFramebuffer);
    renderer.state.bindFramebuffer(gl.DRAW_FRAMEBUFFER,destination);
    gl.blitFramebuffer(0,0,map.width,map.height,x,y,x+map.width,y+map.height,gl.DEPTH_BUFFER_BIT,gl.NEAREST);copies++;
   });
   bank.maps=maps;lastFrame=renderer.info.render.frame;
  }finally{renderer.setRenderTarget(oldTarget,face,mip);renderer.setScissorTest(scissor);}
 }
 return {install(material){if(material.userData.tianSpotAtlas)return;material.userData.tianSpotAtlas=true;const compile=material.onBeforeCompile,key=material.customProgramCacheKey(),before=material.onBeforeRender;
  material.onBeforeCompile=function(shader,r){compile.call(this,shader,r);patchSpotAtlasShader(shader,uniforms);};material.customProgramCacheKey=()=>key+'|spot-depth-atlas-v2';material.onBeforeRender=function(r,scene,camera,...args){before.call(this,r,scene,camera,...args);sync(scene,camera);};material.needsUpdate=true;
 },stats:()=>({copies,width:banks.live.target?.width||0,height:banks.live.target?.height||0,captureWidth:banks.capture.target?.width||0}),dispose(){for(const bank of Object.values(banks)){bank.target?.dispose();bank.target=null;bank.maps=[];}uniforms.tianSpotAtlas.value=null;}};
}
