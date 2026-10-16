import {objectOffset} from './scene-object-offset.js';
import {validatePhysicalDimensions} from './scene-physical-dimensions.js';
import {validateRoofVolumes} from './scene-roof-volumes.js';
import {validateViews} from './scene-views.js';
import {validateCalibration} from './scene-calibration.js';
import {validateReferences} from './scene-references.js';
import {validateHousePlan,FLOOR_MIN,FLOOR_MAX} from './workshop-model.js';

const clone=value=>structuredClone(value);
const collections=['walls','openings','rooms','objects','verticalLinks','references','views'];
const idValid=id=>typeof id==='string'&&id.length>0&&id.length<=200;
function requireValue(condition,message){if(!condition)throw Error(message);}

// Lossless import is deliberately separate from semantic recognition. Unknown
// tiles remain editable legacy records, rather than guessed structural objects.
export function migrateHousePlan(plan,bounds,{sceneId=crypto.randomUUID()}={}){
 validateHousePlan(plan,bounds);
 requireValue(idValid(sceneId),'Invalid scene ID');
 const backup=clone(plan),usedLevels=[...new Set([...plan.squares,...plan.items,...(plan.vehicles||[]),...(plan.spawn?[plan.spawn]:[])].map(o=>o.z))].sort((a,b)=>a-b);
 const metadata=clone(plan);delete metadata.squares;delete metadata.items;delete metadata.vehicles;
 const scene={schemaVersion:2,id:sceneId,revision:0,bounds:[...bounds],units:{kind:'source-grid',metresPerCell:null,evidence:null},
  levels:usedLevels.map(z=>({id:`level:${z}`,index:z,elevation:null,height:null})),
  legacy:{metadata,vehiclesPresent:Object.hasOwn(plan,'vehicles'),
   squares:plan.squares.map((value,i)=>({id:`square:${i}`,value:clone(value)})),
   items:plan.items.map((value,i)=>({id:`item:${i}`,value:clone(value)})),
   vehicles:(plan.vehicles||[]).map((value,i)=>({id:`vehicle:${i}`,value:clone(value)}))},
  migration:{sourceVersion:1,backup,report:{status:'legacy-preserved',squareCount:plan.squares.length,tileCount:plan.squares.reduce((n,s)=>n+s.tiles.length,0),itemCount:plan.items.length,vehicleCount:(plan.vehicles||[]).length,semanticConversion:false}},
  ...Object.fromEntries(collections.map(k=>[k,[]]))};
 return validateSceneDocument(scene);
}

