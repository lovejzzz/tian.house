import * as THREE from 'three';
// Smooth only explicitly authored soft parts. Angle weighting avoids long, thin
// triangles biasing upholstery normals; hard architecture remains flat shaded.
export function volumeRenderGeometry(volume,{localOrigin=false}={}){
 const origin=localOrigin?volume.vertices[0]:[0,0,0];
 const positions=volume.vertices.map(p=>p.map((v,i)=>v-origin[i]));
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions.flat(),3));geometry.setIndex(volume.indices);
 if(volume.smoothNormals){
  const sums=volume.vertices.map(()=>new THREE.Vector3());
  for(let i=0;i<volume.indices.length;i+=3){const ids=volume.indices.slice(i,i+3),p=ids.map(id=>new THREE.Vector3(...volume.vertices[id])),normal=new THREE.Vector3().subVectors(p[1],p[0]).cross(new THREE.Vector3().subVectors(p[2],p[0])).normalize();
   for(let k=0;k<3;k++){const a=new THREE.Vector3().subVectors(p[(k+1)%3],p[k]).normalize(),b=new THREE.Vector3().subVectors(p[(k+2)%3],p[k]).normalize(),angle=Math.acos(THREE.MathUtils.clamp(a.dot(b),-1,1));sums[ids[k]].addScaledVector(normal,angle);}
  }
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(sums.flatMap(v=>v.normalize().toArray()),3));
 }
 const flat=geometry.toNonIndexed();geometry.dispose();if(!volume.smoothNormals)flat.computeVertexNormals();if(volume.uv)flat.setAttribute('uv',new THREE.Float32BufferAttribute(volume.uv,2));flat.userData.origin=[...origin];return flat;
}
