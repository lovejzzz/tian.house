import {validateHousePlan} from './workshop-model.js';
export const HOUSE_LIBRARY_KEY='tian-house-library-v1';
export function readHouseLibrary(storage,bounds){
 const raw=storage.getItem(HOUSE_LIBRARY_KEY);if(!raw)return [];
 const rows=JSON.parse(raw);if(!Array.isArray(rows))throw Error('House library could not be read');
 for(const row of rows){if(typeof row.id!=='string'||typeof row.savedAt!=='string')throw Error('Invalid saved house');validateHousePlan(row.plan,bounds);}
 return rows;
}
export function saveHouseCopy(storage,plan,bounds,{now=new Date().toISOString(),id=crypto.randomUUID()}={}){
 validateHousePlan(plan,bounds);const rows=readHouseLibrary(storage,bounds),copy=structuredClone(plan);copy.name=copy.name?.trim()||'Untitled house';
 const signature=JSON.stringify(copy),existing=rows.find(r=>JSON.stringify(r.plan)===signature);if(existing)return existing;
 const row={id,savedAt:now,plan:copy};rows.unshift(row);
 // A failed write never replaces the previous library or the working draft.
 storage.setItem(HOUSE_LIBRARY_KEY,JSON.stringify(rows));return row;
}

// Preserve before switching; storage failure must leave the working house intact.
export function createHouseDraft(storage,model,bounds,name='Untitled house'){
 if(model.pending)model.cancel();
 saveHouseCopy(storage,model.export(),bounds);
 model.blank(name.trim()||'Untitled house');
 return model.export();
}
