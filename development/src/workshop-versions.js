import {StructuredWorkshopModel} from './structured-workshop-model.js';
import {editorSnapshot,restoreEditorSnapshot} from './workshop-draft.js';
import {migrateHousePlan} from './scene-document.js';
import {compileStructuralScene} from './scene-structure.js';

const metadata=version=>{const {plan,requestFingerprint,...row}=version;return row;};
async function branchIdentity(requestId){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('tian-house-branch:'+requestId));return 'branch:'+Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');}

// Versions use the same request envelope and durable receipts as build batches.
// They are standalone transactions: never silently mix a restore with edits.
export class WorkshopVersions {
 constructor(model,library,persistence){Object.assign(this,{model,library,persistence});}
 check(baseRevision){if(this.model.writeLocked||this.model.pending)throw Error('Finish the current edit or save first');if(baseRevision!==this.model.revision)throw Error('Scene changed; read the latest revision');}
 request(request){
  if(typeof request?.requestId!=='string'||!request.requestId||request.requestId.length>200)throw Error('A request ID is required');
  const fingerprint=JSON.stringify(request),old=(this.model.commandReceipts||[]).find(r=>r.requestId===request.requestId);
  if(old){if(old.fingerprint!==fingerprint)throw Error('Request ID already used with different contents');return {fingerprint,replayed:structuredClone(old.result)};}
  this.check(request.baseRevision);
  if(!Array.isArray(request.operations)||request.operations.length!==1)throw Error('Use one version operation per request');
  const op=request.operations[0];if(!['versions.save','versions.restore','versions.branch'].includes(op?.type))throw Error('Unknown version command');
  if(op.type==='versions.save'){if(typeof op.label!=='string'||!op.label.trim()||op.label.trim().length>100)throw Error('Use a version name between 1 and 100 characters');}
  else if(typeof op.id!=='string'||!op.id||op.id.length>250)throw Error('Choose a saved version');
  if(op.type==='versions.branch'&&(typeof op.name!=='string'||!op.name.trim()||op.name.trim().length>60))throw Error('Use a branch name between 1 and 60 characters');
  return {fingerprint,op};
 }
 async stage(request,op){
  const staged=new StructuredWorkshopModel(this.model.export(),this.model.bounds,this.model.properties,this.model.catalog);restoreEditorSnapshot(staged,editorSnapshot(this.model));
  if(op.type==='versions.save')return {staged,changed:false};
  const version=await this.library.version(op.id),plan=structuredClone(version.plan),branching=op.type==='versions.branch';
  if(branching){const scene=plan.sceneDocument??migrateHousePlan(plan,this.model.bounds);scene.id=await branchIdentity(request.requestId);scene.revision=0;scene.legacy.metadata.name=op.name.trim();plan.sceneDocument=scene;Object.assign(plan,compileStructuralScene(scene,this.model.properties));}
  staged.begin(branching?'Branch from: '+version.label:'Restore version: '+version.label);staged.plan=plan;staged.index();const changed=staged.commit();if(staged.lastError)throw Error(staged.lastError);
  return {staged,changed,version};
 }
 async preview(request){try{const parsed=this.request(request);if(parsed.replayed)return {ok:true,revision:this.model.revision,replayed:true,originalRevision:parsed.replayed.revision,result:parsed.replayed,plan:this.model.export()};if(parsed.op.type==='versions.save')return {ok:true,revision:this.model.revision,operation:parsed.op.type,plan:this.model.export()};const revision=this.model.revision,{staged,version}=await this.stage(request,parsed.op);this.check(revision);return {ok:true,revision,operation:parsed.op.type,sourceVersion:version?metadata(version):undefined,plan:staged.export()};}catch(error){return {ok:false,revision:this.model.revision,error:error.message};}}
 async execute(request){
  let parsed;try{parsed=this.request(request);if(parsed.replayed)return parsed.replayed;}catch(error){return {ok:false,revision:this.model.revision,error:error.message};}
  this.model.writeLocked=true;
  try{
   const {op,fingerprint}=parsed;
   if(op.type==='versions.save'){
    // A named save changes only receipts, not geometry or history. Keep the
    // immutable history shared just as ordinary editor saves do; rebuilding it
    // here stalls large photo projects and multiplies their memory footprint.
    const saved=await this.library.saveVersion(this.model.export(),{id:'version:'+request.requestId,label:op.label,requestFingerprint:fingerprint});
    const result={ok:true,changed:false,revision:this.model.revision,version:metadata(saved),sceneId:this.model.scene?.id};
    const commandReceipts=[...(this.model.commandReceipts??[]),{requestId:request.requestId,fingerprint,result:structuredClone(result)}];
    const captured={...this.model,commandReceipts};
    if(this.persistence.saveEditor)await this.persistence.saveEditor(captured);
    else await this.persistence.save(editorSnapshot(captured));
    this.model.commandReceipts=commandReceipts;
    return result;
   }
   const {staged,changed,version}=await this.stage(request,op);let saved=version,checkpoint;
   checkpoint=await this.library.saveVersion(this.model.export(),{id:'checkpoint:'+request.requestId,label:'Before '+(op.type==='versions.branch'?'branch: ':'restore: ')+version.label.slice(0,75),kind:'checkpoint',sourceVersionId:op.id,requestFingerprint:fingerprint});
   const result={ok:true,changed,revision:staged.revision,version:metadata(saved),...(checkpoint?{checkpoint:metadata(checkpoint)}:{}),sceneId:staged.scene?.id};
   staged.commandReceipts??=[];staged.commandReceipts.push({requestId:request.requestId,fingerprint,result:structuredClone(result)});
   // Library content is immutable. If draft persistence fails, it may retain a
   // safe version/checkpoint. Retrying the identical request reuses that record.
   await this.persistence.save(editorSnapshot(staged));restoreEditorSnapshot(this.model,editorSnapshot(staged));return result;
  }catch(error){return {ok:false,revision:this.model.revision,error:error.message};}
  finally{this.model.writeLocked=false;}
 }
 async save({label,baseRevision,requestId=crypto.randomUUID()}){const result=await this.execute({requestId,baseRevision,operations:[{type:'versions.save',label}]});if(!result.ok)throw Error(result.error);return result.version;}
 async restore({id,baseRevision,branchName,requestId=crypto.randomUUID()}){const result=await this.execute({requestId,baseRevision,operations:[branchName===undefined?{type:'versions.restore',id}:{type:'versions.branch',id,name:branchName}]});if(!result.ok)throw Error(result.error);return result;}
}
