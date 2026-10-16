import {thresholdHeight} from './door-threshold.js';
import {pointInPolygon,boundaryBlocksMovement} from './polygon-footprint.js';
import {openingJambs} from './diagonal-openings.js';
import {barricadePresent} from './barricades.js';
const key=(x,y,z)=>`${Math.floor(x)},${Math.floor(y)},${z}`;
// Exact L-infinity distance to a segment: the maximum of two absolute linear
// functions can attain its minimum at an endpoint, a zero, or their crossing.
export function squareDistanceToWall(point,wall){
 const [a,b]=[wall.a,wall.b],u=a[0]-point[0],v=a[1]-point[1],dx=b[0]-a[0],dy=b[1]-a[1],candidates=[0,1];
 for(const [n,d]of [[-u,dx],[-v,dy],[v-u,dx-dy],[-v-u,dx+dy]])if(d){const t=n/d;if(t>0&&t<1)candidates.push(t);}
 return Math.min(...candidates.map(t=>Math.max(Math.abs(u+t*dx),Math.abs(v+t*dy))));
}
export class PolygonRuntime {
 constructor(geometry,stateForWall=()=>({})){
  this.floors=new Map();this.walls=new Map();this.openingTiles=new Map();this.stateForWall=stateForWall;
  for(const f of geometry?.floors||[]){const k=key(f.x,f.y,f.z);if(!this.floors.has(k))this.floors.set(k,[]);this.floors.get(k).push(f);}
  for(const w of geometry?.walls||[]){if(!this.walls.has(w.z))this.walls.set(w.z,[]);this.walls.get(w.z).push(w);if(w.opening)this.openingTiles.set(w.opening.stateTile,w.opening.tile);}
 }
 surfaceHeight(x,y,z){return Math.max(0,...this.candidates([x,y],[x,y],z,1).map(w=>thresholdHeight(w,x,y)));}
 floorContains(tile,x,y,z){const parts=this.floors.get(key(x,y,z))?.filter(f=>f.tile===tile);return !parts?.length||parts.some(f=>f.full||f.polygons.some(p=>pointInPolygon([x-f.x,y-f.y],p)));}
 // Placement footprints currently occupy whole cells. All four sectors must
 // be supported, even when the cell's centre happens to touch a diagonal.
 floorCoversCell(tiles,x,y,z){return [[.5,1/6],[5/6,.5],[.5,5/6],[1/6,.5]].every(p=>tiles.some(tile=>this.floorContains(tile,x+p[0],y+p[1],z)));}
 roomContains(x,y,z){const parts=this.floors.get(key(x,y,z));return !parts?.length?null:parts.some(f=>f.full||f.polygons.some(p=>pointInPolygon([x-f.x,y-f.y],p)));}
 candidates(from,to,z,radius=0){const minX=Math.min(from[0],to[0])-radius,maxX=Math.max(from[0],to[0])+radius,minY=Math.min(from[1],to[1])-radius,maxY=Math.max(from[1],to[1])+radius;return (this.walls.get(z)||[]).filter(w=>Math.max(...[w.a[0],w.b[0]])>=minX&&Math.min(w.a[0],w.b[0])<=maxX&&Math.max(w.a[1],w.b[1])>=minY&&Math.min(w.a[1],w.b[1])<=maxY);}
 barriers(from,to,z,radius=0,mode='move',ignoreWallId=null){return this.candidates(from,to,z,radius).filter(w=>w.id!==ignoreWallId).flatMap(w=>{
  if(!w.opening)return [w];if(w.opening.fixed)return mode==='vision'?[]:[w];const s=this.stateForWall(w),blocked=barricadePresent(s.barricade)||Object.values(s.barricades||{}).some(barricadePresent);
  const clear=!blocked&&(w.opening.kind==='door'&&(s.open||s.destroyed)||mode==='vision'&&(s.open||s.destroyed||w.opening.translucent)&&!(s.hasCurtain&&!s.curtainOpen));return clear?openingJambs(w):[w];
 });}
 blocksLine(from,to,z,mode='move',ignoreWallId=null){return boundaryBlocksMovement(this.barriers(from,to,z,0,mode,ignoreWallId),from,to);}
 penetration(point,z,radius=.18){return Math.max(0,...this.barriers(point,point,z,radius).map(w=>radius-squareDistanceToWall(point,w)));}
 blocksMove(from,to,z,radius=.18){
  for(const wall of this.barriers(from,to,z,radius)){
   const before=radius-squareDistanceToWall(from,wall),after=radius-squareDistanceToWall(to,wall);
   if(before>1e-8){
    // Permit escape from old tiny overlaps, but not through to the other side.
    const centerCrosses=squareDistanceToWall(from,wall)>1e-8&&boundaryBlocksMovement([wall],from,to);
    if(after<before-1e-9&&!centerCrosses)continue;
    if(after<=before+1e-9&&!centerCrosses&&Math.abs(after-before)<1e-9)continue;
    return true;
   }
   // Touching is legal. Test the interior to permit tangential movement along
   // a wall and departure from contact without letting the footprint cross it.
   if(boundaryBlocksMovement([wall],from,to,Math.max(0,radius-1e-8)))return true;
  }return false;
 }
}
