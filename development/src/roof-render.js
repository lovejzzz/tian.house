import {clipPolygonToCell} from './polygon-footprint.js';
import {wallMaterialPlane} from './polygon-render.js';
const cache=new WeakMap();
function plane(vertices){const o=vertices[0];for(let i=1;i<vertices.length-1;i++){const a=vertices[i].map((v,k)=>v-o[k]),b=vertices[i+1].map((v,k)=>v-o[k]),d=a[0]*b[1]-b[0]*a[1];if(Math.abs(d)<1e-9)continue;const gx=(a[2]*b[1]-b[2]*a[1])/d,gy=(a[0]*b[2]-b[0]*a[2])/d;return {gx,gy,height:(x,y)=>o[2]+gx*(x-o[0])+gy*(y-o[1])};}throw Error('Invalid roof surface');}
export function roofRenderFaces(geometry){
 if(!geometry)return [];if(cache.has(geometry))return cache.get(geometry);const result=[];
 for(const roof of geometry){
 for(const face of roof.slopes){const p=plane(face.vertices),poly=face.vertices.map(v=>v.slice(0,2));
  for(let x=Math.floor(Math.min(...poly.map(v=>v[0])));x<Math.ceil(Math.max(...poly.map(v=>v[0])));x++)for(let y=Math.floor(Math.min(...poly.map(v=>v[1])));y<Math.ceil(Math.max(...poly.map(v=>v[1])));y++){
   const clipped=clipPolygonToCell(poly,x,y);if(!clipped.length)continue;const vertices=clipped.map(([x,y])=>[x,y,p.height(x,y)]),z=Math.floor(Math.min(...vertices.map(v=>v[2])));result.push({roofId:roof.id,roofFace:{kind:'slope',vertices,tile:roof.surfaceTile,...p},x,y,z,depth:x+y+.5});
  }
 }
 for(const face of roof.closures){const [a,b,tb,ta]=face.vertices,length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(length);
  for(let i=0;i<steps;i++){const at=(v,w,t)=>v.map((x,k)=>x+(w[k]-x)*t),u=i/steps,v=(i+1)/steps,vertices=[at(a,b,u),at(a,b,v),at(ta,tb,v),at(ta,tb,u)],x=(vertices[0][0]+vertices[1][0])/2,y=(vertices[0][1]+vertices[1][1])/2,z=Math.floor(a[2]);result.push({roofId:roof.id,roofFace:{kind:'closure',vertices,tile:roof.closureTile},x,y,z,depth:x+y-.01});}
 }
 }cache.set(geometry,result);return result;
}
function floorMaterial(renderer,tile){
 const region=renderer.atlas.regions[tile];if(!region){renderer.missing.add(tile);return null;}const image=renderer.page(region.page);if(!image)return null;
 renderer.roofMaterials??=new Map();if(renderer.roofMaterials.has(tile))return renderer.roofMaterials.get(tile);
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const c=canvas.getContext('2d'),s=region.scale||1;c.imageSmoothingEnabled=false;
 c.setTransform(1,-1,2,2,0,0);c.drawImage(image,region.x,region.y,region.w,region.h,-32+region.ox/s,-96+region.oy/s,region.w/s,region.h/s);
 renderer.roofMaterials.set(tile,canvas);if(renderer.roofMaterials.size>64)renderer.roofMaterials.delete(renderer.roofMaterials.keys().next().value);return canvas;
}
export function drawRoofFace(renderer,face,alpha=1,brightness=1){
 if(alpha<=.001||brightness<=0)return;
 const c=renderer.ctx,vertices=face.vertices;
 // Closed roof volumes expose only outward faces toward the fixed camera.
 // Back walls otherwise overpaint shallow roof cells as white saw teeth.
 if(face.kind==='closure'){const [a,b]=vertices;if((b[1]-a[1])-(b[0]-a[0])<=1e-9)return;}
 c.save();c.globalAlpha=alpha;c.beginPath();vertices.forEach((v,i)=>{const p=renderer.project(...v);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});c.closePath();c.clip();c.save();
 if(face.kind==='slope'){
  const material=floorMaterial(renderer,face.tile);if(material){const origin=vertices[0],p=renderer.project(...origin);c.transform(.5,(16-96*face.gx)/64,-.5,(16-96*face.gy)/64,p.x,p.y);const pattern=c.createPattern(material,'repeat');pattern.setTransform({a:1,b:0,c:0,d:1,e:-(origin[0]%1)*64,f:-(origin[1]%1)*64});c.fillStyle=pattern;const xs=vertices.map(v=>(v[0]-origin[0])*64),ys=vertices.map(v=>(v[1]-origin[1])*64);c.fillRect(Math.min(...xs)-1,Math.min(...ys)-1,Math.max(...xs)-Math.min(...xs)+2,Math.max(...ys)-Math.min(...ys)+2);}
 }else{
  const [a,b]=vertices,p=renderer.project(...a),q=renderer.project(...b),length=Math.hypot(b[0]-a[0],b[1]-a[1]),props=renderer.world.props(face.tile),material=wallMaterialPlane(renderer,{tile:face.tile,materialAxis:'WallN'in props?'N':'W'},1);
  if(material){c.transform((q.x-p.x)/(64*length),(q.y-p.y)/(64*length),0,-.5,p.x,p.y);c.fillStyle=c.createPattern(material.canvas,'repeat');c.fillRect(0,0,length*64,Math.max(...vertices.map(v=>v[2]-a[2]))*192);}
 }c.restore();if(brightness<1){c.fillStyle=`rgba(0,0,0,${1-brightness})`;c.fill();}c.restore();renderer.drawn++;
}
