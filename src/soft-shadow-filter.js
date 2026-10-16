import {ShaderChunk} from 'three';
// Wider PCF for diffuse household emitters. This is a bounded image-space
// approximation, not blocker-search PCSS or physical area-light transport.
const original=ShaderChunk.shadowmap_pars_fragment;
const start=original.indexOf('\t\t\t\tshadow = (');
const end=original.indexOf(') * 0.2;',start);
if(start<0||end<0)throw Error('Unsupported Three shadow filter; review installed shader before upgrading');
const taps=24;
const sum=Array.from({length:taps},(_,i)=>`texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( ${i}, ${taps}, phi ) * radius, shadowCoord.z ) )`).join(' +\n');
const replacement=`if ( shadowRadius > 3.0 ) { shadow = (${sum}) / ${taps}.0; } else {\n${original.slice(start,end+8)}\n}`;
// Receiver-plane correction: each tap compares against the depth of the
// receiver at that UV, not the centre pixel's depth. This avoids increasing a
// constant bias across thin walls when broadening a PCF kernel.
let corrected=original.slice(0,start)+replacement+original.slice(end+8);
const pcfStart=corrected.indexOf('float getShadow( sampler2DShadow');
const pcfEnd=corrected.indexOf('\n\t#endif',pcfStart);
let pcf=corrected.slice(pcfStart,pcfEnd);
pcf=pcf.replace('shadowCoord.z += shadowBias;',`shadowCoord.z += shadowBias;
 vec3 receiverDx = dFdx(shadowCoord.xyz), receiverDy = dFdy(shadowCoord.xyz);
 float receiverDet = receiverDx.x * receiverDy.y - receiverDx.y * receiverDy.x;
 vec2 receiverSlope = abs(receiverDet) > 1e-12
  ? vec2(receiverDx.z * receiverDy.y - receiverDy.z * receiverDx.y,
         receiverDx.x * receiverDy.z - receiverDy.x * receiverDx.z) / receiverDet
  : vec2(0.0);
 // Hardware PCF also covers a fractional texel around each explicit tap.
 float receiverResidual = min(dot(abs(receiverSlope), 1.0 / shadowMapSize), 0.01);
 shadowCoord.z -= receiverResidual;`);
pcf=pcf.replace(/(vogelDiskSample\( \d+, \d+, phi \) \* radius), shadowCoord.z/g,
 '$1, shadowCoord.z + clamp(dot(receiverSlope, $1), -0.01, 0.01)');
export const softShadowChunk=corrected.slice(0,pcfStart)+pcf+corrected.slice(pcfEnd);
export function installSoftShadowFilter(material,{curved=false}={}){
 const previous=material.onBeforeCompile,cacheKey=material.customProgramCacheKey.bind(material),key=cacheKey();
 material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>',curved?original.slice(0,start)+replacement+original.slice(end+8):softShadowChunk);};
 material.customProgramCacheKey=()=>key+'|tian-diffuser-pcf-24-receiver-v3'+(curved?'|curved':'');material.needsUpdate=true;
}
