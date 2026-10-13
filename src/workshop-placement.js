// Wall-face picking uses the same isometric projection as the rendered scene.
// Return one intent consumed by both the preview and the click; no hidden snap.
export function openingAxis(entry,properties){
 if(!entry?.parts?.length)return null;
 const p=properties[entry.parts[0].tile]||{};
 return ['N','W'].find(a=>['door','window','Window'].some(k=>k+a in p))||null;
}
export function hasWallFace(tiles,axis,properties){
 return (tiles||[]).some(t=>['Wall','DoorWall','door','window','Window'].some(k=>k+axis in (properties[t]||{}))||'WallNW'in (properties[t]||{}));
}
export function wallFacePolygon(project,x,y,z,axis,height=96){
 const p=project(x,y,z),q=project(x+(axis==='N'?1:0),y+(axis==='W'?1:0),z);
 return [p,q,{x:q.x,y:q.y-height},{x:p.x,y:p.y-height}];
}
export function insidePolygon(point,polygon){
 let sign=0;
 for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],cross=(b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x);if(Math.abs(cross)<1e-7)continue;const s=Math.sign(cross);if(sign&&s!==sign)return false;sign=s;}
 return !!sign;
}
export function resolveWallPlacement({entry,model,renderer,px,py,z}){
 const axis=openingAxis(entry,model.properties);if(!axis)return null;
 const point={x:px,y:py},candidates=[];
 for(const sq of model.plan.squares){if(sq.z!==z)continue;
  for(const facing of ['N','W']){
   if(!hasWallFace(sq.tiles,facing,model.properties))continue;
   const poly=wallFacePolygon((x,y,z)=>renderer.screen(x,y,z),sq.x,sq.y,z,facing,96*renderer.zoom);
   if(insidePolygon(point,poly))candidates.push({x:sq.x,y:sq.y,z,axis:facing,depth:sq.x+sq.y});
  }
 }
 // Occluding front faces win even if the selected object's direction is wrong.
 candidates.sort((a,b)=>b.depth-a.depth||Number(b.axis===axis)-Number(a.axis===axis));
 const target=candidates[0];if(!target)return {placementProblem:'Point at a wall to place this opening'};
 if(target.axis!==axis)return {...target,placementProblem:'Press R to match this wall',snapped:true};
 for(const part of entry.parts){
  const x=target.x+part.dx,y=target.y+part.dy;
  if(!model.inside(x,y,z)||!hasWallFace(model.square(x,y,z)?.tiles,axis,model.properties))return {...target,snapped:true,placementProblem:'The whole opening needs a supporting wall'};
 }
 return {...target,snapped:true,placementProblem:null};
}
