import {prismSolid} from './prism-solid.js';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// Intersect convex half-spaces in a shared local frame. A small inward offset
// permits surface contact but rejects positive-volume interpenetration.
export function solidsOverlap(a,b,epsilon=1e-5){
 if([0,1,2].some(i=>Math.min(a.bounds.max[i],b.bounds.max[i])-Math.max(a.bounds.min[i],b.bounds.min[i])<=epsilon))return false;
 const offset=b.origin.map((v,i)=>v-a.origin[i]);
 const planes=[...a.planes.map(p=>({...p,distance:p.distance-epsilon})),...b.planes.map(p=>({...p,distance:p.distance+dot(p.normal,offset)-epsilon}))];
 for(let i=0;i<planes.length-2;i++)for(let j=i+1;j<planes.length-1;j++)for(let k=j+1;k<planes.length;k++){
  const u=planes[i],v=planes[j],w=planes[k],vw=cross(v.normal,w.normal),wu=cross(w.normal,u.normal),uv=cross(u.normal,v.normal),det=dot(u.normal,vw);
  if(Math.abs(det)<1e-10)continue;
  const point=[0,1,2].map(axis=>(u.distance*vw[axis]+v.distance*wu[axis]+w.distance*uv[axis])/det);
  if(planes.every(p=>dot(p.normal,point)<=p.distance+1e-8))return true;
 }
 return false;
}
export function validateVolumeObjectPlacement(moving,stationary,ids){
 const selected=new Set(ids),parts=volumes=>volumes.flatMap(v=>(v.collision||[]).map(c=>({objectId:v.objectId,id:v.id,solid:c.kind==='convex'?c:prismSolid(c)})));
 const proposed=parts(moving.filter(v=>selected.has(v.objectId))),obstacles=parts(stationary.filter(v=>!selected.has(v.objectId)));
 for(const part of proposed)for(const other of obstacles)if(solidsOverlap(part.solid,other.solid))return {ok:false,error:'Furniture intersects '+(other.objectId?'another object':'the building')+'. Choose a clear position.',objectId:part.objectId,blocker:other.objectId||other.id};
 return {ok:true};
}
