import {fixedGlazing} from './fixed-glazing.js';
import {legacyOpeningProfile} from './legacy-opening-profiles.js';
import {wallJunctions} from './wall-junctions.js';
import {wallEdgeEndpoints} from './polygon-footprint.js';
import {windowProfile,doorProfile} from './window-profile.js';
import {wallVolume} from './wall-volume.js';
// Explicit migration dimensions: old grid/storeys do not establish real metres.
// Missing metadata requires a reviewed source profile; never infer from a name.
export function sceneWallVolumes(scene,properties,{cellSize,storeyHeight,wallHeight,thickness,reportJunctionConflicts=false}){
 if(![cellSize,storeyHeight,wallHeight,thickness].every(v=>Number.isFinite(v)&&v>0))throw Error('Provide explicit physical calibration');
 const levels=new Map(scene.levels.map(l=>[l.id,l.index])),openings=new Map(scene.openings.map(o=>[o.hostWallId,o])),volumes=[],unresolved=[];
 const edges=scene.walls.map(w=>{const [a,b]=wallEdgeEndpoints(w).map(p=>p.map(v=>v*cellSize));return {...w,a,b};}),joins=wallJunctions(edges);
 for(const wall of scene.walls){
  const level=levels.get(wall.levelId);if(level===undefined)throw Error('Unknown wall level');
  const [a,b]=wallEdgeEndpoints(wall).map(p=>p.map(v=>v*cellSize)),length=Math.hypot(b[0]-a[0],b[1]-a[1]),source=openings.get(wall.id);let aperture=null;
  if(source){
   if(source.kind==='passage')aperture=[0,0,length,wallHeight];
   else if(source.kind==='window'&&fixedGlazing(properties[source.tile],wall.materialAxis||wall.axis)){
    // Authored fixed glazing occupies the entire host, including diagonal runs.
    // Its frame is part of the opening assembly, not an opaque knee wall.
    aperture=[0,0,length,wallHeight];
   }
   else{const profile=(source.kind==='door'?doorProfile(properties[source.tile]):windowProfile(properties[source.tile]))||legacyOpeningProfile(source.tile,source.kind,properties[source.tile])?.rect;
    if(!profile){unresolved.push({wallId:wall.id,openingId:source.id,reason:'Explicit aperture profile required'});continue;}
    const origin=(length-cellSize)/2;aperture=[origin+profile[0]*cellSize,(1-profile[3])*wallHeight,origin+profile[2]*cellSize,(1-profile[1])*wallHeight];
   }
  }
  let geometry;
  try{geometry=wallVolume({id:wall.id,a,b,base:level*storeyHeight,height:wallHeight,thickness,opening:aperture,junction:joins.get(wall.id)});}
  catch(error){if(reportJunctionConflicts&&source&&error.message==='Wall junction consumes an opening or short wall'){unresolved.push({wallId:wall.id,openingId:source.id,reason:error.message});continue;}throw error;}
  volumes.push({...geometry,hostEndpoints:[a,b],base:level*storeyHeight,materialId:wall.tile,levelId:wall.levelId,openingId:source?.id??null});
 }
 return {volumes,unresolved,complete:unresolved.length===0};
}
