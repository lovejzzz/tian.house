import * as THREE from 'three';
// High-detail resident body for the 3D home (tools/build_resident_hd.py): the CC0
// MakeHuman mesh reposed onto the game's Bip01 bind pose, with clothing shells and
// painted textures. It shares bone names and bind matrices with the source actor,
// so the existing animation sampler drives it by copying bone transforms by name.
export const RESIDENT_HD_BASE=new URL('../assets/characters/resident-hd/',import.meta.url);
export const RESIDENT_HD_PARTS=['body','eyes','underwear','shirt','trousers','shoes','hair'];

export function validateResidentHD(manifest){
 if(manifest?.schemaVersion!==1||manifest.id!=='resident-hd'||!Array.isArray(manifest.parts)||!Array.isArray(manifest.bones))throw Error('Unsupported high-detail resident asset');
 const names=manifest.parts.map(p=>p.name);
 for(const name of RESIDENT_HD_PARTS)if(!names.includes(name))throw Error('High-detail resident is missing '+name);
 const bones=new Set(manifest.bones.map(b=>b.name));
 for(const part of manifest.parts)for(const mesh of part.meshes){
  if(!mesh.skinBones?.length||!mesh.skinIndex||!mesh.skinWeight)throw Error('High-detail resident mesh is not skinned');
  for(const bone of mesh.skinBones)if(!bones.has(bone)||manifest.inverseBind?.[bone]?.length!==16)throw Error('Unknown or unbound bone '+bone);
 }
 return manifest;
}

const view=(bin,ref)=>ref.type==='u32'?new Uint32Array(bin,ref.offset,ref.length/4):new Float32Array(bin,ref.offset,ref.length/4);

export async function loadResidentHD(base=RESIDENT_HD_BASE){
 const manifest=validateResidentHD(await (await fetch(new URL('resident-hd.json',base))).json());
 const bin=await (await fetch(new URL(manifest.binary,base))).arrayBuffer();
 const loader=new THREE.TextureLoader(),textures=new Map();
 const texture=async(name,color)=>{if(!name)return null;if(!textures.has(name)){const t=await loader.loadAsync(new URL(name,base).href);t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=8;textures.set(name,t);}return textures.get(name);};
 const parts=[];
 for(const part of manifest.parts){
  const m=part.material||{},maps={map:await texture(m.map,true),bumpMap:await texture(m.bumpMap,false)};
  parts.push({part,maps,meshes:part.meshes.map(mesh=>{
   const g=new THREE.BufferGeometry();
   g.setAttribute('position',new THREE.BufferAttribute(view(bin,mesh.positions),3));
   g.setAttribute('normal',new THREE.BufferAttribute(view(bin,mesh.normals),3));
   g.setAttribute('uv',new THREE.BufferAttribute(view(bin,mesh.uvs),2));
   g.setIndex(new THREE.BufferAttribute(view(bin,mesh.indices),1));
   g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(Uint16Array.from(view(bin,mesh.skinIndex)),4));
   g.setAttribute('skinWeight',new THREE.BufferAttribute(view(bin,mesh.skinWeight),4));
   g.computeBoundingSphere();
   return {mesh,geometry:g};
  })});
 }
 return {manifest,parts,dispose(){for(const p of parts)for(const m of p.meshes)m.geometry.dispose();for(const t of textures.values())t.dispose();}};
}

export function residentHDMaterial(spec,maps){
 const cloth=spec.kind==='cloth'||spec.kind==='hair';
 return new THREE.MeshPhysicalMaterial({
  map:maps.map,bumpMap:maps.bumpMap,bumpScale:spec.bumpScale??1,roughness:spec.roughness??.8,metalness:0,
  sheen:spec.sheen??0,sheenRoughness:.75,sheenColor:new THREE.Color(...(spec.sheenColor||[1,1,1])),
  clearcoat:spec.clearcoat??0,clearcoatRoughness:.05,alphaTest:spec.alphaTest??0,
  side:cloth?THREE.DoubleSide:THREE.FrontSide,
 });
}

// One shared Bip01 hierarchy for every part (bones found by name for poses).
export function createResidentHDActor(hd,{install=()=>{}}={}){
 const model=new THREE.Group(),bones=new Map(),defs=hd.manifest.bones,inverse=hd.manifest.inverseBind;
 for(const def of defs){const b=new THREE.Bone();b.name=def.name;new THREE.Matrix4().fromArray(def.matrix).decompose(b.position,b.quaternion,b.scale);bones.set(def.name,b);}
 for(const def of defs)(bones.get(def.parent)||model).add(bones.get(def.name));
 model.updateMatrixWorld(true);
 const materials=[];
 for(const {part,maps,meshes} of hd.parts){
  const material=residentHDMaterial(part.material||{},maps);install(material);materials.push(material);
  for(const {mesh,geometry} of meshes){
   const skinned=new THREE.SkinnedMesh(geometry,material);skinned.frustumCulled=false;skinned.castShadow=['body','shoes'].includes(part.name); // clothes and hair follow the body silhouette within millimetresskinned.receiveShadow=true;
   skinned.userData.characterPart=part.name;skinned.name='resident-hd:'+part.name;
   skinned.bind(new THREE.Skeleton(mesh.skinBones.map(b=>bones.get(b)),mesh.skinBones.map(b=>new THREE.Matrix4().fromArray(inverse[b]))),new THREE.Matrix4());
   model.add(skinned);
  }
 }
 return {model,bones,materials};
}

// Copy the sampled source pose: actor facing/mirroring and every bone's local transform.
export function syncResidentHD(actor,source,{showering=false,partVisible=(part,visible)=>visible}={}){
 actor.model.position.copy(source.actor.position);actor.model.quaternion.copy(source.actor.quaternion);actor.model.scale.copy(source.actor.scale);
 const from=source.bodyBones;
 for(const [name,bone] of actor.bones){const src=from?.get(name);if(src){bone.position.copy(src.position);bone.quaternion.copy(src.quaternion);bone.scale.copy(src.scale);}}
 for(const child of actor.model.children)if(child.isSkinnedMesh)child.visible=partVisible(child.userData.characterPart,true,showering);
}
