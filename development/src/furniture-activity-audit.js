import {prismSolid} from './prism-solid.js';
import {sweepSolidBox} from './convex-solid.js';

// Advisory occupied-space checks. Zones are authored allowances, not certified
// ergonomics, animated motion envelopes, route reachability or egress checks.
export function furnitureActivityAudit(zones,volumes){
 return zones.map(zone=>{
  const centre=zone.min.map((v,i)=>(v+zone.max[i])/2),half=zone.min.map((v,i)=>(zone.max[i]-v)/2),blockers=new Set();
  for(const volume of volumes){
   if(volume.objectId===zone.objectId||volume.levelId!==zone.levelId)continue;
   for(const solid of volume.collision||[]){
    if(sweepSolidBox(solid.kind==='convex'?solid:prismSolid(solid),centre,centre,half))blockers.add(volume.objectId||volume.hostWallId||volume.id);
   }
  }
  return {...zone,blockers:[...blockers]};
 });
}
