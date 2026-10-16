import {arrangeSceneObjects} from './scene-arrangement.js';
import {setPhysicalDimensions} from './scene-physical-dimensions.js';
import {editRoofVolume} from './scene-roof-volumes.js';
import {stairLinkEntry} from './scene-stairs.js';
import {finishWall} from './wall-finishes.js';
import {replaceSceneOpenings,removeSceneOpening} from './scene-openings.js';
import {chamferRoom,reshapePolygonRoom} from './scene-polygon-rooms.js';
import {captureWallMountHosts,followWallMounts,rehostWallFixture,flipWallFixtureSide} from './scene-wall-mounts.js';
import {editIndependentWalls} from './scene-walls.js';
import {editViews} from './scene-views.js';
import {captureSceneLocks,assertCapturedLocks,setEntityLocks} from './scene-locks.js';
import {calibrateScene} from './scene-calibration.js';
import {editReferences} from './scene-references.js';
import {editRoomRoof,ensureRoofLevels} from './scene-roofs.js';
import {editFloorOpening} from './scene-floor-openings.js';
import {copyLevelLayout,addUpperRoom} from './scene-levels.js';
import {rotateSceneObjects} from './scene-rotation.js';
import {nudgeSceneObjects,moveSceneObjects,removeSceneObjects,copySceneObjects} from './scene-objects.js';
import {validateSceneDocument} from './scene-document.js';
import {moveRoomEdge,roomFromWalls,addRectangularRoom,moveRoomBoundary,compileStructuralScene,splitRoom,mergeRooms,removeRoom} from './scene-structure.js';

