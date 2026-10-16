import {fixtureAxis} from './furnishing.js';
import {diagonalOpeningHosts} from './fixed-glazing.js';
import {wallEdgeEndpoints} from './polygon-footprint.js';
import {paneAxis} from './wall-joins.js';
// Wall-face picking uses the same isometric projection as the rendered scene.
// Return one intent consumed by both the preview and the click; no hidden snap.
export function openingAxis(entry,properties){
 if(!entry?.parts?.length)return null;
 const p=properties[entry.parts[0].tile]||{};
 return (['wall','window'].includes(p.TianMount)?fixtureAxis(p):null)||paneAxis(entry.parts[0].tile,properties)||['N','W'].find(a=>['door','window','Window','Wall'].some(k=>k+a in p))||null;
}
export function hasWallFace(tiles,axis,properties){
 return (tiles||[]).some(t=>paneAxis(t,properties)===axis||['Wall','DoorWall','door','window','Window'].some(k=>k+axis in (properties[t]||{}))||'WallNW'in (properties[t]||{}));
}
export function wallFacePolygon(project,x,y,z,axis,height=96){
 const [a,b]=wallEdgeEndpoints({x,y,axis}),p=project(...a,z),q=project(...b,z);
 return [p,q,{x:q.x,y:q.y-height},{x:p.x,y:p.y-height}];
}
export function insidePolygon(point,polygon){
 let sign=0;
 for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],cross=(b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x);if(Math.abs(cross)<1e-7)continue;const s=Math.sign(cross);if(sign&&s!==sign)return false;sign=s;}
 return !!sign;
}
export function pickWallFace({model,renderer,px,py,z,axis=null}){
 const point={x:px,y:py},candidates=[];
 for(const sq of model.plan.squares){if(sq.z!==z)continue;
  for(const facing of ['N','W']){
   if(!hasWallFace(sq.tiles,facing,model.properties))continue;
   const poly=wallFacePolygon((x,y,z)=>renderer.screen(x,y,z),sq.x,sq.y,z,facing,96*renderer.zoom);
   if(insidePolygon(point,poly))candidates.push({x:sq.x,y:sq.y,z,axis:facing,depth:sq.x+sq.y});
  }
 }
 for(const wall of model.plan.polygonGeometry?.walls||[]){if(wall.z!==z)continue;
  const poly=wallFacePolygon((x,y,z)=>renderer.screen(x,y,z),wall.x,wall.y,z,wall.axis,96*renderer.zoom),edgeOn=Math.abs(poly[0].x-poly[1].x)<1e-6;
  const hit=edgeOn?Math.abs(px-poly[0].x)<=5&&py>=Math.min(...poly.map(p=>p.y))&&py<=Math.max(...poly.map(p=>p.y)):insidePolygon(point,poly);
  if(hit)candidates.push({x:wall.x,y:wall.y,z,axis:wall.axis,assetAxis:wall.materialAxis,wallId:wall.id,depth:wall.x+wall.y+1});
 }
 // Occluding front faces win even if the selected object's direction is wrong.
 candidates.sort((a,b)=>b.depth-a.depth||Number(b.axis===axis)-Number(a.axis===axis));
 return candidates[0]||null;
}
export function resolveWallPlacement({entry,model,renderer,px,py,z}){
 const axis=openingAxis(entry,model.properties);if(!axis)return null;
 const target=pickWallFace({model,renderer,px,py,z,axis});if(!target){const plainWall=entry.parts.every(part=>{const p=model.properties[part.tile]||{};return ['N','W'].some(a=>'Wall'+a in p)&&!paneAxis(part.tile,model.properties)&&!['N','W'].some(a=>['door','window','Window'].some(k=>k+a in p));});return plainWall?null:{placementProblem:'Point at a wall to place this opening'};}
 if((['wall','window'].includes(model.properties[entry.parts[0].tile]?.TianMount)?target.axis:(target.assetAxis||target.axis))!==axis)return {...target,placementProblem:'Press R to match this wall',snapped:true};
 if(target.wallId&&['wall','window'].includes(model.properties[entry.parts[0].tile]?.TianMount)){const mounted={...target,snapped:true,placementProblem:null};delete mounted.wallId;return mounted;}
 if(target.wallId){try{const wall=model.scene.walls.find(w=>w.id===target.wallId),hosts=diagonalOpeningHosts(model.scene,wall,entry,model.properties);return {...target,wallIds:hosts.map(h=>h.wall.id),snapped:true,placementProblem:null};}catch(error){return {...target,snapped:true,placementProblem:error.message};}}
 for(const part of entry.parts){
  const x=target.x+part.dx,y=target.y+part.dy;
  if(!model.inside(x,y,z)||!hasWallFace(model.square(x,y,z)?.tiles,axis,model.properties))return {...target,snapped:true,placementProblem:'The whole opening needs a supporting wall'};
 }
 return {...target,snapped:true,placementProblem:null};
}

export function resolveOrientedPlacement(args,variants,auto=true){
 let entry=args.entry;if(entry?.hostWallId){entry={...entry};delete entry.hostWallId;}let target=resolveWallPlacement({...args,entry});
 const desiredAxis=['wall','window'].includes(args.model.properties[entry.parts[0].tile]?.TianMount)?target?.axis:(target?.assetAxis||target?.axis);
 if(auto&&desiredAxis&&desiredAxis!==openingAxis(entry,args.model.properties)){
  const next=variants.find(e=>openingAxis(e,args.model.properties)===desiredAxis);
  if(next){entry=args.entry.moveObjectId?{...next,moveObjectId:args.entry.moveObjectId}:next;target=resolveWallPlacement({...args,entry});}
 }
 if(target?.wallId)entry={...entry,hostWallId:target.wallId};
 return {entry,target};
}
