// Exterior design of a house, saved in the scene document so anyone who imports or
// replicates the house gets the same garden, planting and envelope details, and can
// edit them in the Workshop (Exterior panel) or with build commands.
//
// scene.exterior is optional: absent means "automatic" (the defaults below), which
// is exactly how every house rendered before this section existed, so old saves are
// unchanged. Stored values are a sparse override of the defaults.
//
// Commands:
//   {type:'exterior.set', exterior:{...partial settings}}   merge + validate
//   {type:'exterior.reset'}                                  back to automatic
//   {type:'exterior.tree.add', tree:{id,x,y,height?,seed?}}  switches trees to "listed"
//   {type:'exterior.tree.remove', id}
//   {type:'exterior.climber.set', wallId, on:boolean}       switches climbers to "listed"
export const EXTERIOR_VERSION=1;
export const BORDER_PLANTINGS=['mixed','lavender','box','meadow'];
export const PLACEMENT_MODES=['auto','listed','none'];
export const EXTERIOR_DEFAULTS=Object.freeze({
 version:EXTERIOR_VERSION,
 surroundings:{enabled:true},              // lane, drive, gate, neighbours' cottages
 meadow:{enabled:true},                    // rough grass and wildflowers beyond the hedge
 treeLine:{enabled:true},                  // distant woodland ring
 hills:{enabled:true},                     // horizon hills
 hedge:{enabled:true,height:1.05},         // clipped boundary hedge (metres)
 borders:{enabled:true,planting:'mixed'},  // planted beds inside the hedge
 lawn:{blades:true},                       // 3D grass blades over the lawn
 gardenTrees:{mode:'auto',trees:[]},       // auto: up to four, far from the house
 climbers:{mode:'auto',walls:[]},          // auto: every blank exterior run >= 4 m
 scannedPlants:{enabled:true},             // CC0 scanned shrubs, ferns, weeds, dandelions
 props:{enabled:true},                     // door canopy, step, mat, bicycle, washing line...
 life:{enabled:true},                      // birds, falling leaves
 envelope:{parapet:true,plinth:true,sills:true,downpipes:true,waterButt:true,cladding:true}, // cladding: timber on the smallest volume
 weathering:1                              // facade streaks / splash-back strength, 0..1
});
const SECTIONS=Object.keys(EXTERIOR_DEFAULTS).filter(k=>!['version','weathering'].includes(k));
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const idOk=id=>typeof id==='string'&&id.length>0&&id.length<=200;
function fail(m){throw Error('Invalid exterior: '+m);}

export function validateExterior(ext){
 if(ext===undefined)return;
 if(!isObj(ext)||ext.version!==EXTERIOR_VERSION)fail('version');
 for(const key of Object.keys(ext)){if(key==='version')continue;if(key==='weathering'){if(!Number.isFinite(ext.weathering)||ext.weathering<0||ext.weathering>1)fail('weathering');continue;}
  if(!SECTIONS.includes(key))fail('unknown section '+key);const v=ext[key],d=EXTERIOR_DEFAULTS[key];if(!isObj(v))fail(key);
  for(const [k,val] of Object.entries(v)){if(!(k in d))fail(key+'.'+k);
   if(typeof d[k]==='boolean'&&typeof val!=='boolean')fail(key+'.'+k);}}
 if(ext.hedge?.height!==undefined&&!(Number.isFinite(ext.hedge.height)&&ext.hedge.height>=.4&&ext.hedge.height<=2.5))fail('hedge.height');
 if(ext.borders?.planting!==undefined&&!BORDER_PLANTINGS.includes(ext.borders.planting))fail('borders.planting');
 for(const key of ['gardenTrees','climbers'])if(ext[key]?.mode!==undefined&&!PLACEMENT_MODES.includes(ext[key].mode))fail(key+'.mode');
 const trees=ext.gardenTrees?.trees;if(trees!==undefined){if(!Array.isArray(trees)||trees.length>40)fail('gardenTrees.trees');const ids=new Set();
  for(const t of trees){if(!isObj(t)||!idOk(t.id)||ids.has(t.id)||![t.x,t.y].every(n=>Number.isFinite(n)&&Math.abs(n)<1e7))fail('tree');ids.add(t.id);
   if(t.height!==undefined&&!(Number.isFinite(t.height)&&t.height>=3&&t.height<=15))fail('tree height');if(t.seed!==undefined&&!Number.isSafeInteger(t.seed))fail('tree seed');
   for(const k of Object.keys(t))if(!['id','x','y','height','seed'].includes(k))fail('tree.'+k);}}
 const walls=ext.climbers?.walls;if(walls!==undefined&&(!Array.isArray(walls)||walls.length>200||walls.some(w=>!idOk(w))||new Set(walls).size!==walls.length))fail('climbers.walls');
}
// Defaults + stored overrides; always a complete, fresh object.
export function resolveExterior(scene){
 const ext=scene?.exterior,out=structuredClone(EXTERIOR_DEFAULTS);out.version=EXTERIOR_VERSION;
 if(!ext)return out;validateExterior(ext);
 for(const [k,v] of Object.entries(ext)){if(k==='version')continue;if(k==='weathering')out.weathering=v;else Object.assign(out[k],structuredClone(v));}
 return out;
}
function merge(base,patch){const out=structuredClone(base||{version:EXTERIOR_VERSION});out.version=EXTERIOR_VERSION;
 for(const [k,v] of Object.entries(patch||{})){if(k==='version')continue;if(k==='weathering'||!isObj(v))out[k]=structuredClone(v);else out[k]={...(out[k]||{}),...structuredClone(v)};}return out;}
export function editExterior(scene,op){
 const next=structuredClone(scene);
 switch(op.type){
  case 'exterior.set':if(!isObj(op.exterior))fail('settings');next.exterior=merge(next.exterior,op.exterior);break;
  case 'exterior.reset':delete next.exterior;return next;
  case 'exterior.tree.add':{const t=op.tree;if(!isObj(t))fail('tree');const cur=resolveExterior(next).gardenTrees;
   // Switching from automatic to listed starts from the explicit tree alone; the
   // automatic choice is not frozen into the save.
   const trees=cur.mode==='listed'?cur.trees.filter(x=>x.id!==t.id):[];trees.push(structuredClone(t));next.exterior=merge(next.exterior,{gardenTrees:{mode:'listed',trees}});break;}
  case 'exterior.tree.remove':{const cur=resolveExterior(next).gardenTrees;if(!cur.trees.some(t=>t.id===op.id))throw Error('Garden tree not found');next.exterior=merge(next.exterior,{gardenTrees:{mode:'listed',trees:cur.trees.filter(t=>t.id!==op.id)}});break;}
  case 'exterior.climber.set':{if(!idOk(op.wallId)||typeof op.on!=='boolean')fail('climber');if(!next.walls.some(w=>w.id===op.wallId))throw Error('Wall not found');
   const cur=resolveExterior(next).climbers,walls=new Set(cur.mode==='listed'?cur.walls:[]);op.on?walls.add(op.wallId):walls.delete(op.wallId);next.exterior=merge(next.exterior,{climbers:{mode:'listed',walls:[...walls]}});break;}
  default:throw Error('Unknown exterior operation');
 }
 validateExterior(next.exterior);return next;
}
