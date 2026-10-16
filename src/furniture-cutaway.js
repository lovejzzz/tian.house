import * as THREE from 'three';
// Camera-only readability: actual triangle tests select coherent tall furniture.
// Geometry, collision and shadow casting remain intact; captures restore opacity.
export function createFurnitureCutaway(meshes){
 const groups=new Map(),ray=new THREE.Raycaster(),origin=new THREE.Vector3(),aim=new THREE.Vector3();
 for(const mesh of meshes){if(!mesh.userData.objectId||mesh.userData.wallCutaway||mesh.material.transparent)continue;const id=mesh.userData.objectId;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(mesh);}
 const entries=[];
 for(const members of groups.values()){
  const bounds=new THREE.Box3();for(const mesh of members){mesh.updateWorldMatrix(true,false);bounds.union(new THREE.Box3().setFromObject(mesh));}
  if(bounds.max.z-bounds.min.z<1.2)continue;
  // A faucet or lamp on a low unit must not turn the entire worktop into a
  // tall occluder. Require meaningful upper-body coverage, not just peak height.
  const upper=new THREE.Box3(),point=new THREE.Vector3();
  for(const mesh of members){const positions=mesh.geometry.attributes.position;for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);if(point.z>bounds.min.z+1.2)upper.expandByPoint(point);}}
  const size=bounds.getSize(new THREE.Vector3()),top=upper.getSize(new THREE.Vector3());
  if(top.x*top.y<size.x*size.y*.3)continue;
  for(const mesh of members){mesh.userData.furnitureCutaway={opacity:mesh.material.opacity,depthWrite:mesh.material.depthWrite,amount:0};mesh.material.transparent=true;mesh.material.needsUpdate=true;}
  entries.push(members);
 }
 return {update(camera,focus,dt,enabled=true){
  let changing=false;const blend=1-Math.exp(-Math.max(0,Math.min(.05,dt))/.16);
  origin.fromArray(camera);const points=focus?(Array.isArray(focus[0])?focus:[focus]):[];
  for(const members of entries){
   for(const mesh of members)mesh.updateWorldMatrix(true,false);
   const blocked=enabled&&points.some(point=>{aim.fromArray(point).sub(origin);ray.set(origin,aim.clone().normalize());ray.near=.05;ray.far=Math.max(.05,aim.length()-.25);return ray.intersectObjects(members,false).length>0;}),wanted=blocked?1:0;
   for(const mesh of members){const state=mesh.userData.furnitureCutaway;state.amount+=(wanted-state.amount)*blend;if(Math.abs(wanted-state.amount)<.002)state.amount=wanted;else changing=true;mesh.material.opacity=state.opacity*(1-.92*state.amount);mesh.material.depthWrite=state.depthWrite&&state.amount<.002;}
  }
  return changing;
 }};
}