export function applySceneOperation(scene,operation,options={}){
 if(operation.type==='entities.lock')return setEntityLocks(scene,operation);
 const before=captureSceneLocks(scene),hosts=captureWallMountHosts(scene),next=reduceSceneOperation(scene,operation,options);followWallMounts(hosts,next);assertCapturedLocks(before,next);return next;
}
function reduceSceneOperation(scene,operation,{catalog=[],properties={}}={}){
 switch(operation.type){
  case 'scene.physicalDimensions':return setPhysicalDimensions(scene,operation.dimensions,{properties});
  case 'roofVolume.add':case 'roofVolume.update':case 'roofVolume.remove':return editRoofVolume(scene,operation);
  case 'walls.draw':case 'walls.move':case 'walls.remove':return editIndependentWalls(scene,operation);
  case 'view.save':case 'view.remove':return editViews(scene,operation);
  case 'scene.calibrate':case 'scene.clearCalibration':return calibrateScene(scene,operation);
  case 'reference.add':case 'reference.update':case 'reference.remove':case 'reference.annotate':case 'reference.unannotate':return editReferences(scene,operation);
  case 'roof.set':case 'roof.remove':return editRoomRoof(scene,operation);
  case 'floorOpening.add':case 'floorOpening.remove':return editFloorOpening(scene,operation);
  case 'room.addAbove':return ensureRoofLevels(addUpperRoom(scene,operation));
  case 'level.copyLayout':return copyLevelLayout(scene,operation);
  case 'stairs.add':scene.verticalLinks.push(structuredClone(operation.link));break;
  case 'stairs.remove':{const i=scene.verticalLinks.findIndex(l=>l.id===operation.id);if(i<0)throw Error('Staircase not found');scene.verticalLinks.splice(i,1);break;}
  case 'stairs.move':{const link=scene.verticalLinks.find(l=>l.id===operation.id);if(!link)throw Error('Staircase not found');link.x=operation.x;link.y=operation.y;if(operation.axis)link.axis=operation.axis;if(['return','straight'].includes(link.shape)){if(operation.handedness!==undefined)link.handedness=operation.handedness;if(operation.run!==undefined)link.run=operation.run;}link.assetId=stairLinkEntry(link).id;break;}
  case 'objects.flipWallSide':return flipWallFixtureSide(scene,operation,catalog,properties);
  case 'objects.rehost':return rehostWallFixture(scene,operation,catalog,properties);
  case 'objects.arrange':return arrangeSceneObjects(scene,operation,catalog,properties);
  case 'objects.rotate':return rotateSceneObjects(scene,operation,catalog,properties);
  case 'objects.group':{if(typeof operation.groupId!=='string'||!operation.groupId||!Array.isArray(operation.ids)||operation.ids.some(id=>!scene.objects.some(o=>o.id===id)))throw Error('Choose objects to group');for(const o of scene.objects)if(operation.ids.includes(o.id))o.groupId=operation.groupId;break;}
  case 'objects.ungroup':for(const o of scene.objects)if(operation.ids?.includes(o.id))delete o.groupId;break;
  case 'objects.copy':return copySceneObjects(scene,operation);
  case 'objects.remove':return removeSceneObjects(scene,operation);
  case 'objects.nudge':return nudgeSceneObjects(scene,operation);
  case 'objects.move':return moveSceneObjects(scene,operation);
  case 'room.chamfer':return chamferRoom(scene,operation);
  case 'room.outline':return reshapePolygonRoom(scene,operation);
  case 'room.remove':return removeRoom(scene,operation);
  case 'room.floor':{const room=scene.rooms.find(r=>r.id===operation.roomId);if(!room)throw Error('Room not found');if(typeof operation.tile!=='string')throw Error('Choose a floor material');room.floorTile=operation.tile;break;}
  case 'room.split':return splitRoom(scene,operation);
  case 'room.merge':return mergeRooms(scene,operation);
  case 'room.enclose':return roomFromWalls(scene,operation);
  case 'room.add':return addRectangularRoom(scene,operation.room);
  case 'room.edgeMove':return ensureRoofLevels(moveRoomEdge(scene,operation));
  case 'room.resize':return ensureRoofLevels(moveRoomBoundary(scene,operation));
  case 'opening.threshold':{const opening=scene.openings.find(o=>o.id===operation.id);if(!opening||opening.kind!=='door')throw Error('Choose a door for the threshold');if(operation.threshold===null)delete opening.threshold;else opening.threshold=structuredClone(operation.threshold);break;}
  case 'opening.add':scene.openings.push(structuredClone(operation.opening));break;
  case 'opening.replace':return replaceSceneOpenings(scene,[operation.opening]);
  case 'openings.replace':return replaceSceneOpenings(scene,operation.openings);
  case 'opening.remove':return removeSceneOpening(scene,operation.id);
  case 'wall.finish':return finishWall(scene,operation,properties);
  case 'room.finish':{
   const room=scene.rooms.find(r=>r.id===operation.roomId);if(!room)throw Error('Room not found');
   if(!['room','outside'].includes(operation.side))throw Error('Choose room or outside wall faces');
   for(const id of room.wallIds){const wall=scene.walls.find(w=>w.id===id);finishWall(scene,{id,roomId:room.id,side:operation.side,tile:operation['wall'+(wall.materialAxis||wall.axis)]},properties);}break;
  }
  case 'wall.material':{
   const wall=scene.walls.find(w=>w.id===operation.id);if(!wall)throw Error('Wall not found');wall.tile=operation.tile;break;
  }
  case 'level.add':scene.levels.push(structuredClone(operation.level));break;
  case 'scene.rename':
   if(typeof operation.name!=='string'||!operation.name.trim()||operation.name.length>60)throw Error('Use a name between 1 and 60 characters');
   scene.legacy.metadata.name=operation.name.trim();break;
  default:throw Error('Unknown scene command');
 }
 return scene;
}

