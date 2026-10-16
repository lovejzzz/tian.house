import {profiledRoofGeometry} from './profiled-roof-geometry.js';
import {normalizeFootprintPolygon} from './polygon-footprint.js';
import {FLOOR_MIN,FLOOR_MAX} from './workshop-model.js';

// Optional collection preserves older scene documents byte-for-byte. Heights
// explicitly use renderer storeys, never silently interpret metres as levels.
export function validateRoofVolumes(scene){
 const volumes=scene.roofVolumes===undefined?[]:scene.roofVolumes;
 if(!Array.isArray(volumes)||volumes.length>64)throw Error('Use up to 64 roof volumes');
 let area=0;
 for(const roof of volumes){
  if(!roof||roof.elevationUnit!=='storeys'||!scene.levels.some(l=>l.id===roof.levelId)||typeof roof.surfaceTile!=='string'||typeof roof.closureTile!=='string'||roof.locked!==undefined&&typeof roof.locked!=='boolean')throw Error('Invalid roof volume');
  if(roof.interiorTile!=null&&(typeof roof.interiorTile!=='string'||!roof.interiorTile))throw Error('Invalid interior roof finish');
  if(roof.name!==undefined&&(typeof roof.name!=='string'||roof.name.length>60))throw Error('Use a roof name up to 60 characters');
  if(!Number.isFinite(roof.baseElevation)||roof.baseElevation<FLOOR_MIN||roof.baseElevation>FLOOR_MAX+1)throw Error('Invalid roof base elevation');
  if(roof.baseElevation<scene.levels.find(l=>l.id===roof.levelId).index)throw Error('Roof base cannot be below its owner floor');
  normalizeFootprintPolygon(roof.vertices,{bounds:scene.bounds});
  const geometry=profiledRoofGeometry(roof);if(roof.profile.knots.some(p=>p[1]>FLOOR_MAX+1))throw Error('Roof exceeds supported height');
  area+=geometry.footprintArea;if(area>50000)throw Error('Roof volumes exceed 50000 cells');
 }
 return volumes;
}
export function editRoofVolume(scene,operation){
 const volumes=scene.roofVolumes??[],index=volumes.findIndex(v=>v.id===operation.id);
 if(operation.type==='roofVolume.remove'){
  if(index<0)throw Error('Roof volume not found');if(volumes[index].locked)throw Error('Unlock the roof volume before editing');
  scene.roofVolumes=volumes.filter((_,i)=>i!==index);
 }else if(operation.type==='roofVolume.add'){
  if(!operation.roof||volumes.some(v=>v.id===operation.roof.id))throw Error('Choose a new roof volume identity');
  scene.roofVolumes=[...volumes,structuredClone(operation.roof)];
 }else if(operation.type==='roofVolume.update'){
  if(index<0)throw Error('Roof volume not found');if(volumes[index].locked)throw Error('Unlock the roof volume before editing');
  const allowed=['vertices','profile','baseElevation','surfaceTile','closureTile','interiorTile','name'];
  if(!operation.patch||typeof operation.patch!=='object'||Array.isArray(operation.patch)||Object.keys(operation.patch).some(k=>!allowed.includes(k)))throw Error('Choose editable roof volume fields');
  scene.roofVolumes=volumes.map((roof,i)=>i===index?{...roof,...structuredClone(operation.patch)}:roof);
 }else throw Error('Unknown roof volume command');
 validateRoofVolumes(scene);return scene;
}
export function compileRoofVolumes(scene,properties){
 return validateRoofVolumes(scene).map(roof=>{
  const surface=properties[roof.surfaceTile],closure=properties[roof.closureTile];
  if(roof.interiorTile!=null){const interior=properties[roof.interiorTile];if(!interior||!('WallN'in interior||'WallW'in interior))throw Error('Choose a wall material for the interior roof finish');}
  if(!surface||!('solidfloor'in surface)||!closure||!('WallN'in closure||'WallW'in closure))throw Error('Choose a planar floor texture for the roof and a wall closure material');
  return {id:roof.id,levelId:roof.levelId,elevationUnit:roof.elevationUnit,surfaceTile:roof.surfaceTile,closureTile:roof.closureTile,...profiledRoofGeometry(roof)};
 });
}
