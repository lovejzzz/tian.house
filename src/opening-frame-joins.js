// Omit a jamb only where two explicit continuous assembly members actually meet.
export function openingFrameJoins(volumes,openings,properties){
 const result=new Map(),members=new Map(openings.map(o=>[o.id,o]));
 const records=volumes.flatMap(v=>{const o=members.get(v.openingId),p=properties[o?.tile];if(!o?.assemblyId||!v.opening||!((o.kind==='door'&&p?.TianDoorAssembly==='continuous')||(o.kind==='window'&&p?.TianGlazing==='fixed')))return [];
  const [a,b]=v.hostEndpoints,len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=[(b[0]-a[0])/len,(b[1]-a[1])/len],at=u=>[a[0]+u*t[0],a[1]+u*t[1]];
  return [{o,v,t,start:at(v.opening[0]),end:at(v.opening[2])}];});
 for(const a of records){const sides=[true,true];for(const b of records){if(a===b||a.o.assemblyId!==b.o.assemblyId||a.o.kind!==b.o.kind||a.v.levelId!==b.v.levelId||a.t[0]*b.t[0]+a.t[1]*b.t[1]<1-1e-8||Math.abs(a.v.base+a.v.opening[1]-b.v.base-b.v.opening[1])>1e-8||Math.abs(a.v.base+a.v.opening[3]-b.v.base-b.v.opening[3])>1e-8)continue;
   if(Math.hypot(a.start[0]-b.end[0],a.start[1]-b.end[1])<1e-8)sides[0]=false;
   if(Math.hypot(a.end[0]-b.start[0],a.end[1]-b.start[1])<1e-8)sides[1]=false;
  }result.set(a.o.id,sides);
 }return result;
}
