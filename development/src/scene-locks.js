import {roomContains} from './room-footprint.js';
const entities=scene=>[...scene.rooms,...scene.objects,...(scene.roofVolumes||[])];
const sorted=rows=>rows.slice().sort((a,b)=>a.id.localeCompare(b.id));
function protectedState(scene,id,kind){
 const entity=(scene[kind]||[]).find(e=>e.id===id);if(!entity)return null;
 if(kind==='roofVolumes')return entity;
 if(kind==='rooms'){
  const walls=scene.walls.filter(w=>entity.wallIds.includes(w.id)||w.levelId===entity.levelId&&roomContains(entity,w.x,w.y)),wallIds=new Set(walls.map(w=>w.id));
  return {entity,walls:sorted(walls),openings:sorted(scene.openings.filter(o=>wallIds.has(o.hostWallId)))};
 }
 const ids=new Set([id]);let changed=true;while(changed){changed=false;for(const o of scene.objects)if(o.hostId&&ids.has(o.hostId)&&!ids.has(o.id)){ids.add(o.id);changed=true;}}
 return sorted(scene.objects.filter(o=>ids.has(o.id)));
}
export function captureSceneLocks(scene){
 return scene?['rooms','objects','roofVolumes'].flatMap(kind=>(scene[kind]||[]).filter(e=>e.locked).map(e=>({id:e.id,kind,label:e.name||e.assetId||e.id,state:JSON.stringify(protectedState(scene,e.id,kind))}))):[];
}
export function assertCapturedLocks(locks,after){
 for(const lock of locks)if(lock.state!==JSON.stringify(protectedState(after,lock.id,lock.kind)))throw Error(`Locked ${lock.kind==='rooms'?'room structure':lock.kind==='roofVolumes'?'roof volume':'object'}: ${lock.label} · Unlock it before editing`);
}
export function assertSceneLocks(before,after){if(before&&after)assertCapturedLocks(captureSceneLocks(before),after);}
export function setEntityLocks(scene,{ids,locked}){
 if(!Array.isArray(ids)||!ids.length||typeof locked!=='boolean'||new Set(ids).size!==ids.length||ids.some(id=>!entities(scene).some(e=>e.id===id)))throw Error('Choose existing rooms, objects or roof volumes to lock');
 const next=structuredClone(scene);for(const e of entities(next))if(ids.includes(e.id)){if(locked)e.locked=true;else delete e.locked;}return next;
}
