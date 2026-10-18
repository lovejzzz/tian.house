// Large photo-backed houses do not fit two synchronous localStorage copies.
// Archive + replacement are one IndexedDB transaction; the live simulation is
// changed by the caller only after this transaction succeeds.
export class GameSaveStore {
 constructor(indexedDB=globalThis.indexedDB,legacy=globalThis.localStorage,name='tian-house-game-saves-v1'){this.indexedDB=indexedDB;this.legacy=legacy;this.name=name;this.tail=Promise.resolve();}
 run(action){const result=this.tail.then(action);this.tail=result.catch(()=>{});return result;}
 async database(){if(!this.indexedDB)throw Error('Game save storage is unavailable');return new Promise((resolve,reject)=>{const r=this.indexedDB.open(this.name,1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close another game tab to update save storage'));});}
 async read(key){const db=await this.database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readonly'),r=tx.objectStore('saves').get(key);tx.oncomplete=()=>{try{resolve(r.result??this.legacy?.getItem(key)??null);}catch(e){reject(e);}};tx.onabort=tx.onerror=()=>reject(tx.error||Error('Could not read game save'));});}finally{db.close();}}
 load(key){return this.run(()=>this.read(key));}
 async writeRows(rows){const db=await this.database();try{await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||Error('Could not save game'));try{const store=tx.objectStore('saves');for(const [key,value]of rows)store.put(value,key);}catch(e){tx.abort();reject(e);}});}finally{db.close();}}
 save(key,serialized){return this.run(()=>this.writeRows([[key,serialized]]));}
 replace(key,serialized,previous){return this.run(()=>this.writeRows([[key+'-before-workshop',previous],[key,serialized]]));}
}
