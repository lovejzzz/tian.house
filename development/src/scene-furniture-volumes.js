import {pianoPartMidi} from './piano.js';
import {objectOffset} from './scene-object-offset.js';
import {furnitureUV} from './volume-material-texture.js';
import {transformConvexSolid} from './transform-convex-solid.js';
import {validateWallMounts,wallFixtureSide} from './scene-wall-mounts.js';
import {groundHeight} from './ground-height.js';
let delivery;
export async function fetchVolumeFurniture(base=new URL('../assets/volume/',import.meta.url),fetcher=fetch){
 const response=await fetcher(new URL('build-report.json',base));if(!response.ok)throw Error('Volume manifest unavailable');
 const manifest=await response.json();
 if(manifest.schemaVersion!==3||!Array.isArray(manifest.assets)||!manifest.assets.length)throw Error('Unsupported volume manifest');
 const ids=new Set();
 for(const entry of manifest.assets){
  if(typeof entry.id!=='string'||ids.has(entry.id)||!/^[a-z][a-z0-9-]*$/.test(entry.name)||!/^[a-f0-9]{64}$/.test(entry.deliverySHA256)||entry.delivery!==`${entry.name}.${entry.deliverySHA256}.json.gz`)throw Error('Invalid volume manifest entry');
  ids.add(entry.id);
 }
 return Promise.all(manifest.assets.map(async entry=>{
  const response=await fetcher(new URL(entry.delivery,base));if(!response.ok)throw Error('Volume furniture delivery unavailable');
  const bytes=await response.arrayBuffer(),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(digest!==entry.deliverySHA256||bytes.byteLength!==entry.deliveryBytes)throw Error('Volume delivery integrity mismatch');
  const data=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
  if(data.schemaVersion!==1||data.recipe?.id!==entry.id||!data.recipe?.migration||!data.geometry?.parts)throw Error('Unsupported volume furniture recipe');return data;
 }));
}
export function loadVolumeFurniture(){return delivery??=fetchVolumeFurniture().catch(error=>{delivery=null;throw error;});}
export function resolveVolumeFurniture(object,assets){
 const candidates=[];
 for(const asset of assets)for(const [direction,tiles] of Object.entries(asset.recipe.migration)){
  if(object.parts.length===tiles.length&&tiles.every(t=>object.parts.filter(p=>p.tile===t).length===1))candidates.push({asset,direction});
 }
 if(!candidates.length)return {reason:'No volume recipe for this object'};
 if(candidates.length!==1)return {reason:'Ambiguous volume recipe mapping'};
 const result=candidates[0],layout=result.asset.recipe.sourceLayout?.[result.direction];
 if(!layout||!layout.every(p=>object.parts.some(o=>o.tile===p.tile&&o.dx===p.dx&&o.dy===p.dy)))return {reason:'Source part offsets do not match the reviewed recipe layout'};
 return result;
}
export function sceneFurnitureVolumes(scene,plan,properties,asset,{cellSize,storeyHeight,wallThickness=.2,onUnresolved=()=>{},onActivityZone=()=>{}}){
 const levels=new Map(scene.levels.map(l=>[l.id,l.index])),squares=new Map(plan.squares.map(s=>[`${s.x},${s.y},${s.z}`,s])),volumes=[];
 const assets=Array.isArray(asset)?asset:[asset];
 for(const object of scene.objects){
  const reject=reason=>onUnresolved({objectId:object.id,assetId:object.assetId||null,levelId:object.levelId,reason});
  const {asset,direction,reason}=resolveVolumeFurniture(object,assets);if(reason){reject(reason);continue;}
  const [fineX,fineY]=objectOffset(object);const z=levels.get(object.levelId);if(!Number.isFinite(z)){reject('Missing scene level');continue;}
  const lift=groundHeight(squares.get(`${object.x},${object.y},${z}`),properties)*storeyHeight/96;
  let support=0,wall=null,wallSide=1;
  if(['wall','window'].includes(asset.recipe.semantics.mount)){
   try{validateWallMounts(scene,object,properties);}catch(error){reject(error.message);continue;}
   wall=scene.walls?.find(w=>w.id===object.wallMounts?.[0]?.wallId);
   if(!wall||!['N','W'].includes(wall.axis)||object.parts.length!==1||(asset.recipe.semantics.mount==='wall'&&scene.openings.some(o=>o.hostWallId===wall.id))){reject('Wall light requires one supported solid N/W wall face');continue;}
  }
  if(wall)wallSide=wallFixtureSide(scene,object,wall,properties);
  if(asset.recipe.semantics.mount==='table'){
   const host=scene.objects.find(o=>o.id===object.hostId&&o.levelId===object.levelId);
   const hp=host?.parts.find(p=>host.x+p.dx===object.x&&host.y+p.dy===object.y&&'IsTable' in (properties[p.tile]||{}));
   if(!hp||!Number.isFinite(Number(properties[hp.tile].Surface))||Number(properties[hp.tile].Surface)<=0){reject('Missing or invalid tabletop support');continue;}
   const resolvedHost=resolveVolumeFurniture(host,assets);if(resolvedHost.reason){reject('Supporting furniture has no valid volume recipe');continue;}
   const authoredHeight=resolvedHost.asset.recipe.semantics.supportHeight;if(authoredHeight!==undefined&&(!Number.isFinite(authoredHeight)||authoredHeight<=0)){reject('Invalid authored support height');continue;}
   support=authoredHeight===undefined?Number(properties[hp.tile].Surface)*storeyHeight/96:authoredHeight*storeyHeight/3;
  }
  // Directions and emitter offsets share the same linear transform. Offsets must
  // not inherit the object's translation, support lift or cell-origin correction.
  const vector=([x,y,h])=>{if(wall)return wall.axis==='N'?[x*cellSize*wallSide,y*cellSize*wallSide,h*storeyHeight/3]:[y*cellSize*wallSide,-x*cellSize*wallSide,h*storeyHeight/3];const [u,v]=direction==='E'?[-y,x]:direction==='N'?[-x,-y]:direction==='W'?[y,-x]:[x,y];return [u*cellSize,v*cellSize,h*storeyHeight/3];};
  const transform=([x,y,h])=>{if(wall){const depth=(y*cellSize+wallThickness/2)*wallSide,u=wallSide===1?x:1-x;return wall.axis==='N'?[(wall.x+u)*cellSize,wall.y*cellSize+depth,z*storeyHeight+h*storeyHeight/3]:[wall.x*cellSize+depth,(wall.y+1-u)*cellSize,z*storeyHeight+h*storeyHeight/3];}const [ox,oy]=asset.recipe.placement?.offset||(asset.recipe.semantics.kind==='table'?[.1,.1]:[0,0]);x+=ox;y+=oy;const [w,d]=asset.recipe.placement?.cells||[2,1];const [u,v]=direction==='E'?[d-y,x]:direction==='N'?[w-x,d-y]:direction==='W'?[y,w-x]:[x,y];return [(object.x+u+fineX)*cellSize,(object.y+v+fineY)*cellSize,z*storeyHeight+lift+support+h*storeyHeight/3];};
  for(const zone of asset.recipe.activityZones||[]){
   if(![zone.min,zone.max].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))||zone.min.some((v,i)=>v>=zone.max[i]))throw Error('Invalid furniture activity zone');
   const corners=[]; // All eight corners share the mesh transform.
   for(const x of [zone.min[0],zone.max[0]])for(const y of [zone.min[1],zone.max[1]])for(const h of [zone.min[2],zone.max[2]])corners.push(transform([x,y,h]));
   onActivityZone({...zone,objectId:object.id,levelId:object.levelId,min:[0,1,2].map(i=>Math.min(...corners.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...corners.map(p=>p[i])))});
  }
  for(const [index,part] of asset.geometry.parts.entries()){
   const vertices=part.vertices.map(transform);
   const mesh={...part,softForward:part.softSupport?vector([0,1,0]):undefined,id:`furniture:${object.id}:${part.id}`,objectId:object.id,levelId:object.levelId,vertices,recipeId:asset.recipe.id,material:asset.recipe.materials[part.materialId]};if(mesh.material?.texture)mesh.uv=furnitureUV(part,[cellSize,cellSize,storeyHeight/3],mesh.material.texture.repeatMetres);mesh.collision=part.collision.map(solid=>transformConvexSolid(solid,transform,vector));
   if(index===0&&['sink','kitchen-sink'].includes(asset.recipe.semantics.kind))mesh.fixtureUse={point:transform([asset.recipe.parameters.width/2,asset.recipe.parameters.depth,0]),forward:vector([0,1,0]),width:asset.recipe.parameters.width*cellSize,handTarget:transform([asset.recipe.parameters.width/2,asset.recipe.parameters.depth*.52,asset.recipe.parameters.height+.04])};
   if(asset.recipe.semantics.kind==='upright-piano'&&pianoPartMidi.has(part.id))mesh.pianoMidi=pianoPartMidi.get(part.id);
   if(index===0&&asset.recipe.semantics.kind==='upright-piano')mesh.pianoKeyboard={objectId:object.id,levelId:object.levelId,point:transform([.765,.60,.78]),forward:vector([0,1,0])};
   if(part.drawerSlide)mesh.drawerSlide=vector(part.drawerSlide);
   if(part.lidHinge)mesh.lidHinge={point:transform(part.lidHinge.point),axis:vector(part.lidHinge.axis),angle:part.lidHinge.angle};
   if(part.softSupport==='seat'&&asset.recipe.semantics.kind==='piano-bench')mesh.pianoSeat={objectId:object.id,levelId:object.levelId,point:transform([.5,.24,.51])};
   if(index===0&&asset.recipe.semantics.kind==='toilet'){
    const {width:w,depth:d}=asset.recipe.parameters,seatPoints=[[0,0,.45],[w,d,.475]].flatMap(a=>[[0,0,.45],[w,d,.475]].map(b=>transform([a[0],b[1],a[2]])));
    mesh.fixtureUse={kind:'toilet',point:transform([w/2,d,0]),forward:vector([0,1,0]),width:w*cellSize,seat:{point:transform([w/2,d*.58,.475]),forward:vector([0,1,0]),bounds:[[0,1,2].map(i=>Math.min(...seatPoints.map(p=>p[i]))),[0,1,2].map(i=>Math.max(...seatPoints.map(p=>p[i])))]}};
   }
   if(index===0&&asset.recipe.semantics.kind==='fridge')mesh.fridgeStorage={origin:transform([0,0,0]),axes:[[1,0,0],[0,1,0],[0,0,1]].map(vector),width:asset.recipe.parameters.width,depth:asset.recipe.parameters.depth,light:asset.recipe.parameters.interiorLight};
   if(asset.recipe.semantics.kind==='fridge'&&/^(lower|freezer)-(seal|door|handle)$/.test(part.id))mesh.fridgeHinge=transform([asset.recipe.parameters.width-.015,asset.recipe.parameters.depth-.04,0]);
   if(asset.recipe.parameters?.kind==='television-85'&&part.id==='display')mesh.televisionScreen=[[1.8842,.1502,.088],[.008,.1502,.088],[.008,.1502,1.1539],[1.8842,.1502,1.1539]].map(transform);
   if(index===0&&asset.geometry.light)mesh.light={...asset.geometry.light,position:transform(asset.geometry.light.position),target:transform(asset.geometry.light.target),samples:asset.geometry.light.samples?.map(vector)};
   if(index===0&&asset.geometry.additionalLights)mesh.additionalLights=asset.geometry.additionalLights.map(light=>({...light,position:transform(light.position),target:transform(light.target),samples:light.samples?.map(vector)}));
   volumes.push(mesh);
  }
 }
 return volumes;
}
