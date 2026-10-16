import {validateThresholdSupports} from './door-threshold.js';
import {groundHeight} from './ground-height.js';
import {validateGroundSupport,validateGroundPlacement} from './ground-support.js';
import {hasOpeningProfile} from './window-profile.js';
import {fixtureAxis} from './furnishing.js';
import {replaceSceneOpenings} from './scene-openings.js';
import {diagonalOpeningHosts,fixedGlazing,assembledWindow} from './fixed-glazing.js';
import {roomContains} from './room-footprint.js';
import {bindWallMounts,wallMountKind,captureWallMountHosts,followWallMounts} from './scene-wall-mounts.js';
import {assertSceneLocks} from './scene-locks.js';
import {stairEntry,stairLinkEntry} from './scene-stairs.js';
import {WorkshopModel,tileKey} from './workshop-model.js';
import {migrateHousePlan} from './scene-document.js';
import {compileStructuralScene} from './scene-structure.js';
import {applySceneOperation} from './scene-session.js';
import {paneAxis} from './wall-joins.js';

const clean=plan=>{const copy=structuredClone(plan);delete copy.sceneDocument;delete copy.polygonGeometry;delete copy.returnStairs;delete copy.roofGeometry;return copy;};
const signature=s=>JSON.stringify(s?.tiles||[]);
// Transitional adapter: structure commands share the scene reducer; existing
// furnishing tools edit the retained legacy layer without flattening room IDs.
export class StructuredWorkshopModel extends WorkshopModel{
 constructor(plan,bounds,properties,catalog=[],{validatePlacement=null}={}){super(plan,bounds,properties);this.validatePlacement=validatePlacement;this.catalog=catalog;if(plan.sceneDocument){const compiled=compileStructuralScene(plan.sceneDocument,properties);this.plan={...compiled,vehicles:compiled.vehicles||[],sceneDocument:structuredClone(plan.sceneDocument)};this.index();}}
 setEntry(x,y,z){const result=super.setEntry(x,y,z);if(result.ok&&this.scene)this.scene.legacy.metadata.spawn={...this.plan.spawn};return result;}
 objectAt(x,y,z){const level=this.scene?.levels.find(l=>l.index===z);return this.scene?.objects.findLast(o=>o.levelId===level?.id&&o.parts.some(p=>o.x+p.dx===x&&o.y+p.dy===y));}
 get scene(){return this.plan.sceneDocument;}
 previewStructure(operation){
  try{
   let scene=this.scene?structuredClone(this.scene):migrateHousePlan(clean(this.plan),this.bounds);
   const operations=Array.isArray(operation)?operation:[operation];for(const operation of operations){
   if(operation.type==='room.add'&&!scene.levels.some(l=>l.id===operation.room.levelId))scene.levels.push({id:operation.room.levelId,index:operation.room.z,height:null,elevation:null});
   if(operation.type==='stairs.add'){const from=scene.levels.find(l=>l.id===operation.link.fromLevelId);if(from&&!scene.levels.some(l=>l.id===operation.link.toLevelId))scene.levels.push({id:operation.link.toLevelId,index:from.index+1,height:null,elevation:null});}
   scene=applySceneOperation(scene,operation,{catalog:this.catalog,properties:this.properties});}
   const plan=compileStructuralScene(scene,this.properties);return {ok:true,scene,plan};
  }catch(error){return {ok:false,reason:error.message};}
 }
 structure(operation){this.assertWritable();const result=this.previewStructure(operation);if(!result.ok){this.lastError=result.reason;return result;}this.plan={...result.plan,vehicles:result.plan.vehicles||[],sceneDocument:result.scene};this.index();return {ok:true};}
 adopt(scene){this.assertWritable();followWallMounts(captureWallMountHosts(this.scene),scene);assertSceneLocks(this.scene,scene);const compiled=compileStructuralScene(scene,this.properties);this.plan={...compiled,vehicles:compiled.vehicles||[],sceneDocument:scene};this.index();}
 wallAt(x,y,z,axis){const level=this.scene?.levels.find(l=>l.index===z);return this.scene?.walls.find(w=>w.levelId===level?.id&&w.x===x&&w.y===y&&(!axis||axis===w.axis));}
 roomAt(x,y,z){const level=this.scene?.levels.find(l=>l.index===z);return this.scene?.rooms.find(r=>r.levelId===level?.id&&roomContains(r,x,y));}
 stairAt(x,y,z){return this.scene?.verticalLinks.find(l=>this.scene.levels.find(v=>v.id===l.fromLevelId)?.index===z&&stairLinkEntry(l).parts.some(p=>l.x+p.dx===x&&l.y+p.dy===y));}
 stairOperation(entry,x,y,z){
  const from=this.scene.levels.find(l=>l.index===z);if(!from)throw Error('Create this floor first');
  if(entry.moveLinkId){const link=this.scene.verticalLinks.find(l=>l.id===entry.moveLinkId);if(!link)throw Error('The selected staircase no longer exists');if(link.fromLevelId!==from.id)throw Error('Move this staircase on its original floor');return {type:'stairs.move',id:link.id,x,y,axis:entry.facing,...(['return','straight'].includes(entry.shape)?{handedness:entry.handedness,run:entry.run}:{})};}
  const to=this.scene.levels.find(l=>l.index===z+1);return {type:'stairs.add',link:{id:crypto.randomUUID(),kind:'stairs',assetId:entry.id,axis:entry.facing,...(['return','straight'].includes(entry.shape)?{shape:entry.shape,...(entry.shape==='return'?{handedness:entry.handedness}:{}),run:entry.run}:{}),x,y,fromLevelId:from.id,toLevelId:to?.id||'level:'+(z+1)}};
 }
 fixtureOperation(entry,x,y,z){return {type:'objects.rehost',id:entry.moveObjectId,assetId:entry.id,x,y,levelId:this.scene?.levels.find(l=>l.index===z)?.id};}
 diagonalOperation(entry,x,y,z){
  const wall=this.scene?.walls.find(w=>w.id===entry.hostWallId);if(!wall||wall.x!==x||wall.y!==y||this.scene.levels.find(l=>l.id===wall.levelId)?.index!==z)throw Error('Point at a matching diagonal wall');
  const hosts=diagonalOpeningHosts(this.scene,wall,entry,this.properties),assemblyId=hosts.length>1?crypto.randomUUID():null;
  const operations=hosts.map(({wall,part})=>{
   const axis=wall.materialAxis||wall.axis,props=this.properties[part.tile]||{};
   if('Wall'+axis in props)return {type:'wall.material',id:wall.id,tile:part.tile};
   if(!('door'+axis in props||'window'+axis in props||fixedGlazing(props,axis)))throw Error('Choose a supported door or window for this wall');
   const previous=this.scene.openings.find(o=>o.hostWallId===wall.id);return {type:'opening.replace',opening:{id:previous?.id||crypto.randomUUID(),hostWallId:wall.id,kind:'door'+axis in props?'door':'window',tile:part.tile,...(assemblyId?{assemblyId}:{})}};
  });return operations.length===1?operations[0]:{type:'openings.replace',openings:operations.map(o=>o.opening)};
 }
 groundPlacement(entry,x,y,z){try{validateGroundPlacement(this.plan,this.properties,entry,x,y,z,(a,b,c)=>this.square(a,b,c));return {ok:true};}catch(error){return {ok:false,reason:error.message};}}
 previewFloorSupport(entry,points){
  try{
   const changed=new Map();
   for(const {x,y,z}of points){
    const check=this.groundPlacement(entry,x,y,z);if(!check.ok)return check;
    for(const part of entry.parts){const cx=x+part.dx,cy=y+part.dy,k=tileKey(cx,cy,z),source=changed.get(k)||this.square(cx,cy,z)||{x:cx,y:cy,z,room:z===0?-1:0,tiles:[]};
     const retained=(this.plan.polygonGeometry?.floors||[]).filter(f=>z===0&&f.z===z&&f.x===cx&&f.y===cy&&!f.full&&!f.roofId).map(f=>f.tile);
     const tiles=[...[this.properties[part.tile]?.TianGroundBase,part.tile].filter(Boolean),...source.tiles.filter(t=>!this.isFloor(t))];for(const tile of retained)if(!tiles.includes(tile))tiles.push(tile);
     changed.set(k,{...source,tiles});
    }
   }
   if(![...changed.values()].some(s=>groundHeight(s,this.properties)||groundHeight(this.square(s.x,s.y,s.z),this.properties)))return {ok:true};
   const squares=this.plan.squares.map(s=>changed.get(tileKey(s.x,s.y,s.z))||s);
   for(const [k,s]of changed)if(!this.squares.has(k))squares.push(s);
   const candidate={...this.plan,squares};validateGroundSupport(candidate,this.properties,this.scene);validateThresholdSupports(candidate,this.properties);return {ok:true};
  }catch(error){return {ok:false,reason:error.message};}
 }
 placement(entry,x,y,z){
  if(!this.floorBatchActive&&!entry?.stairs&&!entry?.vehicle&&entry?.parts?.length&&entry.parts.every(p=>this.isFloor(p.tile))){const check=this.previewFloorSupport(entry,[{x,y,z}]);if(!check.ok)return check;}
  const ground=this.groundPlacement(entry,x,y,z);if(!ground.ok)return ground;
  if(!entry?.hostWallId&&entry?.parts?.some(p=>hasOpeningProfile(this.properties[p.tile]))){
   const operations=[],assemblyId=entry.parts.length>1?'preview:assembly':null;for(const part of entry.parts){const axis=paneAxis(part.tile,this.properties)||['N','W'].find(a=>'door'+a in (this.properties[part.tile]||{})),wall=this.wallAt(x+part.dx,y+part.dy,z,axis);if(!wall)return {ok:false,reason:'Place this opening on an editable room wall'};const previous=this.scene.openings.find(o=>o.hostWallId===wall.id);operations.push({type:'opening.replace',opening:{id:previous?.id||'preview:'+wall.id,hostWallId:wall.id,kind:'door'+axis in (this.properties[part.tile]||{})?'door':'window',tile:part.tile,...(assemblyId?{assemblyId}:{})}});}
   return this.previewStructure({type:'openings.replace',openings:operations.map(o=>o.opening)});
  }
  if(entry?.hostWallId){const key=JSON.stringify([entry.id,entry.parts,entry.hostWallId,x,y,z]);if(this.diagonalPreview?.scene===this.scene&&this.diagonalPreview.key===key)return this.diagonalPreview.result;let result;try{result=this.previewStructure(this.diagonalOperation(entry,x,y,z));}catch(error){result={ok:false,reason:error.message};}this.diagonalPreview={scene:this.scene,key,result};return result;}
  if(entry?.moveObjectId){const key=JSON.stringify([entry.id,entry.moveObjectId,x,y,z]);if(this.fixturePreview?.scene===this.scene&&this.fixturePreview.key===key)return this.fixturePreview.result;const result=this.previewStructure(this.fixtureOperation(entry,x,y,z));this.fixturePreview={scene:this.scene,key,result};return result;}
  if(!this.scene||!entry?.stairs)return super.placement(entry,x,y,z);
  const key=JSON.stringify([entry.id,entry.moveLinkId,x,y,z]);if(this.stairPreview?.scene===this.scene&&this.stairPreview.key===key)return this.stairPreview.result;
  let result;try{result=this.previewStructure(this.stairOperation(entry,x,y,z));}catch(error){result={ok:false,reason:error.message};}this.stairPreview={scene:this.scene,key,result};return result;
 }
 placeFloorBatch(entry,points){
  this.assertWritable();if(entry?.stairs||entry?.vehicle||!entry?.parts?.length||!entry.parts.every(p=>this.isFloor(p.tile))||!Array.isArray(points)||!points.length||points.length>1200)return {ok:false,reason:'Choose up to 1200 floor cells'};
  const support=this.previewFloorSupport(entry,points);if(!support.ok)return support;
  const before=structuredClone(this.plan),previousBatch=this.floorBatchActive;this.floorBatchActive=true;
  try{for(const {x,y,z}of points){if(![x,y,z].every(Number.isInteger))throw Error('Choose grid floor cells');if(entry.parts.some(p=>this.square(x+p.dx,y+p.dy,z)?.tiles.some(t=>'TianReturnStair'in(this.properties[t]||{})||Object.keys(this.properties[t]||{}).some(k=>/^stairs[TBM][NW]$/.test(k)))))throw Error('Keep floor painting clear of stair footprints');const retained=(this.plan.polygonGeometry?.floors||[]).filter(f=>z===0&&f.z===z&&!f.full&&!f.roofId&&entry.parts.some(p=>x+p.dx===f.x&&y+p.dy===f.y));const result=super.place(entry,x,y,z);if(!result.ok)throw Error(result.reason);for(const f of retained){const square=this.square(f.x,f.y,z);if(!square.tiles.includes(f.tile))square.tiles.push(f.tile);}}if(this.scene)this.reconcile();else validateGroundSupport(this.plan,this.properties);return {ok:true};}
  catch(error){this.plan=before;this.index();return {ok:false,reason:error.message};}
  finally{this.floorBatchActive=previousBatch;}
 }
 placeLegacy(entry,x,y,z){
  if(!entry?.stairs&&!entry?.vehicle&&entry?.parts?.length&&entry.parts.every(p=>this.isFloor(p.tile)))return this.placeFloorBatch(entry,[{x,y,z}]);
  const before=structuredClone(this.plan),result=super.place(entry,x,y,z);if(!result.ok)return result;
  try{this.reconcile();return result;}catch(error){this.plan=before;this.index();return {ok:false,reason:error.message};}
 }
 place(entry,x,y,z){this.assertWritable();
  const ground=this.groundPlacement(entry,x,y,z);if(!ground.ok)return ground;
  if(this.scene&&entry?.itemType){
   // Flush the legacy furnishing buffer with the item before a later structural
   // command recompiles the scene. Roll back this placement if validation fails.
   const before=structuredClone(this.plan),result=super.place(entry,x,y,z);if(!result.ok)return result;
   try{this.reconcile();return result;}catch(error){this.plan=before;this.index();return {ok:false,reason:error.message};}
  }
  if(entry?.parts?.some(p=>hasOpeningProfile(this.properties[p.tile]))){const check=this.placement(entry,x,y,z);if(!check.ok)return check;}
  if(entry?.hostWallId){try{return this.structure(this.diagonalOperation(entry,x,y,z));}catch(error){return {ok:false,reason:error.message};}}
  if(entry?.moveObjectId)return this.structure(this.fixtureOperation(entry,x,y,z));
  if(this.scene&&entry?.stairs){try{return this.structure(this.stairOperation(entry,x,y,z));}catch(error){return {ok:false,reason:error.message};}}

  if(this.scene&&entry?.id&&entry.parts?.some(p=>wallMountKind(this.properties[p.tile]))){
   try{const next=structuredClone(this.scene),level=next.levels.find(l=>l.index===z);if(!level)throw Error('Create this floor first');if(!entry.parts.some(p=>this.wallAt(x+p.dx,y+p.dy,z,fixtureAxis(this.properties[p.tile]))))return this.placeLegacy(entry,x,y,z);const wallMounts=bindWallMounts(next,entry,x,y,level.id,this.properties);next.objects.push({id:crypto.randomUUID(),assetId:entry.id,assetVersion:'source-v1',levelId:level.id,x,y,parts:structuredClone(entry.parts),wallMounts});this.adopt(next);return {ok:true};}catch(error){return {ok:false,reason:error.message};}
  }
  if(this.scene&&entry?.parts?.length){
   const owned=entry.parts.map(p=>{const prop=this.properties[p.tile]||{},axis=paneAxis(p.tile,this.properties)||['N','W'].find(a=>['Wall','door','Window','window'].some(k=>k+a in prop));return {part:p,axis,wall:axis&&this.wallAt(x+p.dx,y+p.dy,z,axis)};});
   if(owned.some(o=>o.wall)){
    if(owned.some(o=>!o.wall))return {ok:false,reason:'The whole opening must fit a room wall'};
    try{
     const next=structuredClone(this.scene),assemblyId=owned.length>1&&owned.every(o=>assembledWindow(this.properties[o.part.tile],o.axis)||this.properties[o.part.tile]?.TianDoorAssembly==='continuous'&&'door'+o.axis in this.properties[o.part.tile])?crypto.randomUUID():null,replacements=[];
     for(const {part,wall,axis}of owned){const prop=this.properties[part.tile]||{},previous=next.openings.find(o=>o.hostWallId===wall.id);
      if('Wall'+axis in prop)next.walls.find(w=>w.id===wall.id).tile=part.tile;
      else{replacements.push({id:previous?.id||crypto.randomUUID(),hostWallId:wall.id,kind:'door'+axis in prop?'door':'window',tile:part.tile,...(assemblyId?{assemblyId}:{})});}
     }
     if(replacements.length)replaceSceneOpenings(next,replacements);this.adopt(next);return {ok:true};
    }catch(error){return {ok:false,reason:error.message};}
   }
  }
  if(this.scene&&entry?.id&&entry.parts?.length&&!entry.stairs&&entry.parts.every(p=>!this.isFloor(p.tile)&&!['N','W'].some(a=>['Wall','door','Window','window','Hoppable'].some(k=>k+a in (this.properties[p.tile]||{})))&&(!this.properties[p.tile]?.TianMount||['table','ceiling'].includes(this.properties[p.tile].TianMount)))){
   try{const next=structuredClone(this.scene),level=next.levels.find(l=>l.index===z);if(!level)throw Error('Create this floor first');const mounted=entry.parts.some(p=>this.properties[p.tile]?.TianMount==='table'),host=mounted&&next.objects.find(o=>o.levelId===level.id&&o.parts.some(p=>'IsTable'in this.properties[p.tile]&&o.x+p.dx===x&&o.y+p.dy===y));if(mounted&&!host)return this.placeLegacy(entry,x,y,z);
    next.objects.push({id:crypto.randomUUID(),assetId:entry.id,assetVersion:'source-v1',levelId:level.id,x,y,parts:structuredClone(entry.parts),...(host?{hostId:host.id}:{})});this.adopt(next);return {ok:true};
   }catch(error){return {ok:false,reason:error.message};}
  }
  return this.placeLegacy(entry,x,y,z);
 }
 erase(x,y,z,options={}){this.assertWritable();
  const top=this.square(x,y,z)?.tiles.at(-1),level=this.scene?.levels.find(l=>l.index===z),walls=this.scene?.walls.filter(w=>w.levelId===level?.id&&w.x===x&&w.y===y)||[],wall=walls.find(w=>w.id===options.hostWallId)||walls.find(w=>w.tile===top||this.scene.openings.some(o=>o.hostWallId===w.id&&o.tile===top))||walls[0];
  if(wall&&this.scene){const opening=this.scene.openings.find(o=>o.hostWallId===wall.id);
   if(opening&&(opening.tile===top||wall.axis.startsWith('D')||hasOpeningProfile(this.properties[opening.tile]))&&!options.all){const result=this.structure({type:'opening.remove',id:opening.id});if(!result.ok)this.onError?.(result.reason);return;}
  }
  if(wall&&!this.scene.rooms.some(r=>r.wallIds.includes(wall.id))&&(options.all||top===wall.tile)){const result=this.structure({type:'walls.remove',ids:[wall.id]});if(!result.ok)this.onError?.(result.reason);return;}
  let object=this.objectAt(x,y,z);if(options.all)while(object?.hostId)object=this.scene.objects.find(o=>o.id===object.hostId);
  if(object&&(options.all||object.parts.some(p=>p.tile===top&&object.x+p.dx===x&&object.y+p.dy===y))){const result=this.structure({type:'objects.remove',ids:[object.id]});if(!result.ok)this.onError?.(result.reason);return;}
  const link=this.scene?.verticalLinks.find(l=>this.scene.levels.find(v=>v.id===l.fromLevelId)?.index===z&&stairLinkEntry(l).parts.some(p=>l.x+p.dx===x&&l.y+p.dy===y&&p.tile===top));if(link){this.structure({type:'stairs.remove',id:link.id});return;}
  // Persist legacy-layer deletion before another operation recompiles the scene.
  const before=structuredClone(this.plan);
  try{super.erase(x,y,z,options);this.reconcile();return {ok:true};}
  catch(error){this.plan=before;this.index();this.lastError=error.message;this.onError?.(error.message);return {ok:false,reason:error.message};}
 }
 reconcile(){this.assertWritable();
  if(!this.scene){validateGroundSupport(this.plan,this.properties);return;}
  const scene=structuredClone(this.scene),expected=compileStructuralScene(scene,this.properties),expectedSquares=new Map(expected.squares.map(s=>[tileKey(s.x,s.y,s.z),s]));
  const legacy=new Map(scene.legacy.squares.map(e=>[tileKey(e.value.x,e.value.y,e.value.z),e]));
  const stripped=structuredClone(scene);stripped.legacy.squares=[];stripped.legacy.items=[];stripped.legacy.vehicles=[];stripped.legacy.metadata={version:1};stripped.objects=[];stripped.verticalLinks=[];
  // This derivative enumerates owned tiles without legacy floor support. The
  // complete scene is support-validated above and again when adopted below.
  // Independent diagonals contribute geometry, never square tiles. Omit them
  // from this tile-ownership-only derivative together with their openings.
  const diagonalIds=new Set(stripped.walls.filter(w=>w.independent&&w.axis.startsWith('D')&&!stripped.rooms.some(r=>r.wallIds.includes(w.id))).map(w=>w.id));
  stripped.walls=stripped.walls.filter(w=>!diagonalIds.has(w.id));stripped.openings=stripped.openings.filter(o=>!diagonalIds.has(o.hostWallId));
  for(const wall of stripped.walls)delete wall.independent;
  // Threshold geometry owns no square tiles and its exterior support was just
  // removed from this derivative. Validate it only on the complete scene.
  for(const opening of stripped.openings)delete opening.threshold;
  const owned=new Map(compileStructuralScene(stripped,this.properties).squares.map(s=>[tileKey(s.x,s.y,s.z),s.tiles]));
  for(const o of scene.objects){const z=scene.levels.find(l=>l.id===o.levelId).index;for(const p of o.parts){const key=tileKey(o.x+p.dx,o.y+p.dy,z);if(!owned.has(key))owned.set(key,[]);owned.get(key).push(p.tile);}}
  for(const link of scene.verticalLinks){const z=scene.levels.find(l=>l.id===link.fromLevelId).index;for(const p of stairLinkEntry(link).parts){const key=tileKey(link.x+p.dx,link.y+p.dy,z);if(!owned.has(key))owned.set(key,[]);owned.get(key).push(p.tile);}}
  const current=new Map(this.plan.squares.map(s=>[tileKey(s.x,s.y,s.z),s]));
  for(const key of new Set([...expectedSquares.keys(),...current.keys()])){
   const before=expectedSquares.get(key),after=current.get(key);if(signature(before)===signature(after))continue;
   const removed=[...(before?.tiles||[])],added=[];for(const tile of after?.tiles||[]){const i=removed.indexOf(tile);if(i>=0)removed.splice(i,1);else added.push(tile);}
   if(removed.some(t=>(owned.get(key)||[]).includes(t)))throw Error('Use Edit rooms to change this room boundary or floor');
   let row=legacy.get(key);if(!row){row={id:crypto.randomUUID(),value:{...structuredClone(after||before),tiles:[]}};scene.legacy.squares.push(row);legacy.set(key,row);}
   for(const tile of removed){const i=row.value.tiles.indexOf(tile);if(i>=0)row.value.tiles.splice(i,1);}row.value.tiles.push(...added);
  }
  const metadata=clean(this.plan);delete metadata.squares;delete metadata.items;delete metadata.vehicles;scene.legacy.metadata=metadata;
  // Preserve inventory/vehicle IDs through unchanged records; new entries get IDs.
  for(const key of ['items','vehicles']){const remaining=[...scene.legacy[key]];scene.legacy[key]=(this.plan[key]||[]).map(value=>{const i=remaining.findIndex(e=>JSON.stringify(e.value)===JSON.stringify(value));return i>=0?remaining.splice(i,1)[0]:{id:crypto.randomUUID(),value:structuredClone(value)};});}
  for(const value of [...this.plan.squares,...this.plan.items,...this.plan.vehicles,...(this.plan.spawn?[this.plan.spawn]:[])])if(!scene.levels.some(l=>l.index===value.z))scene.levels.push({id:'level:'+value.z,index:value.z,height:null,elevation:null});
  scene.revision++;this.adopt(scene);
 }
 commit(){this.assertWritable();try{if(this.pending)for(const item of this.plan.items)if(item.storageTile&&!this.square(item.x,item.y,item.z)?.tiles.includes(item.storageTile))delete item.storageTile;if(this.pending&&JSON.stringify(this.pending.before)!==JSON.stringify(this.plan))this.reconcile();if(this.pending&&this.validatePlacement){this.physicalValidation=this.validatePlacement(this.pending.before,this.plan,this.properties);if(!this.physicalValidation.ok)throw Error(this.physicalValidation.error);}return super.commit();}catch(error){this.lastError=error.message;this.cancel();this.onError?.(error.message);return false;}}
 blank(name){this.begin('New house');delete this.plan.sceneDocument;super.blank(name);}
}
