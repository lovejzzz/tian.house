import * as THREE from 'three';
// Merge compatible opaque parts within one editable object, never across object identities.
// Collision volumes and authoritative source objects are not changed.
export function batchVolumeObjectMeshes(group){return batchMeshes(group,false);}
export function batchPianoKeyMeshes(group){return batchMeshes(group,true);}
function batchMeshes(group,pianoKeys){
 const buckets=new Map();
 for(const mesh of group.children){
  const m=mesh.material,g=mesh.geometry,u=mesh.userData;
  if(Number.isInteger(u.pianoMidi)!==pianoKeys||u.fridgeHinge||u.lidHinge||u.drawerSlide||u.softSupport||!u.objectId||u.roofId||!m?.isMeshStandardMaterial||m.transparent||m.opacity!==1||m.emissiveIntensity&&m.emissive.getHex()!==0||g.index||g.morphAttributes.position||!mesh.quaternion.equals(new THREE.Quaternion())||!mesh.scale.equals(new THREE.Vector3(1,1,1)))continue;
  if(['alphaMap','displacementMap','aoMap','lightMap','metalnessMap','emissiveMap','envMap'].some(k=>m[k]))continue;
  const attrs=Object.keys(g.attributes).sort();if(attrs.some(k=>!['position','normal','uv'].includes(k)))continue;
  const signature=[u.objectId,u.levelId,u.roomId,u.hostWallId,mesh.castShadow,mesh.receiveShadow,m.type,m.sheen,m.sheenColor?.getHex(),m.sheenRoughness,m.specularIntensity,m.color.getHex(),m.roughness,m.metalness,m.side,m.depthWrite,m.colorWrite,m.depthTest,m.polygonOffset,m.flatShading,m.map?.uuid,m.roughnessMap?.uuid,m.bumpMap?.uuid,m.bumpScale,m.normalMap?.uuid,m.normalMapType,m.normalScale?.x,m.normalScale?.y,attrs.map(k=>[k,g.attributes[k].itemSize,g.attributes[k].normalized])];
  const key=JSON.stringify(signature);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(mesh);
 }
 let removed=0;
 for(const meshes of buckets.values()){
  if(meshes.length<2)continue;
  const first=meshes[0],merged=new THREE.BufferGeometry();
  for(const name of Object.keys(first.geometry.attributes)){
   const original=first.geometry.attributes[name],size=meshes.reduce((n,m)=>n+m.geometry.attributes[name].array.length,0),array=new Float32Array(size);let offset=0;
   for(const mesh of meshes){const data=mesh.geometry.attributes[name].array;if(name==='position'){const delta=mesh.position.clone().sub(first.position).toArray();for(let i=0;i<data.length;i++)array[offset+i]=data[i]+delta[i%3];}else array.set(data,offset);offset+=data.length;}
   merged.setAttribute(name,new THREE.BufferAttribute(array,original.itemSize,original.normalized));
  }
  merged.computeBoundingBox();merged.computeBoundingSphere();
  if(pianoKeys){
   let start=0;first.userData.pianoKeyParts=meshes.map(mesh=>{
    mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox.clone().translate(mesh.position.clone().sub(first.position)),count=mesh.geometry.attributes.position.count;
    const part={midi:mesh.userData.pianoMidi,start,count,point:[(box.min.x+box.max.x)/2,(box.min.y+box.max.y)/2,box.max.z]};start+=count;return part;
   });
   // Translation-only key travel preserves normals. Conservative bounds include
   // the full depression so camera/shadow frusta cannot clip a moving key.
   merged.boundingBox.min.z-=.008;merged.boundingSphere.radius+=.008;
  }
  for(const mesh of meshes)mesh.geometry.dispose();first.geometry=merged;
  first.userData.batchedPartIds=meshes.map(m=>m.userData.structureId);
  for(const mesh of meshes.slice(1)){group.remove(mesh);mesh.material.dispose();removed++;}
 }
 return {removed,remaining:group.children.length};
}
