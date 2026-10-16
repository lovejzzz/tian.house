import {editorSnapshot} from './workshop-draft.js';
import {StructuredWorkshopModel} from './structured-workshop-model.js';
import {validateHousePlan} from './workshop-model.js';

// Versioned batches use the same structural model as editor gestures.
// Catalog definitions, never
// caller-supplied sprite arrays, determine what a placement can create.
export class WorkshopCommands {
 constructor(model,catalog){this.model=model;this.catalog=catalog;this.model.commandReceipts??=[];}
 read(){return {revision:this.model.revision,plan:this.model.export()};}
 preview(request){
  try {
   if(!request||typeof request.requestId!=='string'||!request.requestId.length||request.requestId.length>200)throw Error('A request ID is required');
   const previous=this.model.commandReceipts.find(r=>r.requestId===request.requestId);if(previous){if(previous.fingerprint!==JSON.stringify(request))throw Error('Request ID already used with different contents');return {ok:true,revision:this.model.revision,plan:this.model.export(),replayed:true,originalRevision:previous.result.revision};}
   if(this.model.writeLocked)throw Error('A build command is being saved');
   if(this.model.pending)throw Error('Finish or cancel the current edit first');
   if(request.baseRevision!==this.model.revision)throw Error('Scene changed; read the latest revision');
   if(!Array.isArray(request.operations)||!request.operations.length||request.operations.length>1000)throw Error('Use between 1 and 1000 operations');
   const draft=new StructuredWorkshopModel(this.model.export(),this.model.bounds,this.model.properties,[...this.catalog.values()],{validatePlacement:this.model.validatePlacement});draft.begin('Build commands');
   for(let operationIndex=0;operationIndex<request.operations.length;operationIndex++){
    const op=request.operations[operationIndex];
    if(typeof op?.type!=='string')throw Error('A command type is required');
    const floor=this.catalog.get(op.assetId),plainFloor=v=>v?.type==='place'&&v.assetId===op.assetId&&Object.keys(v).every(k=>['type','assetId','x','y','z'].includes(k));
    if(plainFloor(op)&&!floor?.stairs&&!floor?.vehicle&&floor?.parts?.length&&floor.parts.every(p=>draft.isFloor(p.tile))){
     const points=[];let end=operationIndex;while(end<request.operations.length&&plainFloor(request.operations[end])){const {x,y,z}=request.operations[end++];points.push({x,y,z});}
     const result=draft.placeFloorBatch(floor,points);if(!result.ok)throw Error(result.reason);operationIndex=end-1;continue;
    }
    if(op.type==='entry.set'){const result=draft.setEntry(op.x,op.y,op.z);if(!result.ok)throw Error(result.reason);continue;}
    if(op.type.includes('.')){const result=draft.structure(op);if(!result.ok)throw Error(result.reason);continue;}
    if(op.type==='rename'){
     if(typeof op.name!=='string'||!op.name.trim()||op.name.length>60)throw Error('Use a house name between 1 and 60 characters');
     if(draft.scene){const result=draft.structure({type:'scene.rename',name:op.name});if(!result.ok)throw Error(result.reason);}else draft.plan.name=op.name.trim();continue;
    }
    if(![op.x,op.y,op.z].every(Number.isInteger)||!draft.inside(op.x,op.y,op.z))throw Error('Choose a grid position inside the lot');
    if(op.type==='place'){
     const source=this.catalog.get(op.assetId);
     if(!source)throw Error('Unknown asset');
     const entry=structuredClone(source);
     if(op.rotation!==undefined){if(!entry.vehicle||!Number.isInteger(op.rotation)||op.rotation<0||op.rotation>3)throw Error('Unsupported rotation');entry.rotation=op.rotation;}
     if(op.hostWallId!==undefined){if(typeof op.hostWallId!=='string')throw Error('Choose a wall host');entry.hostWallId=op.hostWallId;}
     entry.storeInContainer=op.storeInContainer===true;
     const result=draft.place(entry,op.x,op.y,op.z);if(!result.ok)throw Error(result.reason);
    }else if(op.type==='erase'){const result=draft.erase(op.x,op.y,op.z,{all:op.all===true});if(result?.ok===false)throw Error(result.reason);}
    else throw Error('Unknown command');
   }
   draft.commit();if(draft.lastError)throw Error(draft.lastError);
   validateHousePlan(draft.plan,this.model.bounds);
   return {ok:true,revision:this.model.revision,plan:draft.export(),physicalValidation:draft.physicalValidation};
  }catch(error){return {ok:false,revision:this.model.revision,error:error.message};}
 }
 async commitAndSave(request,persistence){
  if(this.model.writeLocked||this.model.pending)return {ok:false,revision:this.model.revision,error:'Finish the current edit or save first'};
  this.model.writeLocked=true;
  try{
   const staged=new StructuredWorkshopModel(this.model.export(),this.model.bounds,this.model.properties,[...this.catalog.values()],{validatePlacement:this.model.validatePlacement});
   // Live history is already compiled and immutable: edits push/pop entries,
   // while undo/redo clone their plans before use. Fork the arrays, not every
   // historical scene. Disk restoration still recompiles untrusted old caches.
   staged.revision=this.model.revision;
   staged.undoStack=this.model.undoStack.slice();staged.redoStack=this.model.redoStack.slice();
   staged.commandReceipts=this.model.commandReceipts.slice();
   const result=new WorkshopCommands(staged,this.catalog).commit(request);if(!result.ok)return result;
   const snapshot=editorSnapshot(staged);
   // Save scene, history and idempotency receipt in the same repository write.
   // Until it succeeds, live reads and rendering continue to see the old scene.
   await persistence.save(snapshot);
   this.model.plan=staged.plan;this.model.physicalValidation=staged.physicalValidation;this.model.revision=staged.revision;this.model.undoStack=staged.undoStack;this.model.redoStack=staged.redoStack;this.model.commandReceipts=staged.commandReceipts;this.model.index();
   return result;
  }catch(error){return {ok:false,revision:this.model.revision,error:error.message};}
  finally{this.model.writeLocked=false;}
 }
 commit(request){
  const fingerprint=JSON.stringify(request),previous=this.model.commandReceipts.find(r=>r.requestId===request?.requestId);
  if(previous)return previous.fingerprint===fingerprint?structuredClone(previous.result):{ok:false,revision:this.model.revision,error:'Request ID already used with different contents'};
  const preview=this.preview(request);if(!preview.ok)return preview;
  this.model.lastError=null;this.model.begin('Build commands');this.model.plan=preview.plan;this.model.index();
  const changed=this.model.commit();if(this.model.lastError&&!changed)return {ok:false,revision:this.model.revision,error:this.model.lastError};const result={ok:true,changed,revision:this.model.revision,...(this.model.physicalValidation?{physicalValidation:this.model.physicalValidation}:{})};
  this.model.commandReceipts.push({requestId:request.requestId,fingerprint,result:structuredClone(result)});
  return structuredClone(result);
 }
}
