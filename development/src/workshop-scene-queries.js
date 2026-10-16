import {referenceSceneEntities} from './reference-scene-entities.js';
// Read projections are deliberately not importable scene documents. Dependencies
// can extend outside the requested area and are labelled separately from hits.
export function readWorkshopScene(model,query={}){
 if(!query||typeof query!=='object'||Array.isArray(query)||Object.keys(query).some(k=>!['level','bounds'].includes(k)))throw Error('Use only level and bounds in a scene query');
 const {level,bounds}=query;
 if(level!==undefined&&!Number.isInteger(level))throw Error('Level must be an integer');
 if(bounds!==undefined&&(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite)||bounds[0]>=bounds[2]||bounds[1]>=bounds[3]))throw Error('Bounds must be [minX, minY, maxX, maxY]');
 const scene=model.scene,levels=scene?.levels||[...new Set([...(model.plan.squares||[]),...(model.plan.items||[]),...(model.plan.vehicles||[])].map(v=>v.z))].map(index=>({id:`level:${index}`,index}));
 if(level!==undefined&&!levels.some(l=>l.index===level))throw Error('Requested level does not exist');
 const levelMap=new Map(levels.map(l=>[l.id,l.index])),onLevel=id=>level===undefined||levelMap.get(id)===level;
 const hit=(x,y,w=1,h=1)=>!bounds||x+w>bounds[0]&&x<bounds[2]&&y+h>bounds[1]&&y<bounds[3];
 const rooms=(scene?.rooms||[]).filter(r=>onLevel(r.levelId)&&hit(r.rect[0],r.rect[1],r.rect[2]-r.rect[0],r.rect[3]-r.rect[1]));
 const directWalls=(scene?.walls||[]).filter(w=>onLevel(w.levelId)&&hit(w.x,w.y,w.axis==='N'?1:1e-9,w.axis==='W'?1:1e-9));
 const wallIds=new Set([...directWalls.map(w=>w.id),...rooms.flatMap(r=>r.wallIds)]);
 const directObjects=(scene?.objects||[]).filter(o=>onLevel(o.levelId)&&(o.parts?.length?o.parts:[{dx:0,dy:0}]).some(p=>hit(o.x+p.dx,o.y+p.dy)));
 const objectIds=new Set(directObjects.map(o=>o.id));let changed=true;
 while(changed){changed=false;for(const o of scene?.objects||[]){if(o.wallMounts?.some(m=>wallIds.has(m.wallId))&&!objectIds.has(o.id)){objectIds.add(o.id);changed=true;}if(objectIds.has(o.id))for(const mount of o.wallMounts||[])if(!wallIds.has(mount.wallId)){wallIds.add(mount.wallId);changed=true;}}for(const o of scene?.objects||[])if(o.hostId&&(objectIds.has(o.id)||objectIds.has(o.hostId))){for(const id of [o.id,o.hostId])if(!objectIds.has(id)){objectIds.add(id);changed=true;}}}
 const objects=(scene?.objects||[]).filter(o=>objectIds.has(o.id)),walls=(scene?.walls||[]).filter(w=>wallIds.has(w.id)),openings=(scene?.openings||[]).filter(o=>wallIds.has(o.hostWallId));
 const verticalLinks=(scene?.verticalLinks||[]).filter(l=>(onLevel(l.fromLevelId)||onLevel(l.toLevelId))&&[-1,0,1,2].some(i=>hit(l.x+(l.axis==='W'?i:0),l.y+(l.axis==='N'?i:0))));
 const legacy={};for(const key of ['squares','items','vehicles'])legacy[key]=(scene?.legacy?.[key]||(model.plan[key]||[]).map((value,i)=>({id:`${key}:${i}`,value}))).filter(e=>(level===undefined||e.value.z===level)&&hit(e.value.x,e.value.y));
 // Roofs are independent editable entities, not necessarily attached to rooms.
 const roofVolumes=(scene?.roofVolumes||[]).filter(r=>{
  if(!onLevel(r.levelId))return false;
  const xs=r.vertices.map(p=>p[0]),ys=r.vertices.map(p=>p[1]);
  return hit(Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 });
 const used=new Set([...rooms,...walls,...objects,...roofVolumes].map(e=>e.levelId));for(const l of verticalLinks){used.add(l.fromLevelId);used.add(l.toLevelId);}
 for(const l of levels)if(level===undefined||l.index===level||Object.values(legacy).some(list=>list.some(e=>e.value.z===l.index)))used.add(l.id);
 const included=new Set([...rooms,...walls,...openings,...objects,...verticalLinks,...roofVolumes,...rooms.flatMap(r=>[r.roof,...(r.floorOpenings||[])].filter(Boolean))].map(e=>e.id)),existing=new Set(referenceSceneEntities(scene).map(e=>e.id)),partial=level!==undefined||bounds!==undefined;
 const references=(scene?.references||[]).map(({image,...reference})=>({...reference,annotations:(reference.annotations||[]).filter(a=>!partial||included.has(a.entityId)).map(a=>({...a,bindingStatus:!a.entityId?'unbound':existing.has(a.entityId)?'linked':'missing'}))})).filter(r=>!partial||r.annotations.length);
 const direct=new Set([...rooms,...directWalls,...directObjects,...verticalLinks,...roofVolumes].map(e=>e.id));
 return structuredClone({revision:model.revision,bounds:model.bounds,query,partial:level!==undefined||bounds!==undefined,format:'scene-query',dependencyIds:[...walls,...openings,...objects].filter(e=>!direct.has(e.id)).map(e=>e.id),scene:{id:scene?.id??null,units:scene?.units??{kind:'source-grid',metresPerCell:null},levels:levels.filter(l=>used.has(l.id)),rooms,walls,openings,objects,verticalLinks,roofVolumes,physicalDimensions:scene?.physicalDimensions??null,references,legacy}});
}
