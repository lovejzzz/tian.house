import {packSurfaceMaps} from './packed-surface-maps.js';
import {sourceTextureKey} from './source-patch-texture.js';
import * as THREE from 'three';
import {woodTexture,surfaceTexture} from './volume-material-texture.js';
export function createVolumeMaterialCache({sourceMaps=new Map()}={}){
 const cache=new Map();
 return {
  maps(material){
   if(['source-floor','source-patch'].includes(material?.texture?.kind)){const maps=sourceMaps.get(sourceTextureKey(material.texture));if(!maps)throw Error('Source material is not loaded');if(material.opacity<1||!maps.roughnessMap)return maps;const key='packed:'+sourceTextureKey(material.texture);if(!cache.has(key))cache.set(key,packSurfaceMaps({...maps,map:maps.map.clone(),...(maps.normalMap?{normalMap:maps.normalMap.clone()}:{}),roughnessMap:maps.roughnessMap.clone()},{opaque:true}));return cache.get(key);}
   if(!['wood','planks','grass','paving','plaster','roof','enamel-finish','brushed-steel','honed-stone','leather'].includes(material?.texture?.kind))return {};
   const key=JSON.stringify([material.texture,material.opacity<1]);if(cache.has(key))return cache.get(key);
   const data=(material.texture.kind==='wood'?woodTexture:surfaceTexture)(material.texture),make=(bytes,color)=>{const texture=new THREE.DataTexture(bytes,data.width,data.height,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=4;texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.needsUpdate=true;return texture;};
   const maps={map:make(data.color,true),roughnessMap:make(data.roughness,false)};if(data.relief)maps.bumpMap=make(data.relief,false);if(!(material.opacity<1))packSurfaceMaps(maps,{opaque:true});cache.set(key,maps);return maps;
  },
  dispose(){for(const map of new Set([...cache.values(),...sourceMaps.values()].flatMap(m=>Object.values(m))))map.dispose();cache.clear();sourceMaps.clear();}
 };
}
