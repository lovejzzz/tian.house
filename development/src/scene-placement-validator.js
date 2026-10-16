import {sceneFurnitureVolumes} from './scene-furniture-volumes.js';
import {scenePhysicalMetrics} from './scene-physical-dimensions.js';
import {sceneWallVolumes} from './scene-wall-volumes.js';
import {sceneSlabVolumes} from './scene-slab-volumes.js';
import {sceneStairVolumes} from './scene-stair-volumes.js';
import {objectClosure} from './scene-objects.js';
import {validateVolumeObjectPlacement} from './volume-placement-check.js';
// Renderer-independent check shared by transaction callers. Loading an existing
// house is not an edit; preserve it rather than retroactively rewriting its layout.
export function createScenePlacementValidator(assets){
 return (before,after,properties)=>{
  const old=before.sceneDocument,scene=after.sceneDocument;
  if(!old||!scene||old.id!==scene.id)return {ok:true,coverage:'existing-house-load'};
  const previous=new Map(old.objects.map(o=>[o.id,JSON.stringify(o)])),changed=scene.objects.filter(o=>previous.get(o.id)!==JSON.stringify(o)).map(o=>o.id);
  if(!changed.length)return {ok:true,coverage:'no-object-change'};
  const ids=[...objectClosure(scene,changed)],metrics=scenePhysicalMetrics(scene),missing=[];
  const furniture=sceneFurnitureVolumes(scene,after,properties,assets,{...metrics,onUnresolved:o=>missing.push(o)});
  // Independently adjusted tabletop items must keep their bottom contact footprint
  // inside the actual top surface bounds, not merely the host's coarse grid cells.
  for(const id of changed){const object=scene.objects.find(o=>o.id===id);if(!object?.hostId)continue;
   const child=furniture.filter(v=>v.objectId===id).flatMap(v=>v.vertices),host=furniture.filter(v=>v.objectId===object.hostId).flatMap(v=>v.vertices);if(!child.length||!host.length)return {ok:false,error:'Cannot verify tabletop support'};
   const bottom=Math.min(...child.map(v=>v[2])),surface=host.filter(v=>Math.abs(v[2]-bottom)<.04),feet=child.filter(v=>v[2]<bottom+.025);if(!surface.length)return {ok:false,error:'No supporting tabletop surface'};
   if(feet.some(p=>[0,1].some(i=>p[i]<Math.min(...surface.map(v=>v[i]))-.005||p[i]>Math.max(...surface.map(v=>v[i]))+.005)))return {ok:false,error:'Keep the item base on its supporting tabletop'};
  }
  const walls=sceneWallVolumes(scene,properties,{...metrics,thickness:metrics.wallThickness}).volumes;
  const building=[...walls,...sceneSlabVolumes(scene,after,{...metrics,thickness:metrics.slabThickness}),...sceneStairVolumes(scene,metrics)];
  // Check each changed assembly against other final-position assemblies, not
  // their former occupied cells. Mounted children are allowed to touch hosts.
  const checked=new Set();
  for(const id of ids){
   let root=scene.objects.find(o=>o.id===id);while(root?.hostId)root=scene.objects.find(o=>o.id===root.hostId);
   const child=scene.objects.find(o=>o.id===id);
   if(child?.hostId&&!changed.includes(child.hostId)){const childIds=[...objectClosure(scene,[id])],result=validateVolumeObjectPlacement(furniture,[...furniture.filter(v=>v.objectId!==child.hostId),...building],childIds);if(!result.ok)return result;}
   if(!root||checked.has(root.id))continue;checked.add(root.id);
   const assembly=[...objectClosure(scene,[root.id])],result=validateVolumeObjectPlacement(furniture,[...furniture,...building],assembly);
   if(!result.ok){const blocker=scene.objects.find(o=>o.id===result.blocker);const name=blocker?.parts.map(p=>properties[p.tile]?.CustomName).find(Boolean);return {...result,error:result.error+' ('+(name||blocker?.assetId||result.blocker)+')'};}
  }
  return {ok:true,coverage:missing.length?'partial':'mapped-furniture',unmapped:missing.map(o=>o.assetId||o.objectId)};
 };
}
