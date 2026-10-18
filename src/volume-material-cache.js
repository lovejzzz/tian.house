import {packSurfaceMaps} from './packed-surface-maps.js?v=a890ced93fdd';
import {sourceTextureKey} from './source-patch-texture.js?v=a890ced93fdd';
import * as THREE from 'three';
import {woodTexture,surfaceTexture} from './volume-material-texture.js?v=a890ced93fdd';
import {PROCEDURAL_SURFACES,isProceduralSurface} from './procedural-surfaces.js?v=a890ced93fdd';
import {scannedTextureSet} from './scanned-assets.js?v=a890ced93fdd';
export function createVolumeMaterialCache({sourceMaps=new Map()}={}){
 const cache=new Map();
 return {
  maps(material){
   // Scanned CC0 surfaces (assets/scanned): UVs are already in metres/repeat.
   if(material?.texture?.kind==='scanned')return scannedTextureSet(material.texture.id);
   if(['source-floor','source-patch'].includes(material?.texture?.kind)){const maps=sourceMaps.get(sourceTextureKey(material.texture));if(!maps)throw Error('Source material is not loaded');if(material.opacity<1||!maps.roughnessMap)return maps;const key='packed:'+sourceTextureKey(material.texture);if(!cache.has(key))cache.set(key,packSurfaceMaps({...maps,map:maps.map.clone(),...(maps.normalMap?{normalMap:maps.normalMap.clone()}:{}),roughnessMap:maps.roughnessMap.clone()},{opaque:true}));return cache.get(key);}
   if(!isProceduralSurface(material?.texture?.kind)&&!['wood','planks','grass','paving','plaster','roof','enamel-finish','brushed-steel','honed-stone','leather'].includes(material?.texture?.kind))return {};
   const key=JSON.stringify([material.texture,material.opacity<1]);if(cache.has(key))return cache.get(key);
   const data=(isProceduralSurface(material.texture.kind)?PROCEDURAL_SURFACES[material.texture.kind]:material.texture.kind==='wood'?woodTexture:surfaceTexture)(material.texture),make=(bytes,color)=>{const texture=new THREE.DataTexture(bytes,data.width,data.height,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=4;texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.needsUpdate=true;return texture;};
   const maps={map:make(data.color,true),roughnessMap:make(data.roughness,false)};if(data.relief)maps.bumpMap=make(data.relief,false);if(!(material.opacity<1))packSurfaceMaps(maps,{opaque:true});cache.set(key,maps);return maps;
  },
  dispose(){for(const map of new Set([...cache.values(),...sourceMaps.values()].flatMap(m=>Object.values(m))))map.dispose();cache.clear();sourceMaps.clear();}
 };
}
