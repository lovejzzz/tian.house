// Shared binding vocabulary for reference evidence, queries and scene navigation.
// Descriptors derive positions from hosts instead of copying coordinates into photos.
export function referenceSceneEntities(scene){
 if(!scene)return [];
 const result=[],levels=new Map(scene.levels.map(l=>[l.id,l.index]));
 const add=(entity,kind,levelId,rect,extra={})=>result.push({id:entity.id,entity,kind,levelId,z:levels.get(levelId),rect,...extra});
 for(const r of scene.rooms){add(r,'Room',r.levelId,r.rect);if(r.roof)add(r.roof,'Roof',r.levelId,r.rect,{room:r,z:levels.get(r.levelId)+1});for(const h of r.floorOpenings||[])add(h,'Floor opening',r.levelId,h.rect,{room:r});}
 for(const roof of scene.roofVolumes||[]){const xs=roof.vertices.map(p=>p[0]),ys=roof.vertices.map(p=>p[1]);add(roof,'Roof',roof.levelId,[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]);}
 for(const o of scene.objects){const parts=o.parts?.length?o.parts:[{dx:0,dy:0}],xs=parts.map(p=>o.x+p.dx),ys=parts.map(p=>o.y+p.dy);add(o,'Object',o.levelId,[Math.min(...xs),Math.min(...ys),Math.max(...xs)+1,Math.max(...ys)+1]);}
 for(const w of scene.walls)add(w,'Wall',w.levelId,[w.x,w.y,w.x+(w.axis!=='W'?1:0),w.y+(w.axis!=='N'?1:0)],{wall:w});
 const walls=new Map(scene.walls.map(w=>[w.id,w]));for(const o of scene.openings){const w=walls.get(o.hostWallId);if(w)add(o,o.kind==='door'?'Door':'Window',w.levelId,[w.x,w.y,w.x+(w.axis!=='W'?1:0),w.y+(w.axis!=='N'?1:0)],{wall:w});}
 for(const l of scene.verticalLinks)add(l,'Staircase',l.fromLevelId,[l.x,l.y,l.x+(l.axis==='W'?3:1),l.y+(l.axis==='N'?3:1)]);
 return result;
}
export function referenceSceneEntity(scene,id){return referenceSceneEntities(scene).find(e=>e.id===id);}