export function validateSceneDocument(scene){
 requireValue(scene?.schemaVersion===2&&idValid(scene.id)&&Number.isSafeInteger(scene.revision)&&scene.revision>=0,'Invalid scene document');
 requireValue(Array.isArray(scene.bounds)&&scene.bounds.length===4&&scene.bounds.every(Number.isInteger)&&scene.bounds[0]<scene.bounds[2]&&scene.bounds[1]<scene.bounds[3],'Invalid scene bounds');
 requireValue(scene.units?.kind==='source-grid'&&(scene.units.metresPerCell===null||Number.isFinite(scene.units.metresPerCell)&&scene.units.metresPerCell>0),'Invalid scene scale');
 validatePhysicalDimensions(scene.physicalDimensions);validateCalibration(scene.units);validateViews(scene.views);
 if(scene.units.metresPerCell!==null)requireValue(typeof scene.units.evidence==='string'&&scene.units.evidence.trim().length>0,'A calibrated scale requires evidence');
 requireValue(Array.isArray(scene.levels)&&scene.levels.length<=FLOOR_MAX-FLOOR_MIN+1,'Invalid scene levels');
 const ids=new Set(),levels=new Set();
 const identity=entry=>{requireValue(idValid(entry?.id)&&!ids.has(entry.id),'Duplicate or invalid entity ID');ids.add(entry.id);};
 for(const level of scene.levels){identity(level);requireValue(Number.isInteger(level.index)&&level.index>=FLOOR_MIN&&level.index<=FLOOR_MAX&&!levels.has(level.index),'Invalid or duplicate floor');levels.add(level.index);for(const k of ['elevation','height'])requireValue(level[k]===null||Number.isFinite(level[k])&&(k!=='height'||level[k]>0),'Invalid floor dimensions');}
 for(const key of collections){requireValue(Array.isArray(scene[key]),`Invalid ${key}`);for(const entry of scene[key])identity(entry);}
 for(const roof of validateRoofVolumes(scene))identity(roof);
 for(const entry of [...scene.rooms,...scene.objects])requireValue(entry.locked===undefined||typeof entry.locked==='boolean','Invalid entity lock');
 for(const object of scene.objects)objectOffset(object);
 validateReferences(scene.references);for(const ref of scene.references)for(const annotation of ref.annotations||[])identity(annotation);
 for(const room of scene.rooms){if(room.roof!==undefined)identity(room.roof);if(room.floorOpenings!==undefined){requireValue(Array.isArray(room.floorOpenings),'Invalid floor openings');for(const opening of room.floorOpenings)identity(opening);}}
 requireValue(scene.legacy&&typeof scene.legacy.vehiclesPresent==='boolean'&&scene.legacy.metadata?.version===1,'Invalid legacy layer');
 for(const [key,limit]of [['squares',50000],['items',20000],['vehicles',1000]]){
  requireValue(Array.isArray(scene.legacy[key])&&scene.legacy[key].length<=limit,`Invalid legacy ${key}`);
  for(const entry of scene.legacy[key]){identity(entry);requireValue(entry.value&&levels.has(entry.value.z),'Legacy entity has no floor');}
 }
 if(scene.legacy.metadata.spawn)requireValue(levels.has(scene.legacy.metadata.spawn.z),'Entrance has no floor');
 const legacyValidation=legacyPlan(scene);for(const item of legacyValidation.items){if(!item.storageTile)continue;const host=scene.objects.find(o=>scene.levels.find(l=>l.id===o.levelId)?.index===item.z&&o.parts?.some(p=>o.x+p.dx===item.x&&o.y+p.dy===item.y&&p.tile===item.storageTile));if(host){let square=legacyValidation.squares.find(s=>s.x===item.x&&s.y===item.y&&s.z===item.z);if(!square){square={x:item.x,y:item.y,z:item.z,tiles:[]};legacyValidation.squares.push(square);}if(!square.tiles.includes(item.storageTile))square.tiles.push(item.storageTile);}}
 validateHousePlan(legacyValidation,scene.bounds);
 requireValue(scene.migration?.sourceVersion===1&&scene.migration.backup,'Missing pre-migration backup');
 validateHousePlan(scene.migration.backup,scene.bounds);
 return scene;
}
function legacyPlan(scene){
 const plan=clone(scene.legacy.metadata);
 plan.squares=scene.legacy.squares.map(e=>clone(e.value));plan.items=scene.legacy.items.map(e=>clone(e.value));
 if(scene.legacy.vehiclesPresent||scene.legacy.vehicles.length)plan.vehicles=scene.legacy.vehicles.map(e=>clone(e.value));
 return plan;
}
export function compileLegacyScene(scene){
 validateSceneDocument(scene);
 // Until structural compilation lands, fail explicitly instead of rendering a
 // plausible but incomplete house that silently drops semantic entities.
 requireValue(!(scene.roofVolumes?.length)&&['walls','openings','rooms','objects','verticalLinks'].every(k=>scene[k].length===0),'Structural scene compilation is not implemented yet');
 return legacyPlan(scene);
}
export function restoreMigrationBackup(scene){validateSceneDocument(scene);return clone(scene.migration.backup);}
export function exportSceneDocument(scene){validateSceneDocument(scene);return JSON.stringify(scene);}
export function importSceneDocument(text){return validateSceneDocument(JSON.parse(text));}
