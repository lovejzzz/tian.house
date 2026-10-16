import {wallEdgeEndpoints} from './polygon-footprint.js';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Fade coherent wall planes, not individual sprite cells. Both axis-aligned and
// diagonal walls use the same camera/focus side test in calibrated world space.
export function wallFadeAmount(a,b,camera,focus){
 const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<1e-6)return 0;
 const side=p=>(dx*(p[1]-a[1])-dy*(p[0]-a[0]))/length;
 const f=side(focus),c=side(camera);if(f*c>=0)return 0;
 const distance=Math.hypot(camera[0]-focus[0],camera[1]-focus[1]);
 return smooth(Math.abs(f)/.35)*smooth(Math.abs(c)/Math.max(.1,distance*.3));
}
export function createWallCutaway(source,metrics,meshes){
 const walls=new Map(source.walls.map(w=>[w.id,wallEdgeEndpoints(w).map(p=>p.map(v=>v*metrics.cellSize))]));
 const openings=new Map(source.openings.map(o=>[o.id,o.hostWallId]));
 const mounts=new Map(source.objects.filter(o=>o.wallMounts?.length).map(o=>[o.id,o.wallMounts[0].wallId]));
 const members=[];
 for(const mesh of meshes){
  const u=mesh.userData,id=u.hostWallId||openings.get(u.openingId)||mounts.get(u.objectId)||u.structureId;
  const edge=walls.get(id);if(!edge||u.roofId)continue;
  const material=mesh.material;
  u.wallCutaway={opacity:material.opacity,depthWrite:material.depthWrite,amount:0};
  material.transparent=true;material.needsUpdate=true;members.push({mesh,edge});
 }
 return {
  update(camera,focus,dt,enabled){
   let changing=false;const blend=1-Math.exp(-Math.max(0,Math.min(.05,dt))/.14);
   for(const {mesh,edge}of members){
    const state=mesh.userData.wallCutaway,wanted=enabled?wallFadeAmount(...edge,camera,focus):0;
    state.amount+=(wanted-state.amount)*blend;
    if(Math.abs(wanted-state.amount)<.002)state.amount=wanted;else changing=true;
    mesh.material.opacity=state.opacity*(1-.97*state.amount);
    mesh.material.depthWrite=state.depthWrite&&state.amount<.002;
   }
   return changing;
  }
 };
}
