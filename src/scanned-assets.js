import * as THREE from 'three';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
// Runtime access to the scanned CC0 deliveries in assets/scanned (built by
// tools/build_scanned_assets.py from private Poly Haven sources; see its manifest
// for authors, source pages and hashes). Textures are created synchronously (they
// fill in when the JPEGs arrive); models load asynchronously and are converted from
// glTF's Y-up to the house's Z-up world, scaled per the import recipe.
export const SCANNED_BASE=new URL('../assets/scanned/',import.meta.url);
export const SCANNED_TEXTURES=['white_plaster_rough_02','gravel_floor_02','wood_chips','bark_willow','grass_ground'];
export const SCANNED_MODELS={shrub_02:.55,shrub_03:1.6,shrub_04:1.4,fern_02:.8,weed_plant_02:1,dandelion_01:1,periwinkle_plant:1.2,garden_hose_wall_mounted_01:1};
const textureCache=new Map();
export function isScannedTexture(id){return SCANNED_TEXTURES.includes(id);}
// Each map costs a UV varying in three's shaders and the house materials already
// carry several world-position varyings (bounce, weathering, variation), so callers
// pick the channels: colour+normal by default, roughness where it matters; the
// packed AO is left out (contact AO comes from the screen-space pass).
export function scannedTextureSet(id,{repeat=[1,1],roughness=false,loader=new THREE.TextureLoader()}={}){
 if(!isScannedTexture(id))throw Error('Unknown scanned texture '+id);
 const key=id+'|'+repeat.join(',')+'|'+roughness;if(textureCache.has(key))return textureCache.get(key);
 const load=(suffix,srgb)=>{const t=loader.load(new URL(`${id}/${id}_${suffix}.jpg`,SCANNED_BASE).href);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1/repeat[0],1/repeat[1]);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=8;return t;};
 const set={map:load('color',true),normalMap:load('normal',false)};if(roughness)set.roughnessMap=load('orm',false);
 textureCache.set(key,set);return set;
}
const modelCache=new Map();
export function loadScannedModel(id,{loader=new GLTFLoader()}={}){
 if(!(id in SCANNED_MODELS))return Promise.reject(Error('Unknown scanned model '+id));
 if(!modelCache.has(id))modelCache.set(id,(async()=>{
  const manifest=await (await fetch(new URL('manifest.json',SCANNED_BASE))).json(),files=Object.keys(manifest.assets[id].deliveryFiles),gltf=files.find(f=>f.endsWith('.gltf'));
  const result=await loader.loadAsync(new URL(`${id}/${gltf}`,SCANNED_BASE).href),root=new THREE.Group();root.name='scanned:'+id;
  const inner=result.scene;inner.rotation.x=Math.PI/2;inner.scale.setScalar(SCANNED_MODELS[id]);root.add(inner);root.updateMatrixWorld(true);
  // Flatten to (geometry, material) pairs in the root's Z-up frame for instancing.
  const parts=[];root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);const m=o.material;m.side=THREE.DoubleSide;
   // Same varying budget as the scanned surfaces: drop the per-map AO/metalness channels.
   m.aoMap=null;m.metalnessMap=null;m.metalness=0;if(m.alphaMode==='BLEND'||m.transparent){m.transparent=false;m.alphaTest=.5;}parts.push({geometry:g,material:m});});
  const box=new THREE.Box3();for(const p of parts){p.geometry.computeBoundingBox();box.union(p.geometry.boundingBox);}
  // Sit the plant on z=0 at its footprint centre.
  const c=box.getCenter(new THREE.Vector3());for(const p of parts)p.geometry.translate(-c.x,-c.y,-box.min.z);
  return {id,parts,size:box.getSize(new THREE.Vector3()),authors:manifest.assets[id].authors,page:manifest.assets[id].page};
 })());
 return modelCache.get(id);
}
