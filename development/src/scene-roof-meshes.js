import {convexSolid} from './convex-solid.js';
import {profiledRoofGeometry} from './profiled-roof-geometry.js';
// Roof skin thickness is vertical; closure thickness is perpendicular to its wall.
// Convex collision uses the exact extruded faces; gameplay integration is separate.
function extrudeFace(face,offset){
 const n=face.length,vertices=[...face,...face.map(p=>p.map((v,i)=>v+offset[i]))],indices=[];
 const a=face[1].map((v,i)=>v-face[0][i]),b=face[2].map((v,i)=>v-face[0][i]),normal=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const same=normal.reduce((s,v,i)=>s+v*offset[i],0)>0;
 const triangle=(a,b,c)=>indices.push(...(same?[a,c,b]:[a,b,c]));
 for(let i=1;i<n-1;i++){triangle(0,i,i+1);triangle(n,n+i+1,n+i);}
 for(let i=0;i<n;i++){const j=(i+1)%n;triangle(i,n+j,j);triangle(i,n+i,n+j);}
 return {vertices,indices,collision:[convexSolid({vertices,indices})]};
}
export function sceneRoofMeshes(scene,{cellSize,storeyHeight,roofThickness,wallThickness}){
 if(![cellSize,storeyHeight,roofThickness,wallThickness].every(v=>Number.isFinite(v)&&v>0))throw Error('Provide explicit roof dimensions');
 const meshes=[];
 for(const roof of scene.roofVolumes||[]){
  if(roof.elevationUnit!=='storeys')throw Error('Unsupported roof elevation unit');
  const geometry=profiledRoofGeometry(roof),scale=p=>[p[0]*cellSize,p[1]*cellSize,p[2]*storeyHeight];
  for(const [i,slope]of geometry.slopes.entries()){
   const volume={id:`roof:${roof.id}:slope:${i}`,roofId:roof.id,levelId:roof.levelId,materialId:roof.surfaceTile,role:'roof',...extrudeFace(slope.vertices.map(scale),[0,0,-roofThickness])};
   if(roof.interiorTile){
    // Partition existing faces, rather than overlaying coplanar geometry.
    // Original closed collision hull remains on the roof shell only.
    const underside=[],shell=[],n=slope.vertices.length;
    for(let j=0;j<volume.indices.length;j+=3){const triangle=volume.indices.slice(j,j+3);(triangle.every(k=>k>=n)?underside:shell).push(...triangle);}
    meshes.push({...volume,id:volume.id+':interior',role:'roof-interior',materialId:roof.interiorTile,indices:underside,collision:[]});volume.indices=shell;
   }
   meshes.push(volume);
  }
  for(const [i,closure]of geometry.closures.entries()){
   let face=closure.vertices.map(scale).map((p,i)=>i<2?p:[p[0],p[1],Math.max(roof.baseElevation*storeyHeight,p[2]-roofThickness)]).filter((p,i,a)=>!a.slice(0,i).some(q=>p.every((v,k)=>Math.abs(v-q[k])<1e-9)));if(face.length<3)continue;
   const [a,b]=closure.vertices.map(scale),len=Math.hypot(b[0]-a[0],b[1]-a[1]),normal=[-(b[1]-a[1])/len*wallThickness,(b[0]-a[0])/len*wallThickness,0];
   face=face.map(p=>p.map((v,k)=>v-normal[k]/2));meshes.push({id:`roof:${roof.id}:closure:${i}`,roofId:roof.id,levelId:roof.levelId,materialId:roof.closureTile,role:'roof-closure',...extrudeFace(face,normal)});
  }
 }
 return meshes;
}
