import {groundHeight} from './ground-height.js';
import {groundGeometry,groundContains} from './ground-footprint.js';
const key=(x,y,z)=>`${x},${y},${z}`;
const architectural=p=>['wall','ceiling','window'].includes(p.TianMount)||['WallN','WallW','WallNW','WallSE','doorN','doorW','windowN','windowW'].some(k=>k in p);
export function validateGroundSupport(plan,properties,scene){
 if(!plan.squares.some(s=>groundHeight(s,properties)))return;
 const cells=new Map(plan.squares.map(s=>[key(s.x,s.y,s.z),s]));
 const {height,uniform}=supportChecks(plan,properties,(x,y,z)=>cells.get(key(x,y,z)));
 validateDoorGroundClearance(plan,properties,(x,y,z)=>cells.get(key(x,y,z)));
 for(const s of plan.squares){
  const elevated=groundHeight(s,properties);
  for(const tile of s.tiles){const p=properties[tile]||{};
   if(elevated&&('TianReturnStair'in p||Object.keys(p).some(k=>/^stairs[TBM][NW]$/.test(k))))throw Error('Keep raised ground clear of stair footprints');
   if(architectural(p))continue;
   if('solidfloor'in p&&!('FloorOverlay'in p)&&p.MoveType!=='FloorRug')continue;
   if(p.IsMoveAble!==undefined||p.solid!==undefined||p.solidtrans!==undefined||p.TianMount==='table')height(s.x,s.y,s.z);
  }
 }
 for(const object of scene?.objects||[]){const z=scene.levels.find(l=>l.id===object.levelId).index;
  const parts=object.parts.filter(p=>!architectural(properties[p.tile]||{}));if(parts.length)uniform(parts.map(p=>[object.x+p.dx,object.y+p.dy,z]));
 }
 for(const v of plan.vehicles||[]){const f=v.footprint||[2,4],turned=v.rotation%2,w=f[turned?1:0],h=f[turned?0:1],points=[];
  for(let x=Math.floor(v.x-w/2);x<v.x+w/2;x++)for(let y=Math.floor(v.y-h/2);y<v.y+h/2;y++)points.push([x,y,v.z]);uniform(points);
 }
}

function supportChecks(plan,properties,lookup){
 const height=(x,y,z)=>{
  const s=lookup(x,y,z),h=groundHeight(s,properties);if(!h)return 0;
  const tile=s.tiles.find(t=>groundHeight({tiles:[t]},properties)===h),g=groundGeometry(tile,s,plan.polygonGeometry,properties);
  if(g&&!g.floors[0].full)throw Error('Keep floor-standing objects clear of mixed-height cells');
  return h;
 };
 const uniform=points=>{const heights=points.map(([x,y,z])=>height(x,y,z));if(new Set(heights).size>1)throw Error('An entire object must stand on one ground height');};
 return {height,uniform};
}

// Used by hover and placement, including legacy multipart entries that have no
// scene object record yet. Reuse the model's cell index instead of scanning the lot.
export function validateGroundPlacement(plan,properties,entry,x,y,z,lookup){
 if(!entry)return;
 const {uniform}=supportChecks(plan,properties,lookup);
 if(entry.vehicle){const v=entry.vehicle,f=[Math.max(1,v.extents[0]*v.scale),Math.max(1,v.extents[2]*v.scale)],turned=(entry.rotation??0)%2,w=f[turned?1:0],h=f[turned?0:1],points=[];
  for(let cx=Math.floor(x-w/2);cx<x+w/2;cx++)for(let cy=Math.floor(y-h/2);cy<y+h/2;cy++)points.push([cx,cy,z]);uniform(points);return;
 }
 const points=[];
 for(const part of entry.parts||[]){const p=properties[part.tile]||{},cx=x+part.dx,cy=y+part.dy,s=lookup(cx,cy,z);
  const stair=q=>'TianReturnStair'in q||Object.keys(q).some(k=>/^stairs[TBM][NW]$/.test(k));
  if('solidfloor'in p&&!('FloorOverlay'in p)&&p.MoveType!=='FloorRug'&&!stair(p)){
   if(s?.tiles.some(t=>stair(properties[t]||{})))throw Error('Keep floor painting clear of stair footprints');
   continue;
  }
  if(entry.stairs||stair(p)){if(groundHeight(s,properties))throw Error('Keep raised ground clear of stair footprints');continue;}
  if(!architectural(p))points.push([cx,cy,z]);
 }
 if(points.length)uniform(points);
}

// Door leaves stay on their architectural plane. A raised threshold trims their
// bottom edge; terrain must never rise above it and intersect a closed leaf.
function validateDoorGroundClearance(plan,properties,lookup){
 const walls=(plan.polygonGeometry?.walls||[]).filter(w=>w.opening?.kind==='door'||w.opening?.type==='door'||['doorN','doorW'].some(k=>k in (properties[w.opening?.tile]||{})));
 const covered=new Set(walls.map(w=>key(w.x,w.y,w.z)+':'+w.axis));
 for(const s of plan.squares)for(const tile of s.tiles)for(const axis of ['N','W'])if('door'+axis in (properties[tile]||{})&&!covered.has(key(s.x,s.y,s.z)+':'+axis))walls.push({x:s.x,y:s.y,z:s.z,axis,a:[s.x,s.y],b:axis==='N'?[s.x+1,s.y]:[s.x,s.y+1],opening:{tile}});
 for(const wall of walls){const [a,b]=[wall.a,wall.b],length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/length,(b[1]-a[1])/length],n=[-u[1],u[0]],width=wall.opening.width??1,limit=wall.opening.threshold?.height||0;
  for(const along of [-width/2+.01,0,width/2-.01])for(const across of [-.01,.01]){
   const x=(a[0]+b[0])/2+u[0]*along+n[0]*across,y=(a[1]+b[1])/2+u[1]*along+n[1]*across,s=lookup(Math.floor(x),Math.floor(y),wall.z);
   const height=groundHeight(s,properties,tile=>groundContains(tile,s,plan.polygonGeometry,x,y,properties));
   if(height>limit)throw Error('Add a door threshold at least as high as the adjoining ground');
  }
 }
}
