import {readHouseLibrary} from './house-library.js';
import {validateHousePlan} from './workshop-model.js';
import {compileStructuralScene} from './scene-structure.js';
import {encodeDraftSnapshot,decodeDraftSnapshot} from './workshop-snapshot-codec.js';
export class IndexedHouseLibrary{
 constructor(bounds,properties,{indexedDB=globalThis.indexedDB,legacyStorage=globalThis.localStorage,name='tian-house-library-v2'}={}){Object.assign(this,{bounds,properties,indexedDB,legacyStorage,name});}
 validate(plan){validateHousePlan(plan,this.bounds);if(plan.sceneDocument)compileStructuralScene(plan.sceneDocument,this.properties);return plan;}
 async database(){return new Promise((resolve,reject)=>{if(!this.indexedDB){reject(Error('Browser house storage is unavailable'));return;}const request=this.indexedDB.open(this.name,2);let blocked=false;request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('houses'))db.createObjectStore('houses',{keyPath:'digest'});if(!db.objectStoreNames.contains('versions'))db.createObjectStore('versions',{keyPath:'id'});};request.onsuccess=()=>{if(blocked)request.result.close();else resolve(request.result);};request.onerror=()=>reject(request.error);request.onblocked=()=>{blocked=true;reject(Error('Close another house library to update storage'));};});}
 async record(row){this.validate(row.plan);const bytes=new TextEncoder().encode(JSON.stringify(row.plan)),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');return {digest,id:row.id,savedAt:row.savedAt,...await encodeDraftSnapshot(row.plan)};}
 async insert(records){const db=await this.database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('houses','readwrite'),store=tx.objectStore('houses'),result=[];for(const record of new Map(records.map(r=>[r.digest,r])).values()){const read=store.get(record.digest);read.onsuccess=()=>{if(read.result){const saved={...read.result};if(saved.versionOnly){delete saved.versionOnly;store.put(saved);}result.push(saved);}else{store.add(record);result.push(record);}};}tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Could not save house library'));});}finally{db.close();}}
 ready(){return this.initializing??=(async()=>{const legacy=readHouseLibrary(this.legacyStorage,this.bounds);const records=await Promise.all(legacy.map(row=>this.record(row)));if(records.length)await this.insert(records);})();}
 async list(){await this.ready();const db=await this.database();let records;try{records=await new Promise((resolve,reject)=>{const tx=db.transaction('houses','readonly'),request=tx.objectStore('houses').getAll();tx.oncomplete=()=>resolve(request.result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Could not read house library'));});}finally{db.close();}
  const rows=await Promise.all(records.filter(r=>!r.versionOnly).map(async r=>({id:r.id,savedAt:r.savedAt,plan:this.validate(await decodeDraftSnapshot(r))})));return rows.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)||a.id.localeCompare(b.id));
 }
 async save(plan,{id=crypto.randomUUID(),now=new Date().toISOString()}={}){const copy=structuredClone(plan);copy.name=copy.name?.trim()||'Untitled house';this.validate(copy);await this.ready();const record=await this.record({id,savedAt:now,plan:copy}),[saved]=await this.insert([record]);return {id:saved.id,savedAt:saved.savedAt,plan:await decodeDraftSnapshot(saved)};}
 // Named versions point to immutable, content-addressed house records. Saving
 // another name never overwrites an earlier version, even for identical content.
 async saveVersion(plan,{label,id=crypto.randomUUID(),now=new Date().toISOString(),kind='named',sourceVersionId=null,requestFingerprint}={}){
  if(typeof label!=='string'||!label.trim()||label.trim().length>100)throw Error('Use a version name between 1 and 100 characters');
  if(typeof id!=='string'||!id||!['named','checkpoint'].includes(kind))throw Error('Invalid version identity');
  await this.ready();const record=await this.record({id:crypto.randomUUID(),savedAt:now,plan:structuredClone(plan)});
  record.versionOnly=true;
  const version={id,label:label.trim(),savedAt:now,digest:record.digest,sceneId:plan.sceneDocument?.id??null,houseName:plan.name||'Untitled house',kind,sourceVersionId,...(requestFingerprint?{requestFingerprint}:{})};let result=version;
  const db=await this.database();try{await new Promise((resolve,reject)=>{
   const tx=db.transaction(['houses','versions'],'readwrite'),houses=tx.objectStore('houses'),versions=tx.objectStore('versions');let conflict=false;
   const old=versions.get(id);old.onsuccess=()=>{if(old.result){const identical=JSON.stringify(old.result)===JSON.stringify(version),retry=requestFingerprint&&old.result.requestFingerprint===requestFingerprint&&old.result.digest===record.digest&&old.result.label===version.label&&old.result.kind===kind&&old.result.sourceVersionId===sourceVersionId;if(!identical&&!retry){conflict=true;tx.abort();}else result=old.result;return;}versions.add(version);const read=houses.get(record.digest);read.onsuccess=()=>{if(!read.result)houses.add(record);};};
   tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(conflict?Error('A saved version cannot be overwritten'):tx.error||Error('Could not save version'));
  });}finally{db.close();}return result;
 }
 async versions(){await this.ready();const db=await this.database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('versions'),r=tx.objectStore('versions').getAll();tx.oncomplete=()=>resolve(r.result.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)||a.id.localeCompare(b.id)));tx.onabort=tx.onerror=()=>reject(tx.error||Error('Could not read versions'));});}finally{db.close();}}
 async version(id){await this.ready();const db=await this.database();let version,record;try{await new Promise((resolve,reject)=>{const tx=db.transaction(['versions','houses']),r=tx.objectStore('versions').get(id);r.onsuccess=()=>{version=r.result;if(version){const data=tx.objectStore('houses').get(version.digest);data.onsuccess=()=>record=data.result;}};tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Could not read version'));});}finally{db.close();}if(!version||!record)throw Error('Saved version is unavailable');return {...version,plan:this.validate(await decodeDraftSnapshot(record))};}

}
