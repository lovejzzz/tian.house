import {sourceObjectOffset} from './scene-object-offset.js';
import {pointInPolygon,convexIntersectionArea,polygonSignedArea} from './polygon-footprint.js';
const cache=new WeakMap();
export function objectFootprint(props){
 if(!props?.TianCollisionPolygon)return null;
 if(!cache.has(props)){let polygon;try{polygon=JSON.parse(props.TianCollisionPolygon);}catch{polygon=null;}
  if(!Array.isArray(polygon)||polygon.length<3||polygon.length>128||polygon.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<-.000001||v>1.000001)))polygon=null;
  if(polygon){
   // Clipping can repeat corner vertices; normalize before geometric queries.
   polygon=polygon.filter((p,i)=>i===0||Math.hypot(p[0]-polygon[i-1][0],p[1]-polygon[i-1][1])>1e-9);
   if(polygon.length>1&&Math.hypot(polygon[0][0]-polygon.at(-1)[0],polygon[0][1]-polygon.at(-1)[1])<1e-9)polygon.pop();
   const area=polygonSignedArea(polygon),sign=Math.sign(area);
   // Intersection code requires a convex footprint. Invalid metadata retains
   // the source solid-cell collision instead of silently opening a passage.
   if(Math.abs(area)<1e-9||polygon.some((a,i)=>{const b=polygon[(i+1)%polygon.length];return polygon.some(c=>sign*((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))< -1e-9);}))polygon=null;
  }
  cache.set(props,polygon);
 }return cache.get(props);
}
export function objectBlocksPoint(world,x,y,z){
 for(let cx=Math.floor(x-.5);cx<=Math.floor(x+.5);cx++)for(let cy=Math.floor(y-.5);cy<=Math.floor(y+.5);cy++)for(const tile of world.square(cx,cy,z)?.tiles||[]){const polygon=objectFootprint(world.props(tile)),[ox,oy]=sourceObjectOffset(world.housePlan,cx,cy,z,tile);if(polygon&&!world.state(cx,cy,z,tile).destroyed&&pointInPolygon([x-cx-ox,y-cy-oy],polygon,{boundary:false}))return true;}return false;
}
export function objectOverlap(world,x,y,z,radius=.18){
 let area=0;
 for(let cx=Math.floor(x-radius-.5);cx<=Math.floor(x+radius+.5);cx++)for(let cy=Math.floor(y-radius-.5);cy<=Math.floor(y+radius+.5);cy++){
  const body=[[x-radius-cx,y-radius-cy],[x+radius-cx,y-radius-cy],[x+radius-cx,y+radius-cy],[x-radius-cx,y+radius-cy]];
  for(const tile of world.square(cx,cy,z)?.tiles||[]){const polygon=objectFootprint(world.props(tile));if(polygon&&!world.state(cx,cy,z,tile).destroyed){const [ox,oy]=sourceObjectOffset(world.housePlan,cx,cy,z,tile);area+=convexIntersectionArea(polygon,body.map(([x,y])=>[x-ox,y-oy]));}}
 }return area;
}
