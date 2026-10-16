import {convexIntersectionPolygon,polygonSignedArea} from './polygon-footprint.js';

// Used when a miter crosses a jamb partition. Clip physical cross-sections instead
// of folding a negative-width rectangular jamb into an inverted solid.
export function clippedWallVolume({id,a,t,n,length,base,height,thickness,opening,junction}){
 const halves=[[-thickness/2,0],[0,thickness/2]].map(([lo,hi],i)=>[[junction.start[i]*lo,lo],[length+junction.end[i]*lo,lo],[length+junction.end[i]*hi,hi],[junction.start[i]*hi,hi]]);
 const xs=[...new Set([...halves.flat().map(p=>p[0]),opening[0],opening[2]])].sort((a,b)=>a-b),zs=[...new Set([0,height,opening[1],opening[3]])].sort((a,b)=>a-b);
 const vertices=[],indices=[],collision=[],faces=new Map(),lookup=new Map();
 const key=p=>p.map(v=>Math.round(v*1e9)).join(',');
 const addFace=points=>{const k=points.map(key).sort().join(';');if(faces.has(k))faces.delete(k);else faces.set(k,points);};
 const clean=points=>points.filter((p,i)=>!points.slice(0,i).some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-9));
 for(const half of halves)for(let i=0;i<xs.length-1;i++){
  const x=xs[i],X=xs[i+1];if(X-x<1e-9)continue;
  const polygon=clean(convexIntersectionPolygon(half,[[x,-thickness],[X,-thickness],[X,thickness],[x,thickness]]));
  if(polygon.length<3||Math.abs(polygonSignedArea(polygon))<1e-10)continue;if(polygonSignedArea(polygon)<0)polygon.reverse();
  for(let j=0;j<zs.length-1;j++){
   const z=zs[j],Z=zs[j+1];if(x>=opening[0]-1e-9&&X<=opening[2]+1e-9&&z>=opening[1]&&Z<=opening[3])continue;
   addFace(polygon.map(p=>[...p,z]).reverse());addFace(polygon.map(p=>[...p,Z]));
   for(let k=0;k<polygon.length;k++){const p=polygon[k],q=polygon[(k+1)%polygon.length];addFace([[...p,z],[...q,z],[...q,Z],[...p,Z]]);}
   collision.push({polygon:polygon.map(([u,v])=>[a[0]+t[0]*u+n[0]*v,a[1]+t[1]*u+n[1]*v]),minZ:base+z,maxZ:base+Z});
  }
 }
 const vertex=p=>{const k=key(p);if(!lookup.has(k)){lookup.set(k,vertices.length);vertices.push([a[0]+t[0]*p[0]+n[0]*p[1],a[1]+t[1]*p[0]+n[1]*p[1],base+p[2]]);}return lookup.get(k);};
 for(const face of faces.values()){const ids=face.map(vertex);for(let i=1;i<ids.length-1;i++)indices.push(ids[0],ids[i],ids[i+1]);}
 return {id,vertices,indices,collision,opening:[...opening],length,height,thickness,junctionClipped:true};
}
