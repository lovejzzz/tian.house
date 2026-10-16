import {pointInPolygon,clipPolygonToCell,convexIntersectionPolygon,polygonSignedArea} from './polygon-footprint.js';
const EPS=1e-8,key=(x,y)=>`${Math.floor(x)},${Math.floor(y)}`;
function surface(face,roofId){
 const vertices=face.vertices,origin=vertices[0];let gx,gy;
 for(let i=1;i<vertices.length-1;i++){
  const a=vertices[i].map((v,k)=>v-origin[k]),b=vertices[i+1].map((v,k)=>v-origin[k]),det=a[0]*b[1]-b[0]*a[1];
  if(Math.abs(det)<EPS)continue;gx=(a[2]*b[1]-b[2]*a[1])/det;gy=(a[0]*b[2]-b[0]*a[2])/det;break;
 }
 if(gx===undefined)throw Error('Roof surface has no horizontal area');
 return {roofId,polygon:vertices.map(p=>p.slice(0,2)),height:(x,y)=>origin[2]+gx*(x-origin[0])+gy*(y-origin[1])};
}
// Shared actual surface geometry, indexed by footprint cell; neither eave
// bounding boxes nor integer level bands can decide shelter for sloping roofs.
export class RoofRuntime {
 constructor(geometry=[]){
  this.cells=new Map();
  for(const roof of geometry)for(const face of roof.slopes){
   const f=surface(face,roof.id),xs=f.polygon.map(p=>p[0]),ys=f.polygon.map(p=>p[1]);
   for(let x=Math.floor(Math.min(...xs));x<=Math.floor(Math.max(...xs));x++)for(let y=Math.floor(Math.min(...ys));y<=Math.floor(Math.max(...ys));y++){
    const polygon=clipPolygonToCell(f.polygon,x,y);if(!polygon.length)continue;const k=key(x,y);if(!this.cells.has(k))this.cells.set(k,[]);this.cells.get(k).push({...f,polygon});
   }
  }
 }
 heights(x,y){return (this.cells.get(key(x,y))||[]).filter(f=>pointInPolygon([x,y],f.polygon)).map(f=>f.height(x,y));}
 shelters(x,y,z){return this.heights(x,y).some(height=>height>z+EPS);}
 intersectsFloor(polygon,z,x,y){
  for(const surface of this.cells.get(key(x,y))||[]){
   const intersection=convexIntersectionPolygon(surface.polygon,polygon);if(Math.abs(polygonSignedArea(intersection))<=EPS)continue;
   const heights=intersection.map(p=>surface.height(...p));
   if(Math.min(...heights)<=z+EPS&&Math.max(...heights)>=z-EPS)return surface.roofId;
  }return null;
 }
}
export function validateRoofFloorIntersections(plan,properties){
 if(!plan.roofGeometry?.length)return;
 const runtime=new RoofRuntime(plan.roofGeometry),partial=new Map();
 for(const f of plan.polygonGeometry?.floors||[]){const k=`${f.x},${f.y},${f.z}:${f.tile}`;if(!partial.has(k))partial.set(k,[]);partial.get(k).push(f);}
 for(const square of plan.squares)for(const tile of square.tiles){
  if(!('solidfloor'in(properties[tile]||{}))||'FloorOverlay'in(properties[tile]||{}))continue;
  const {x,y,z}=square,parts=partial.get(`${x},${y},${z}:${tile}`),polygons=parts?.length?parts.flatMap(f=>f.polygons.map(p=>p.map(([u,v])=>[x+u,y+v]))):[[[x,y],[x+1,y],[x+1,y+1],[x,y+1]]];
  if(polygons.some(p=>runtime.intersectsFloor(p,z,x,y)))throw Error('Roof surface intersects an existing floor');
 }
}
