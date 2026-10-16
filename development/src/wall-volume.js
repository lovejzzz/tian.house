import {clippedWallVolume} from './clipped-wall-volume.js';
// Physical units in, indexed closed surface + collision cells out. Z is up.
// Internal cell faces are omitted so openings have real reveals, not dark decals.
export function wallVolume({id,a,b,base=0,height,thickness,opening=null,endCaps=[true,true],junction={start:[0,0],end:[0,0]}}){
 if(!Array.isArray(endCaps)||endCaps.length!==2||endCaps.some(v=>typeof v!=='boolean'))throw Error('Invalid render end caps');
 if(typeof id!=='string'||!id||![a,b].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))||![base,height,thickness].every(Number.isFinite)||height<=0||thickness<=0)throw Error('Explicit finite wall dimensions required');
 const length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<1e-8)throw Error('Wall needs a nonzero length');
 // World-coordinate subtraction can differ from local aperture arithmetic by ulps.
 if(Array.isArray(opening)&&opening.length===4)opening=opening.map((v,i)=>{const end=i%2?height:length;return Math.abs(v)<1e-8?0:Math.abs(v-end)<1e-8?end:v;});
 if(opening&&(!Array.isArray(opening)||opening.length!==4||!opening.every(Number.isFinite)||opening[0]<0||opening[1]<0||opening[2]>length||opening[3]>height||opening[0]>=opening[2]||opening[1]>=opening[3]))throw Error('Opening must fit inside wall');
 const t=[(b[0]-a[0])/length,(b[1]-a[1])/length],n=[-t[1],t[0]],xs=[...new Set([0,length,...(opening?[opening[0],opening[2]]:[])])].sort((a,b)=>a-b),zs=[...new Set([0,height,...(opening?[opening[1],opening[3]]:[])])].sort((a,b)=>a-b),vertices=[],indices=[],lookup=new Map(),collision=[];
 const occupied=(i,j)=>i>=0&&i<xs.length-1&&j>=0&&j<zs.length-1&&(!opening||xs[i]<opening[0]||xs[i+1]>opening[2]||zs[j]<opening[1]||zs[j+1]>opening[3]);
 if(![junction.start,junction.end].every(a=>Array.isArray(a)&&a.length===2&&a.every(Number.isFinite)))throw Error('Invalid wall junction');
 const offset=(u,v)=>u+(u===0?junction.start[v<0?0:1]*v:u===length?junction.end[v<0?0:1]*v:0);
 for(const v of [-thickness/2,thickness/2])if(offset(length,v)<=offset(0,v)+1e-8)throw Error('Wall junction consumes an opening or short wall');
 if(opening&&[-thickness/2,thickness/2].some(v=>xs.some((x,i)=>i&&offset(x,v)<=offset(xs[i-1],v)+1e-8))){if(!endCaps.every(Boolean))throw Error('Clipped junction requires closed end caps');return clippedWallVolume({id,a,t,n,length,base,height,thickness,opening,junction});}
 const point=([u,v,z])=>{u=offset(u,v);return [a[0]+t[0]*u+n[0]*v,a[1]+t[1]*u+n[1]*v,base+z];};
 const vertex=p=>{const key=p.join(',');if(!lookup.has(key)){lookup.set(key,vertices.length);vertices.push(point(p));}return lookup.get(key);};
 const quad=(points,out)=>{const p=points.map(point),u=p[1].map((v,k)=>v-p[0][k]),v=p[2].map((v,k)=>v-p[0][k]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(cross.reduce((s,v,k)=>s+v*out[k],0)<0)points.reverse();const ids=points.map(vertex);indices.push(ids[0],ids[1],ids[2],ids[0],ids[2],ids[3]);};
 const lo=-thickness/2,hi=thickness/2;
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++)if(occupied(i,j)){
  const x=xs[i],X=xs[i+1],z=zs[j],Z=zs[j+1];
  for(const side of [-1,1]){const y=side*hi;quad([[x,y,z],[X,y,z],[X,y,Z],[x,y,Z]],[n[0]*side,n[1]*side,0]);}
  for(const [lo,hi]of [[-thickness/2,0],[0,thickness/2]]){
   if(!occupied(i-1,j)&&(i!==0||endCaps[0]))quad([[x,lo,z],[x,hi,z],[x,hi,Z],[x,lo,Z]],[-t[0],-t[1],0]);
   if(!occupied(i+1,j)&&(i!==xs.length-2||endCaps[1]))quad([[X,lo,z],[X,hi,z],[X,hi,Z],[X,lo,Z]],[t[0],t[1],0]);
   if(!occupied(i,j-1))quad([[x,lo,z],[X,lo,z],[X,hi,z],[x,hi,z]],[0,0,-1]);
   if(!occupied(i,j+1))quad([[x,lo,Z],[X,lo,Z],[X,hi,Z],[x,hi,Z]],[0,0,1]);
   collision.push({polygon:[[x,lo,z],[X,lo,z],[X,hi,z],[x,hi,z]].map(p=>point(p).slice(0,2)),minZ:base+z,maxZ:base+Z});
  }
 }
 return {id,vertices,indices,collision,opening:opening&&[...opening],length,height,thickness};
}
