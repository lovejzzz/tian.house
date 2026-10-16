import {appendSlabPolygon} from './scene-slab-volumes.js';
import {convexSolid} from './convex-solid.js';
// Reusable open-frame furniture: individual parts preserve the spaces between them.
export function frameFurnitureVolume(recipe){
 const {width:w,depth:d,height:h,member:m}=recipe.parameters,parts=[];
 if(![w,d,h,m].every(v=>Number.isFinite(v)&&v>0)||m*4>=Math.min(w,d,h))throw Error('Invalid frame dimensions');
 const box=(id,materialId,x,y,z,W,D,H)=>{
  if(![W,D,H].every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid furniture part');
  const mesh={id,role:'furniture',materialId,vertices:[],indices:[],collision:[]};appendSlabPolygon(mesh,[[x,y],[x+W,y],[x+W,y+D],[x,y+D]],z,z+H);mesh.collision=[convexSolid(mesh)];parts.push(mesh);
 };
 if(recipe.semantics.kind==='chair'){
  const {seatHeight:seat,seatThickness:t,backSlats:n}=recipe.parameters;
  if(!Number.isFinite(seat)||!Number.isFinite(t)||seat<=t||seat+t>=h||!Number.isInteger(n)||n<1||n>12)throw Error('Invalid chair dimensions');
  box('seat','timber',0,0,seat-t,w,d,t);
  for(const [i,x]of [m,w-2*m].entries())for(const [j,y]of [m,d-2*m].entries())box(`leg:${i}:${j}`,'timber',x,y,0,m,m,seat-t);
  for(const [i,x]of [m,w-2*m].entries())box(`back-post:${i}`,'timber',x,m,seat,m,m,h-seat);
  box('back-rail','timber',m,m,h-m,w-2*m,m,m);
  for(let i=0;i<n;i++)box(`back-slat:${i}`,'timber',2*m+(w-4*m)*(i+.5)/n-m/3,m,seat+m,m*2/3,m/2,h-seat-2*m);
  for(const [i,x]of [m,w-2*m].entries())box(`stretcher:${i}`,'timber',x,m,seat*.4,m,d-2*m,m);
 }else if(recipe.semantics.kind==='bench'){
  const seat=recipe.parameters.seatHeight;
  if(!Number.isFinite(seat)||seat<=m||seat>=h-3*m)throw Error('Invalid bench seat height');
  for(const [i,x]of [m,w-2*m].entries()){
   box(`front-leg:${i}`,'steel',x,d-2*m,0,m,m,seat);
   box(`back-leg:${i}`,'steel',x,m,0,m,m,h);
   box(`seat-rail:${i}`,'steel',x,m,seat-2*m,m,d-2*m,m);
  }
  for(let i=0;i<4;i++)box(`seat-slat:${i}`,'timber',0,i*d/4,seat-m,w,d/4-.015,m);
  for(let i=0;i<3;i++)box(`back-slat:${i}`,'timber',0,0,seat+.1+i*(h-seat-.15)/3,w,m,(h-seat-.15)/3-.015);
 }else if(recipe.semantics.kind==='shelf'){
  const {shelves:n,shelfThickness:t}=recipe.parameters;
  if(!Number.isInteger(n)||n<2||n>12||!Number.isFinite(t)||t<=0||n*t>=h)throw Error('Invalid shelf dimensions');
  for(const [i,x]of [0,w-m].entries())for(const [j,y]of [0,d-m].entries())box(`upright:${i}:${j}`,'steel',x,y,0,m,m,h);
  for(let i=0;i<n;i++){
   const z=.12+(h-.12-t)*i/(n-1);box(`shelf:${i}`,'steel',m,m,z,w-2*m,d-2*m,t);
   box(`front-lip:${i}`,'steel',m,d-2*m,z-t,w-2*m,m,t);
  }
 }else throw Error('Unsupported frame family');
 return {parts};
}
