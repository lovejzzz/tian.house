import {pointInPolygon} from './polygon-footprint.js';

// Integer orthogonal/45-degree boundaries partition a grid cell into these four
// sectors. Their centres are interior probes, never points on either diagonal.
const sectors=[[[0,0],[1,0],[.5,.5]],[[1,0],[1,1],[.5,.5]],[[1,1],[0,1],[.5,.5]],[[0,1],[0,0],[.5,.5]]];
const probes=sectors.map(p=>[p.reduce((s,v)=>s+v[0],0)/3,p.reduce((s,v)=>s+v[1],0)/3]);
const square=[[0,0],[1,0],[1,1],[0,1]];
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function hull(points){
 const sorted=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]).filter((p,i,a)=>!i||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]);
 const half=list=>{const out=[];for(const p of list){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
 return half(sorted).slice(0,-1).concat(half([...sorted].reverse()).slice(0,-1));
}
const templates=new Map();
function expandedTemplate(mask,distance){
 const key=mask+':'+distance;if(templates.has(key))return templates.get(key);
 // Minkowski sum with the grid-aligned eave square, not a union of integer
 // translations (which leaves holes between diagonally adjacent fragments).
 const pieces=sectors.filter((_,i)=>mask&(1<<i)).map(p=>hull(p.flatMap(v=>[[-distance,-distance],[distance,-distance],[distance,distance],[-distance,distance]].map(d=>[v[0]+d[0],v[1]+d[1]]))));
 const result=[];for(let x=-distance;x<=distance;x++)for(let y=-distance;y<=distance;y++){
  const bits=probes.reduce((m,p,i)=>m|(pieces.some(poly=>pointInPolygon([p[0]+x,p[1]+y],poly))?1<<i:0),0);
  if(bits)result.push({x,y,bits});
 }templates.set(key,result);return result;
}

// Dilation distributes over the source cell fragments. OR-ing sector masks
// computes their exact union, including concave corners, without double area.
// This assumes the validated grid/45-degree geometry, not arbitrary polygons.
export function polygonRoofFootprint(cells,overhang){
 if(!Number.isInteger(overhang)||overhang<0||overhang>2)throw Error('Choose a roof overhang from zero to two cells');
 const result=new Map();for(const cell of cells){
  const mask=cell.full?15:probes.reduce((m,p,i)=>m|(cell.polygons.some(poly=>pointInPolygon(p,poly))?1<<i:0),0);
  for(const part of expandedTemplate(mask,overhang)){const x=cell.x+part.x,y=cell.y+part.y,key=x+','+y,old=result.get(key);if(old)old.bits|=part.bits;else result.set(key,{x,y,bits:part.bits});}
 }
 return [...result.values()].sort((a,b)=>a.x-b.x||a.y-b.y).map(({x,y,bits})=>{
  const full=bits===15,polygons=full?[square]:sectors.filter((_,i)=>bits&(1<<i));
  return {x,y,full,area:full?1:polygons.length/4,polygons:structuredClone(polygons)};
 });
}
