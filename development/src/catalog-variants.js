import {paneAxis} from './wall-joins.js';
import {windowConditions} from './catalog-navigation.js';
export function entryFacing(e,properties){const p=properties[e?.source]||{};return e?.facing||p.Facing||paneAxis(e?.source||'',properties)||['N','W'].find(a=>['Wall','DoorWall','door','Window'].some(k=>k+a in p))||null;}
// Reviewed against the sink volume recipe and source Facing/GroupName metadata.
const reviewedFamilies=new Map([12,13,28,29].map(n=>['fixtures_sinks_01_'+n,'white-standing-sink']));
// Preserve every source entry. Only the browser is grouped; saves keep sprite IDs.
export function orientationFamilies(entries,properties){
 const conditions=windowConditions(properties),buckets=new Map(),byId=new Map();
 for(const e of entries){
  const p=properties[e.source]||{},facing=entryFacing(e,properties),n=Number(e.source?.match(/_(\d+)$/)?.[1]);
  let key=null;
  if(e.stairs||e.id.startsWith('garage:'))key=e.group;
  else if(facing&&!e.itemType&&!e.tree&&!e.vehicle){
   const axis=['N','W'].find(a=>['Wall','DoorWall','door','window','Window'].some(k=>k+a in p))||paneAxis(e.source,properties);
   if(reviewedFamilies.has(e.source)){key=JSON.stringify(['reviewed',reviewedFamilies.get(e.source),e.category,e.parts.length]);}
   else if(p.TianVariantFamily){key=JSON.stringify(['declared',p.TianVariantFamily,e.category,p.TianMount??null,e.parts.length]);}
   else if(p.CustomName||axis){
    const kind=axis?['Wall','DoorWall','door','Window'].find(k=>k+axis in p)||'pane':'object';
    const stem=e.source.replace(/_[NW](?=_)/g,'_axis').replace(/_\d+$/,'');
    const style=p.GroupName?null:Math.floor(n/(4*Math.max(1,e.parts.length)));
    const semantic=['GroupName','CustomName','Material','Material2','Material3','MaterialType','WindowShape','TianMount','BedType','container','Surface','IsClosedState','OpenTileOffset'].map(k=>p[k]??null);
    key=JSON.stringify([e.category,stem,style,kind,semantic,conditions.get(e.source)||null,e.parts.length]);
   }
  }
  if(!key){byId.set(e.id,[e]);continue;}
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(e);
 }
 for(const candidates of buckets.values()){
  // Repeated same-facing styles are separate families, never discarded.
  const families=[];
  for(const e of candidates.sort((a,b)=>Number(a.source.match(/_(\d+)$/)?.[1]||0)-Number(b.source.match(/_(\d+)$/)?.[1]||0))){
   const facing=entryFacing(e,properties),family=families.find(f=>!f.some(v=>entryFacing(v,properties)===facing)&&(reviewedFamilies.has(e.source)||Math.abs(Number(e.source.match(/_(\d+)$/)?.[1]||0)-Number(f[0].source.match(/_(\d+)$/)?.[1]||0))<=Math.max(8,e.parts.length*4)));
   if(family)family.push(e);else families.push([e]);
  }
  for(const family of families)for(const e of family)byId.set(e.id,family);
 }
 return byId;
}
export function collapseOrientations(entries,families){const seen=new Set();return entries.filter(e=>{const id=families.get(e.id)?.[0].id||e.id;if(seen.has(id))return false;seen.add(id);return true;});}
