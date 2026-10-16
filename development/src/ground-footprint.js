import {polygonSignedArea,pointInPolygon} from './polygon-footprint.js';
const EPS=1e-9,unit=[[0,0],[1,0],[1,1],[0,1]],emptyGeometry={},cache=new WeakMap();
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function halfPlane(poly,a,b,inside){
 const out=[];for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],u=cross(a,b,p),v=cross(a,b,q),pin=inside?u>=-EPS:u<=EPS,qin=inside?v>=-EPS:v<=EPS;
  if(pin)out.push(p);if(pin!==qin){const t=u/(u-v);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
 }
 const clean=out.filter((p,i)=>{const q=out[(i+out.length-1)%out.length];return Math.hypot(p[0]-q[0],p[1]-q[1])>EPS;});
 return clean.length>=3&&Math.abs(polygonSignedArea(clean))>EPS?clean:[];
}
// Convex cutters come from the existing room triangulation. Outside pieces are
// disjoint; only the remainder continues through subsequent half-planes.
export function subtractConvex(subject,cutter){
 let remainder=subject;const pieces=[],cut=polygonSignedArea(cutter)<0?[...cutter].reverse():cutter;
 for(let i=0;i<cut.length&&remainder.length;i++){
  const a=cut[i],b=cut[(i+1)%cut.length],outside=halfPlane(remainder,a,b,false);
  if(outside.length)pieces.push(outside);remainder=halfPlane(remainder,a,b,true);
 }
 return pieces;
}
export function groundGeometry(tile,square,geometry,properties={}){
 const profile=properties[tile]?.TianGroundPolygon;
 if(!geometry&&!profile)return undefined;
 geometry??=emptyGeometry;
 let c=cache.get(geometry);if(!c){const cells=new Map();for(const f of geometry.floors||[]){const k=`${f.x},${f.y},${f.z}`;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(f);}c={cells,results:new Map()};cache.set(geometry,c);}
 const cellKey=`${square.x},${square.y},${square.z}`,key=cellKey+':'+tile+':'+square.tiles.join('|')+':'+(profile||'');
 if(c.results.has(key))return c.results.get(key);
 const parts=(c.cells.get(cellKey)||[]).filter(f=>square.tiles.includes(f.tile)),own=parts.filter(f=>f.tile===tile);
 let polygons=own.length?own.flatMap(f=>f.full?[unit]:f.polygons):[unit];
 if(!own.length)for(const part of parts)for(const cutter of part.full?[unit]:part.polygons)polygons=polygons.flatMap(poly=>subtractConvex(poly,cutter));
 if(profile){
  const polygon=JSON.parse(profile);
  if(!Array.isArray(polygon)||polygon.length<3||polygon.length>8||polygon.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>1))||polygonSignedArea(polygon)<=EPS)throw Error('Invalid ground polygon');
  if(new Set(polygon.map(p=>p.join(','))).size!==polygon.length)throw Error('Ground polygon has repeated vertices');
  for(let i=0;i<polygon.length;i++)if(polygon.some(p=>cross(polygon[i],polygon[(i+1)%polygon.length],p)<-EPS))throw Error('Ground polygon must be convex');
  polygons=polygons.map(poly=>{for(let i=0;i<polygon.length&&poly.length;i++)poly=halfPlane(poly,polygon[i],polygon[(i+1)%polygon.length],true);return poly;}).filter(p=>p.length);
 }
 const result={floors:[{x:square.x,y:square.y,z:square.z,tile,full:Math.abs(polygons.reduce((n,p)=>n+Math.abs(polygonSignedArea(p)),0)-1)<EPS,polygons}]};
 if(c.results.size>=4096)c.results.clear();c.results.set(key,result);return result;
}
export function groundContains(tile,square,geometry,x,y,properties={}){
 const derived=groundGeometry(tile,square,geometry,properties);return !derived||derived.floors[0].polygons.some(p=>pointInPolygon([x-square.x,y-square.y],p));
}
