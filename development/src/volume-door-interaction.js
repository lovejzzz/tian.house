import {segmentSolidInterval,sweepSolidBox} from './convex-solid.js';
import {prismSolid} from './prism-solid.js';
const solid=c=>c.kind==='convex'?c:prismSolid(c);
// Compile once after an edit, not again on every walking frame.
export function prepareDoorInteractionVolumes(volumes){return volumes.map(v=>({...v,collision:(v.collision||[]).map(solid)}));}
// Reach and visibility use the same compiled geometry as movement, including other floors.
export function nearbyVolumeDoor(position,volumes,doorIds,poses,maxReach=1.5){
 const candidates=[];
 for(const host of volumes){
  if(!host.hostEndpoints||!host.opening||!doorIds.has(host.openingId))continue;
  const [a,b]=host.hostEndpoints,length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=(host.opening[0]+host.opening[2])/2;
  const center=[a[0]+(b[0]-a[0])*u/length,a[1]+(b[1]-a[1])*u/length,host.base+(host.opening[1]+host.opening[3])/2];
  const distance=Math.hypot(...center.map((v,i)=>v-position[i]));if(distance>maxReach)continue;
  const blocked=volumes.some(v=>v.openingId!==host.openingId&&(v.collision||[]).some(c=>segmentSolidInterval(solid(c),position,center)));
  if(!blocked)candidates.push({id:host.openingId,distance,action:poses.get(host.openingId)?'Close door':'Open door'});
 }
 return candidates.sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id))[0]||null;
}
export function doorPoseOverlapsBody(parts,position,half){
 return parts.some(v=>(v.collision||[]).some(c=>sweepSolidBox(solid(c),position,position,half)));
}
