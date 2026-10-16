import {foodPropsVolume} from '../src/food-props-volume.js';
import {studioFurnitureVolume} from '../src/studio-furniture-volume.js';
// Publish immutable content-addressed payloads, then atomically switch the manifest.
import * as fs from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';import {gzipSync,gunzipSync} from 'node:zlib';import {pathToFileURL} from 'node:url';
import {architecturalMaterialBundle} from '../src/architectural-materials.js';
import {interiorDetailsVolume} from '../src/interior-details-volume.js';
import {plantVolume} from '../src/plant-volume.js';
import {wallLightVolume} from '../src/wall-light-volume.js';
import {wetFurnitureVolume} from '../src/wet-furniture-volume.js';
import {domesticFurnitureVolume} from '../src/domestic-furniture-volume.js';
import {frameFurnitureVolume} from '../src/frame-furniture-volume.js';
import {tableVolume} from '../src/table-volume.js';import {lampVolume} from '../src/lamp-volume.js';
const families=[['food-props',foodPropsVolume],...["storage-bed","nightstand","water-glass","office-chair","upright-piano","piano-bench","workstation","media-console","television-85","floor-speaker","functional-trainer","breakfast-bar","bar-stool","sectional-sofa"].map(k=>['studio-'+k,studioFurnitureVolume]),...['tea','books','desk','radio','kitchen','wash','art','curtain','wardrobe','bath-mirror','bath-towel'].map(k=>['detail-'+k,interiorDetailsVolume]),['floor-lamp',lampVolume],['surface-materials',architecturalMaterialBundle],['bench',frameFurnitureVolume],['snake-plant',plantVolume],['wall-strip',wallLightVolume],['wall-sconce',wallLightVolume],['directional-wall-light',wallLightVolume],['table',tableVolume],['low-table',tableVolume],['lamp',lampVolume],['chair',frameFurnitureVolume],['shelf',frameFurnitureVolume],...['sofa','bed','oven','fridge'].map(name=>[name,domesticFurnitureVolume]),...['counter','sink','kitchen-sink','toilet','shower'].map(name=>[name,wetFurnitureVolume])];
const hash=data=>createHash('sha256').update(data).digest('hex');
export async function buildVolumeAssets({root=new URL('../',import.meta.url),generators=families,io=fs}={}){
 const reports=[],payloads=[];
 // Finish all generation and source validation before touching the delivery directory.
 for(const [name,generate] of generators){
  if(!/^[a-z][a-z0-9-]*$/.test(name))throw Error('Invalid volume family name');
  const path=`assets/recipes/volume/${name}.json`,recipe=JSON.parse(await io.readFile(new URL(path,root),'utf8')),geometry=generate(recipe);
  const payload=JSON.stringify({schemaVersion:1,recipe,geometry}),packed=gzipSync(payload,{level:9});if(gunzipSync(packed).toString()!==payload)throw Error('Volume delivery roundtrip mismatch');
  const hashes={};for(const file of [path,recipe.generator,...(recipe.sourceFiles||[]),'src/source-floor-texture.js','src/source-patch-texture.js','src/volume-material-texture.js','src/scene-slab-volumes.js','src/convex-solid.js'])hashes[file]=hash(await io.readFile(new URL(file,root)));
  const deliverySHA256=hash(packed),delivery=`${name}.${deliverySHA256}.json.gz`;
  reports.push({name,id:recipe.id,hashes,delivery,sourceBytes:Buffer.byteLength(payload),deliveryBytes:packed.length,deliverySHA256,parts:geometry.parts.length,status:'prototype; visual acceptance pending'});payloads.push({delivery,packed});
 }
 await io.mkdir(new URL('assets/volume/',root),{recursive:true});
 for(const {delivery,packed}of payloads){
  const target=new URL(`assets/volume/${delivery}`,root);
  try{await io.writeFile(target,packed,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;if(!packed.equals(await io.readFile(target)))throw Error('Immutable volume payload corrupted');}
 }
 const manifest=JSON.stringify({schemaVersion:3,assets:reports},null,2)+'\n',temporary=new URL(`assets/volume/.build-report-${randomUUID()}.json`,root);
 try{await io.writeFile(temporary,manifest,{flag:'wx'});await io.rename(temporary,new URL('assets/volume/build-report.json',root));}
 finally{await io.rm(temporary,{force:true});}
 // Keep previous hashed deliveries: browsers holding the previous manifest still need them.
 return reports;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const reports=await buildVolumeAssets();console.log(JSON.stringify(reports.map(({id,sourceBytes,deliveryBytes,parts})=>({id,sourceBytes,deliveryBytes,parts}))));}