// Both editor gestures and automation submit the same versioned command envelope.
// Repository persistence is part of committing: failure never advances live state.
export class SceneSession {
 #snapshot;#properties;#repository;#catalog;
 constructor(snapshot,properties,repository,catalog=[]){this.#catalog=catalog;
  validateSceneDocument(snapshot.scene);compileStructuralScene(snapshot.scene,properties);
  if(!Array.isArray(snapshot.undo)||!Array.isArray(snapshot.redo)||!Array.isArray(snapshot.receipts))throw Error('Invalid scene session');
  this.#snapshot=structuredClone(snapshot);this.#properties=properties;this.#repository=repository;
 }
 static async create(scene,properties,repository,catalog=[]){
  const snapshot={scene:structuredClone(scene),undo:[],redo:[],receipts:[]};
  const session=new SceneSession(snapshot,properties,repository,catalog);await repository.save(snapshot,null);return session;
 }
 static async open(id,properties,repository,catalog=[]){const snapshot=await repository.load(id);if(!snapshot)throw Error('Scene not found');return new SceneSession(snapshot,properties,repository,catalog);}
 read(){return structuredClone(this.#snapshot.scene);}
 compile(){return compileStructuralScene(this.#snapshot.scene,this.#properties);}
 preview(request){
  try{
   const current=this.#snapshot.scene;
   if(typeof request?.requestId!=='string'||!request.requestId||request.requestId.length>200)throw Error('A request ID is required');
   if(request.sceneId!==current.id)throw Error('Wrong scene');
   if(request.baseRevision!==current.revision)throw Error('Scene changed; reload before editing');
   const action=request.action||'commit';let next=structuredClone(current);
   if(action==='undo'||action==='redo'){
    const stack=this.#snapshot[action];if(!stack.length)throw Error(`Nothing to ${action}`);next=structuredClone(stack.at(-1));
   }else if(action==='commit'){
    if(!Array.isArray(request.operations)||request.operations.length===0||request.operations.length>1000)throw Error('Use between 1 and 1000 operations');
    for(const operation of request.operations)next=applySceneOperation(next,operation,{catalog:this.#catalog,properties:this.#properties});
   }else throw Error('Unknown history action');
   next.revision=current.revision+1;
   const plan=compileStructuralScene(next,this.#properties);
   return {ok:true,scene:next,plan};
  }catch(error){return {ok:false,error:error.message};}
 }
 async execute(request){
  const fingerprint=JSON.stringify(request),previous=this.#snapshot.receipts.find(r=>r.requestId===request?.requestId);
  if(previous)return previous.fingerprint===fingerprint?structuredClone(previous.result):{ok:false,error:'Request ID already used with different contents'};
  const preview=this.preview(request);if(!preview.ok)return preview;
  const snapshot=structuredClone(this.#snapshot),before=snapshot.scene,action=request.action||'commit';
  if(action==='undo'){snapshot.undo.pop();snapshot.redo.push(before);}
  else if(action==='redo'){snapshot.redo.pop();snapshot.undo.push(before);}
  else{snapshot.undo.push(before);snapshot.redo=[];}
  if(snapshot.undo.length>60)snapshot.undo.shift();snapshot.scene=preview.scene;
  const result={ok:true,sceneId:preview.scene.id,revision:preview.scene.revision};
  snapshot.receipts.push({requestId:request.requestId,fingerprint,result});
  try{await this.#repository.save(snapshot,before.revision);this.#snapshot=snapshot;return structuredClone(result);}
  catch(error){return {ok:false,error:error.message};}
 }
}

export class IndexedSceneRepository {
 constructor(indexedDB=globalThis.indexedDB,name='tian-house-scenes-v2'){this.indexedDB=indexedDB;this.name=name;}
 async database(){
  if(!this.indexedDB)throw Error('Browser scene storage is unavailable');
  return new Promise((resolve,reject)=>{
   const request=this.indexedDB.open(this.name,1);
   request.onupgradeneeded=()=>request.result.createObjectStore('scenes',{keyPath:'scene.id'});
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
   request.onblocked=()=>reject(Error('Close another editor tab to finish updating scene storage'));
  });
 }
 async load(id){
  const db=await this.database();
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('scenes','readonly'),request=tx.objectStore('scenes').get(id);tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Could not read scene'));});}
  finally{db.close();}
 }
 async save(snapshot,expectedRevision){
  const db=await this.database();
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction('scenes','readwrite'),store=tx.objectStore('scenes'),read=store.get(snapshot.scene.id);let conflict=false;
   read.onsuccess=()=>{const current=read.result;if(expectedRevision===null?!!current:!current||current.scene.revision!==expectedRevision){conflict=true;tx.abort();return;}store.put(snapshot);};
   tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(conflict?Error('Scene changed in another editor; reload before editing'):tx.error||Error('Could not save scene'));
  });}finally{db.close();}
 }
}
