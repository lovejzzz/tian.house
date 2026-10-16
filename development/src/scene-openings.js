// Composite glazing is replaced or removed atomically so half a borderless
// picture pane cannot remain behind. Individual opening IDs remain bindable.
export function replaceSceneOpenings(scene,openings){
 if(!Array.isArray(openings)||!openings.length||openings.length>1000||openings.some(o=>!o||typeof o.hostWallId!=='string')||new Set(openings.map(o=>o.hostWallId)).size!==openings.length)throw Error('Choose distinct opening hosts');
 openings=structuredClone(openings);
 const hosts=new Set(openings.map(o=>o.hostWallId)),assemblies=new Set();
 for(const opening of openings){const previous=scene.openings.find(o=>o.hostWallId===opening.hostWallId);if(previous&&previous.id!==opening.id)throw Error('Keep the existing opening identity when replacing its asset');if(previous?.assemblyId)assemblies.add(previous.assemblyId);if(previous?.threshold&&opening.kind==='door'&&opening.threshold===undefined)opening.threshold=structuredClone(previous.threshold);}
 scene.openings=scene.openings.filter(o=>!hosts.has(o.hostWallId)&&!assemblies.has(o.assemblyId));scene.openings.push(...structuredClone(openings));return scene;
}
export function removeSceneOpening(scene,id){
 const opening=scene.openings.find(o=>o.id===id);if(!opening)throw Error('Opening not found');
 scene.openings=scene.openings.filter(o=>o.id!==id&&(!opening.assemblyId||o.assemblyId!==opening.assemblyId));return scene;
}
