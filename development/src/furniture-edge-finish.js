import {convexSolid} from './convex-solid.js';
// Recipe-authored manufacturing chamfers. Skip non-box forms rather than erasing
// existing upholstery, handles, basin cavities or detailed silhouettes.
export function finishFurnitureEdges(parts,materials){
 return parts.map(part=>{
  const requested=materials[part.materialId]?.edgeRadius;
  if(requested===undefined)return part;
  if(!Number.isFinite(requested)||requested<=0||requested>.02)throw Error('Invalid furniture edge radius');
  if(part.vertices.length!==8||part.indices.length!==36)return part;
  const min=[0,1,2].map(a=>Math.min(...part.vertices.map(v=>v[a]))),max=[0,1,2].map(a=>Math.max(...part.vertices.map(v=>v[a])));
  if(part.vertices.some(v=>v.some((x,a)=>x!==min[a]&&x!==max[a])))return part;
  const r=Math.min(requested,...max.map((v,a)=>(v-min[a])*.12));
  const vertices=[],indices=[];
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])for(let axis=0;axis<3;axis++)vertices.push([x,y,z].map((s,a)=>(s<0?min[a]:max[a])-s*(a===axis?0:r)));
  const normals=[];
  for(const x of [-1,0,1])for(const y of [-1,0,1])for(const z of [-1,0,1])if(x||y||z)normals.push([x,y,z]);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  for(const n of normals){
   const dots=vertices.map(v=>dot(v,n)),support=Math.max(...dots),ids=dots.flatMap((d,i)=>Math.abs(d-support)<1e-9?[i]:[]);if(ids.length<3)continue;
   const center=[0,1,2].map(a=>ids.reduce((s,i)=>s+vertices[i][a],0)/ids.length),u=cross(n,Math.abs(n[0])<.5?[1,0,0]:[0,1,0]),v=cross(n,u);
   ids.sort((a,b)=>{const angle=i=>{const p=vertices[i].map((x,a)=>x-center[a]);return Math.atan2(dot(p,v),dot(p,u));};return angle(a)-angle(b);});
   for(let i=1;i<ids.length-1;i++)indices.push(ids[0],ids[i],ids[i+1]);
  }
  const result={...part,vertices,indices};result.collision=part.collision.length?[convexSolid(result)]:[];return result;
 });
}
