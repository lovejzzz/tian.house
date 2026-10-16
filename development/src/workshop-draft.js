import {encodeDraftSnapshot,decodeDraftSnapshot} from './workshop-snapshot-codec.js';
import {validateHousePlan} from './workshop-model.js';
import {compileStructuralScene} from './scene-structure.js';

function checkEditorSnapshot(snapshot,bounds,visit){
 if(!snapshot||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0||!Array.isArray(snapshot.undoStack)||!Array.isArray(snapshot.redoStack)||snapshot.undoStack.length>60||snapshot.redoStack.length>60)throw Error('Invalid workshop history');
 validateCommandReceipts(snapshot.commandReceipts??[],snapshot.revision);
 const validate=plan=>{validateHousePlan(plan,bounds);visit(plan);};
 validate(snapshot.plan);for(const entry of [...snapshot.undoStack,...snapshot.redoStack]){if(typeof entry.label!=='string')throw Error('Invalid history label');validate(entry.before);validate(entry.after);}return snapshot;
}
export function validateEditorSnapshot(snapshot,bounds,properties){
 return checkEditorSnapshot(snapshot,bounds,plan=>{if(plan.sceneDocument)compileStructuralScene(plan.sceneDocument,properties);});
}
// Own canonical copies produced during validation. No cross-call cache can hide
// subsequent mutations; a failing historical plan never installs a partial draft.
export function prepareEditorSnapshot(snapshot,bounds,properties){
 const plans=new Map();
 checkEditorSnapshot(snapshot,bounds,plan=>{
  if(!plans.has(plan))plans.set(plan,plan.sceneDocument?
   {...compileStructuralScene(plan.sceneDocument,properties),sceneDocument:structuredClone(plan.sceneDocument)}:structuredClone(plan));
 });
 const history=entries=>entries.map(entry=>({...entry,before:plans.get(entry.before),after:plans.get(entry.after)}));
 return {plan:structuredClone(plans.get(snapshot.plan)),revision:snapshot.revision,undoStack:history(snapshot.undoStack),redoStack:history(snapshot.redoStack),commandReceipts:structuredClone(snapshot.commandReceipts??[])};
}
export function editorSnapshot(model){return structuredClone({plan:model.plan,revision:model.revision,undoStack:model.undoStack,redoStack:model.redoStack,commandReceipts:model.commandReceipts??[]});}
export function restoreEditorSnapshot(model,snapshot){
 const compile=plan=>plan.sceneDocument?{...compileStructuralScene(plan.sceneDocument,model.properties),sceneDocument:structuredClone(plan.sceneDocument)}:structuredClone(plan);
 const history=entries=>entries.map(entry=>({...entry,before:compile(entry.before),after:compile(entry.after)}));
 // Materialized tile arrays are caches; compiler corrections must also reach
 // saved drafts and history, rather than being overwritten after construction.
 const plan=compile(snapshot.plan),undo=history(snapshot.undoStack),redo=history(snapshot.redoStack);model.plan=plan;model.revision=snapshot.revision;model.undoStack=undo;model.redoStack=redo;model.commandReceipts=structuredClone(snapshot.commandReceipts??[]);model.index();
}

export class IndexedDraftRepository{
 constructor(indexedDB=globalThis.indexedDB,name='tian-house-workshop-history'){this.indexedDB=indexedDB;this.name=name;}
 async database(){return new Promise((resolve,reject)=>{
  if(!this.indexedDB){reject(Error('Browser draft storage is unavailable'));return;}
  const r=this.indexedDB.open(this.name,1);let blocked=false;
  r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'id'});
  r.onsuccess=()=>{if(blocked)r.result.close();else resolve(r.result);};r.onerror=()=>reject(r.error);r.onblocked=()=>{blocked=true;reject(Error('Close another editor to update draft storage'));};
 });}
 async load(){const db=await this.database();try{const record=await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readonly'),r=tx.objectStore('drafts').get('active');tx.oncomplete=()=>resolve(r.result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Could not read draft'));});return record?{id:record.id,revision:record.revision,snapshot:await decodeDraftSnapshot(record)}:record;}finally{db.close();}}
 async save(snapshot,expectedRevision){const encoded=await encodeDraftSnapshot(snapshot);const db=await this.database();try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),r=store.get('active');let conflict=false;
  r.onsuccess=()=>{const current=r.result;if(expectedRevision===null?!!current:current?.revision!==expectedRevision){conflict=true;tx.abort();return;}store.put({id:'active',revision:(expectedRevision??-1)+1,...encoded});};
  tx.oncomplete=()=>{this.lastWrite=encoded.encoding?{encoding:encoded.encoding,storedBytes:encoded.data.byteLength,uncompressedBytes:encoded.uncompressedBytes}:null;resolve((expectedRevision??-1)+1);};tx.onabort=tx.onerror=()=>reject(conflict?Error('Another editor saved changes. Export your draft, then reload.'):tx.error||Error('Could not save draft'));
 });}finally{db.close();}}
}

// Serialize writes from rapid gestures. Stop after failure so a stale editor
// cannot silently resume overwriting the newer saved draft.
export class DraftPersistence{
 constructor(repository,revision=null){this.repository=repository;this.revision=revision;this.tail=Promise.resolve();this.error=null;this.pending=0;}
 get unsettled(){return this.pending>0||!!this.error;}
 // Model history entries are immutable: undo/redo clone before editing. Share
 // their plans across queued saves, but capture mutable current state and arrays.
 saveEditor(model){
  const captured={plan:structuredClone(model.plan),revision:model.revision,
   undoStack:model.undoStack.slice(),redoStack:model.redoStack.slice(),
   commandReceipts:structuredClone(model.commandReceipts??[])};
  return this.enqueue(captured);
 }
 save(snapshot){return this.enqueue(structuredClone(snapshot));}
 enqueue(captured){this.pending++;const job=this.tail.then(async()=>{if(this.error)throw this.error;try{this.revision=await this.repository.save(captured,this.revision);}catch(error){this.error=error;throw error;}});const tracked=job.finally(()=>{this.pending--;});this.tail=tracked.catch(()=>{});return tracked;}
}

// Navigation cannot await IndexedDB. Only interrupt leaving while committed
// edits are still being written or a write has failed.
export function guardDraftNavigation(event,persistence,editing=false){
 if(!editing&&!persistence?.unsettled)return false;
 event.preventDefault();event.returnValue='';return true;
}

export function validateCommandReceipts(receipts,revision){
 if(!Array.isArray(receipts))throw Error('Invalid command receipts');const ids=new Set();
 for(const receipt of receipts){
  if(typeof receipt?.requestId!=='string'||!receipt.requestId||receipt.requestId.length>200||ids.has(receipt.requestId)||typeof receipt.fingerprint!=='string')throw Error('Invalid command receipt identity');
  let request;try{request=JSON.parse(receipt.fingerprint);}catch{throw Error('Invalid command receipt request');}
  const result=receipt.result;
  if(request?.requestId!==receipt.requestId||!Number.isSafeInteger(request.baseRevision)||request.baseRevision<0||!Array.isArray(request.operations)||!request.operations.length||request.operations.length>1000||result?.ok!==true||typeof result.changed!=='boolean'||!Number.isSafeInteger(result.revision)||result.revision>revision||result.revision!==request.baseRevision+(result.changed?1:0))throw Error('Invalid command receipt result');
  ids.add(receipt.requestId);
 }
 return receipts;
}
