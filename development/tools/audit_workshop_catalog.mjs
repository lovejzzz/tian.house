// Exhaustive metadata/category inventory; not a claim of visual review of every sprite.
import fs from 'node:fs';
import {workshopCatalog} from '../src/workshop-model.js';
import {installOriginalAssets} from '../src/original-assets.js';
import {correctSourceProperties} from '../src/source-corrections.js';
const base=new URL('../private-assets/',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL(n,base)));
const properties=read('world/properties.json'),atlas=read('atlas.json');correctSourceProperties(properties);installOriginalAssets(properties,atlas);
const catalog=workshopCatalog(properties,atlas,read('items.json')),counts={},groups=new Map();
for(const e of catalog.entries){counts[e.category]=(counts[e.category]||0)+1;const p=properties[e.source];if(!p?.CustomName||p.CustomName==='CustomName')continue;const name=[p.GroupName,p.CustomName].filter(Boolean).join(' ');if(!groups.has(name))groups.set(name,[]);groups.get(name).push(e);}
const conflicts=[...groups].filter(([,g])=>new Set(g.map(e=>e.category)).size>1).map(([name,g])=>({name,variants:g.map(e=>({source:e.source,category:e.category}))}));
for(const v of read('workshop-vehicles/manifest.json').entries){catalog.entries.push({id:'vehicle:'+v.id,name:v.name,category:'Vehicles',source:v.vehicle,parts:[]});counts.Vehicles=(counts.Vehicles||0)+1;}
const result={kind:'exhaustive metadata audit; representative visual checks recorded separately',entries:catalog.entries.length,counts,conflicts,unavailable:catalog.unavailable.length,unavailableDetails:catalog.unavailable,inventory:catalog.entries.map(e=>({id:e.id,name:e.name,source:e.source,category:e.category,parts:e.parts.length}))};
console.log(JSON.stringify(result,null,2));if(conflicts.length)process.exitCode=1;
