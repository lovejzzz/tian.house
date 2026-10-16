import {drawThreshold} from './door-threshold.js';
import {drawGlazingPlane} from './fixed-glazing.js';
import {barricadeSprite} from './barricades.js';
import {windowSprite} from './windows.js';
import {openingSpan} from './diagonal-openings.js';
import {windowSurroundRectangles} from './window-profile.js';
const floorKey=(x,y,z,tile)=>`${x},${y},${z}:${tile}`;
const indexes=new WeakMap();
function floorIndex(geometry){if(!geometry)return null;if(!indexes.has(geometry)){const index=new Map();for(const f of geometry.floors){const k=floorKey(f.x,f.y,f.z,f.tile);if(!index.has(k))index.set(k,[]);index.get(k).push(f);}indexes.set(geometry,index);}return indexes.get(geometry);}
export function drawPolygonFloor(renderer,tile,square,alpha=1,brightness=1,geometry,drawZ=square.z){
 const {x,y,z}=square,parts=floorIndex(geometry)?.get(floorKey(x,y,z,tile)),point=renderer.project(x,y,drawZ);
 if(!parts||parts.some(p=>p.full)){renderer.sprite(tile,point.x,point.y,alpha,brightness);return;}
 const c=renderer.ctx;c.save();c.beginPath();for(const part of parts)for(const polygon of part.polygons){polygon.forEach(([u,v],i)=>{const p=renderer.project(x+u,y+v,drawZ);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});c.closePath();}c.clip();renderer.sprite(tile,point.x,point.y,alpha,brightness);c.restore();
}
export function wallPlaneTransform(wall,project){
 const a=project(...wall.a,wall.z),b=project(...wall.b,wall.z),length=Math.hypot(wall.b[0]-wall.a[0],wall.b[1]-wall.a[1]);
 return {a,b,length,matrix:[(b.x-a.x)/(64*length),(b.y-a.y)/(64*length),0,.5,a.x,a.y-96],width:length*64,height:192};
}
export function wallMaterialPlane(renderer,wall,brightness){
 const region=renderer.atlas.regions[wall.tile];if(!region){renderer.missing.add(wall.tile);return null;}const image=renderer.page(region.page);if(!image)return null;
 renderer.wallPlanes??=new Map();const key=[wall.tile,wall.materialAxis,Math.round(brightness*32)].join(':');if(renderer.wallPlanes.has(key))return renderer.wallPlanes.get(key);
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=192;const c=canvas.getContext('2d'),sign=wall.materialAxis==='N'?1:-1,s=region.scale||1;
 // Unproject a source N/W face into its physical material plane. This keeps
 // brick spacing constant when the new segment is sqrt(2) cells long.
 c.setTransform(sign*2,-1/sign,0,2,0,192);c.imageSmoothingEnabled=false;c.drawImage(image,region.x,region.y,region.w,region.h,-32+region.ox/s,-96+region.oy/s,region.w/s,region.h/s);
 c.setTransform(1,0,0,1,0,0);c.drawImage(canvas,2,0,1,192,0,0,2,192);c.drawImage(canvas,61,0,1,192,62,0,2,192);if(brightness<1){c.globalCompositeOperation='source-atop';c.fillStyle=`rgba(0,0,0,${1-brightness})`;c.fillRect(0,0,64,192);}
 const pixel=c.getImageData(32,96,1,1).data,result={canvas,edge:`rgb(${pixel[0]},${pixel[1]},${pixel[2]})`};renderer.wallPlanes.set(key,result);if(renderer.wallPlanes.size>128)renderer.wallPlanes.delete(renderer.wallPlanes.keys().next().value);return result;
}
export function drawPolygonWall(renderer,wall,alpha=1,brightness=1,state={}){
 if(alpha<=0||brightness<=0)return;drawThreshold(renderer,wall,alpha,brightness);const plane=wallMaterialPlane(renderer,wall.opening?.fixed?{...wall,tile:wall.opening.tile}:wall,brightness);if(!plane)return;const c=renderer.ctx,{a,b,matrix,width,height}=wallPlaneTransform(wall,(...p)=>renderer.project(...p));c.save();c.globalAlpha=alpha*(renderer.layerAlpha??1);
 if(Math.abs(b.x-a.x)<1e-8){c.strokeStyle=plane.edge;c.lineWidth=1.2;c.beginPath();c.moveTo(a.x,Math.min(a.y,b.y)-96);c.lineTo(a.x,Math.max(a.y,b.y));c.stroke();}
 else if(wall.opening?.fixed){c.transform(...matrix);drawGlazingPlane(c,plane.canvas,width,height);}
 else{c.transform(...matrix);const pattern=c.createPattern(plane.canvas,'repeat');pattern.setTransform({a:1,b:0,c:0,d:1,e:wall.axis?.startsWith('D')?-((wall.a[0]*Math.SQRT2)%1)*64:0,f:0});c.fillStyle=pattern;
  if(!wall.opening)c.fillRect(0,0,width,height);
  else{
   const profile=wall.opening.profile,leafWidth=profile?64:wall.opening.width*64,left=(width-leafWidth)/2;
   if(profile)for(const [x,y,w,h]of windowSurroundRectangles(profile,width/64))c.fillRect(x*64,y*height,w*64,h*height);
   else{c.fillRect(0,0,left,height);c.fillRect(left+leafWidth,0,left,height);}
   const frame=wall.opening.frame&&wallMaterialPlane(renderer,{...wall,tile:wall.opening.frame},brightness),leaf=!state.destroyed&&(wall.opening.kind==='window'||!state.open)&&wallMaterialPlane(renderer,{...wall,tile:wall.opening.kind==='window'?windowSprite(wall.opening.tile,wall.opening.properties||{},state):wall.opening.tile},brightness);
   if(wall.opening.threshold){if(leaf)c.drawImage(leaf.canvas,left,0,leafWidth,height-wall.opening.threshold.height*2);if(frame)c.drawImage(frame.canvas,left,0,leafWidth,height);}else{if(frame)c.drawImage(frame.canvas,left,0,leafWidth,height);if(leaf)c.drawImage(leaf.canvas,left,0,leafWidth,height);}
   if(wall.opening.kind==='window')for(const side of ['opposite','same']){const tile=barricadeSprite(wall.materialAxis,state.barricades?.[side]),boards=tile&&wallMaterialPlane(renderer,{...wall,tile},brightness);if(boards)c.drawImage(boards.canvas,left,0,leafWidth,height);}
  }
 }c.restore();
 if(wall.opening?.kind==='door'&&state.open&&!state.destroyed){
  const span=openingSpan(wall),leaf=wallMaterialPlane(renderer,{...wall,tile:wall.opening.tile},brightness),hinge=wall.opening.hinge==='end'?span.b:span.a,swing={...wall,a:hinge,b:[hinge[0]+span.normal[0]*span.width,hinge[1]+span.normal[1]*span.width]},placement=wallPlaneTransform(swing,(...p)=>renderer.project(...p));
  if(leaf){c.save();c.globalAlpha=alpha*(renderer.layerAlpha??1);if(Math.abs(placement.a.x-placement.b.x)<1e-8){c.strokeStyle=leaf.edge;c.lineWidth=1.2;c.beginPath();c.moveTo(placement.a.x,Math.min(placement.a.y,placement.b.y)-84);c.lineTo(placement.a.x,Math.max(placement.a.y,placement.b.y)-(wall.opening.threshold?.height||0));c.stroke();}else{c.transform(...placement.matrix);const profile=wall.opening.profile;if(wall.opening.hinge==='end'){c.translate(placement.width,0);c.scale(-1,1);}if(profile){const [l,t,r,b]=profile;c.drawImage(leaf.canvas,l*64,t*192,(r-l)*64,(b-t)*192,0,t*192,placement.width,(b-t)*192);}else c.drawImage(leaf.canvas,0,0,placement.width,192-(wall.opening.threshold?.height||0)*2);}c.restore();}
 }
 renderer.drawn++;
}
export const polygonWallObjects=(geometry,z)=>(geometry?.walls||[]).filter(w=>w.z===z).map(w=>({x:w.x,y:w.y,z:w.z,polygonWall:w,depth:(w.a[0]+w.a[1]+w.b[0]+w.b[1])/2-(['N','W'].includes(w.axis)?.01:0)}));
