import {TextureSource} from 'three';
// Opaque colour textures use alpha for roughness. RGB bytes remain unchanged;
// alpha is linear even on an sRGB texture. Never pack transparent surfaces.
export function packSurfaceMaps(maps,{opaque=false}={}){
 const rough=maps.roughnessMap,b=rough?.image;
 const matches=t=>t?.image?.data&&b?.data&&t.image.width===b.width&&t.image.height===b.height&&t.image.data.length===b.data.length;
 const color=matches(maps.normalMap)?maps.normalMap:maps.map,a=color?.image;
 if(!matches(color)||a.data.length!==a.width*a.height*4)return maps;
 if(color===maps.map&&!opaque&&a.data.some((v,i)=>i%4===3&&v!==255))return maps;
 const data=a.data.slice();for(let i=3;i<data.length;i+=4)data[i]=b.data[i-2];
 color.source=new TextureSource({...a,data});color.userData.tianPackedRoughness=true;color.needsUpdate=true;rough.dispose();delete maps.roughnessMap;return maps;
}

export function installPackedRoughness(material){
 const normal=material.normalMap?.userData?.tianPackedRoughness;if(!normal&&!material.map?.userData?.tianPackedRoughness)return;
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);
  if(!normal)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.a = opacity;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','float roughnessFactor = roughness * texture2D('+ (normal?'normalMap, vNormalMapUv':'map, vMapUv') +').a;');
 };material.customProgramCacheKey=()=>key+'|packed-linear-roughness-v2|'+(normal?'normal':'color');
}
