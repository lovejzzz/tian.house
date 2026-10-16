import {groundGeometry,groundContains} from './ground-footprint.js';
import {groundHeight,supportedGroundSquare} from './ground-height.js';
// Cardinal faces of full-cell platforms. Polygon-cell integration remains separate;
// callers must not substitute a square face for a clipped footprint.
export function groundBoundaryFaces(square,properties,lookup,geometry){
 if(geometry||[square,lookup(square.x+1,square.y,square.z),lookup(square.x,square.y+1,square.z)].some(s=>s?.tiles.some(t=>properties[t]?.TianGroundPolygon)))return clippedBoundaryFaces(square,properties,lookup,geometry);
 const top=groundHeight(square,properties);if(!top)return [];
 const {x,y,z}=square,faces=[];
 for(const edge of [
  {axis:'E',neighbor:[x+1,y],a:[x+1,y],b:[x+1,y+1]},
  {axis:'S',neighbor:[x,y+1],a:[x+1,y+1],b:[x,y+1]}
 ]){
  const bottom=groundHeight(lookup(...edge.neighbor,z),properties);
  if(top<=bottom)continue;
  faces.push({axis:edge.axis,vertices:[...[[edge.a,bottom],[edge.b,bottom],[edge.b,top],[edge.a,top]].map(([p,h])=>[...p,z+h/96])],height:top-bottom});
 }
 return faces;
}
export function drawGroundBoundary(renderer,tile,square,alpha,brightness,drawZ=square.z,geometry){
 const properties=renderer.world.properties,active=supportedGroundSquare(renderer.world,square);
 if(!groundHeight({tiles:[tile]},properties)||groundHeight({tiles:[tile]},properties)!==groundHeight(active,properties))return;
 const faces=groundBoundaryFaces(active,properties,(x,y,z)=>supportedGroundSquare(renderer.world,renderer.world.square(x,y,z)),geometry);
 const c=renderer.ctx,delta=drawZ-square.z;c.save();c.globalAlpha=alpha*(renderer.layerAlpha??1);
 for(const face of faces){
  const value=Math.round((face.axis==='E'?128:106)*brightness);c.fillStyle=`rgb(${value},${value},${value})`;c.beginPath();
  face.vertices.forEach(([x,y,z],i)=>{const p=renderer.project(x,y,z+delta);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});c.closePath();c.fill();
 }
 c.restore();
}

function clippedBoundaryFaces(square,properties,lookup,geometry){
 const top=groundHeight(square,properties);if(!top)return [];
 const tile=square.tiles.find(t=>groundHeight({tiles:[t]},properties)===top),{x,y,z}=square;
 const polygons=(groundGeometry(tile,square,geometry,properties)?.floors[0].polygons||[[[0,0],[1,0],[1,1],[0,1]]]).map(p=>p.map(([u,v])=>[x+u,y+v]));
 const cutters=[];
 for(let xx=x-1;xx<=x+1;xx++)for(let yy=y-1;yy<=y+1;yy++){
  const cell=lookup(xx,yy,z);if(!cell)continue;
  for(const t of cell.tiles)if(groundHeight({tiles:[t]},properties))for(const p of (groundGeometry(t,cell,geometry,properties)?.floors[0].polygons||[[[0,0],[1,0],[1,1],[0,1]]]))cutters.push(p.map(([u,v])=>[xx+u,yy+v]));
 }
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],faces=[];
 const heightAt=(xx,yy)=>{const cell=lookup(Math.floor(xx),Math.floor(yy),z);return cell?groundHeight(cell,properties,t=>groundContains(t,cell,geometry,xx,yy,properties)):0;};
 for(const poly of polygons)for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],d=sub(b,a),length=Math.hypot(...d);
  if(length<1e-8||d[1]-d[0]<=1e-8)continue;
  const breaks=[0,1];
  for(const cutter of cutters)for(let j=0;j<cutter.length;j++){
   const c=cutter[j],e=sub(cutter[(j+1)%cutter.length],c),q=sub(c,a),den=cross(d,e);
   if(Math.abs(den)>1e-9){const t=cross(q,e)/den,u=cross(q,d)/den;if(t>1e-8&&t<1-1e-8&&u>=-1e-8&&u<=1+1e-8)breaks.push(t);}
   else if(Math.abs(cross(q,d))<1e-8){const t=(q[0]*d[0]+q[1]*d[1])/(length*length);if(t>1e-8&&t<1-1e-8)breaks.push(t);}
  }
  const sorted=[...new Set(breaks)].sort((a,b)=>a-b);
  for(let j=0;j<sorted.length-1;j++){
   const lo=sorted[j],hi=sorted[j+1];if(hi-lo<1e-8)continue;
   const mid=(lo+hi)/2,epsilon=1e-6,bottom=heightAt(a[0]+d[0]*mid+d[1]/length*epsilon,a[1]+d[1]*mid-d[0]/length*epsilon);
   if(bottom>=top)continue;
   const start=[a[0]+d[0]*lo,a[1]+d[1]*lo],end=[a[0]+d[0]*hi,a[1]+d[1]*hi];
   faces.push({axis:Math.abs(d[0])<1e-8?'E':Math.abs(d[1])<1e-8?'S':'D',height:top-bottom,vertices:[[...start,z+bottom/96],[...end,z+bottom/96],[...end,z+top/96],[...start,z+top/96]]});
  }
 }
 return faces;
}
