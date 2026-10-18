import {appendSlabPolygon} from './scene-slab-volumes.js?v=1d7ffb1877ce';import {convexSolid} from './convex-solid.js?v=1d7ffb1877ce';
import {lathe,boxProxy} from './detail-geometry.js?v=1d7ffb1877ce';
// A hollow tapered pot with thick, ridged leaves, not crossed image planes.
export function plantVolume(recipe){
 const {radius:r,potHeight:h,leafHeight:H,leaves:n,seed}=recipe.parameters,parts=[];
 if(![r,h,H].every(v=>Number.isFinite(v)&&v>0)||!Number.isInteger(n)||n<4||n>32||!Number.isInteger(seed)||r<.08)throw Error('Invalid plant dimensions');
 const add=(id,materialId,vertices,indices,collision=true)=>{const m={id,role:'furniture',materialId,vertices,indices,collision:[]};if(collision)m.collision=[convexSolid(m)];parts.push(m);};
 // Turned terracotta pot: foot ring, tapered wall, rolled rim, visible inner wall.
 parts.push(lathe('pot','terracotta',[.5,.5],[[r*.66,0],[r*.7,.008],[r*.72,.03],[r*.97,h-.035],[r*1.02,h-.03],[r*1.03,h-.008],[r*1.0,h],[r*.93,h],[r*.92,h-.03],[r*.7,.06],[0,.06]],{segments:40}));
 // Hollow pot physically: a ring of wall blocks and the floor, interior left open.
 parts[parts.length-1].collision=[...Array.from({length:16},(_,i)=>{const t=i*Math.PI/8,R=r*.9,x=.5+Math.cos(t)*R,y=.5+Math.sin(t)*R;return boxProxy(x-.03,y-.03,0,.06,.06,h);}),boxProxy(.5-r*.6,.5-r*.6,0,r*1.2,r*1.2,.06)];
 parts.push(lathe('soil','soil',[.5,.5],[[r*.9,h-.06],[r*.5,h-.052],[0,h-.05]],{segments:32,capBottom:false,capTop:false,collision:false}));
 // Snake-plant leaves: thick lens-section straps that taper, bend and twist.
 for(let i=0;i<n;i++){
  const a=i*2.399963+seed*.13,reach=r*(.35+.45*(i%3)/2),height=H*(.65+.35*((i*7)%11)/10),dx=Math.cos(a),dy=Math.sin(a),W=.028+.01*((i*5)%3),T=.006,steps=9;
  const vertices=[],indices=[];
  for(let k=0;k<=steps;k++){
   const t=k/steps,cx=.5+dx*(r*.15+reach*t*t),cy=.5+dy*(r*.15+reach*t*t),cz=h-.06+height*t,w=W*Math.sin(Math.PI*Math.min(1,.12+t*.95))*(k===steps?0:1),twist=a+Math.PI/2+.5*t;
   const ux=Math.cos(twist),uy=Math.sin(twist),nx=-uy,ny=ux;
   vertices.push([cx-ux*w,cy-uy*w,cz],[cx+nx*T,cy+ny*T,cz],[cx+ux*w,cy+uy*w,cz],[cx-nx*T,cy-ny*T,cz]);
  }
  for(let k=0;k<steps;k++)for(let j=0;j<4;j++){const A=k*4+j,B=k*4+(j+1)%4,C=A+4,D=B+4;indices.push(A,B,D,A,D,C);}
  const leaf={id:'leaf:'+i,role:'furniture',materialId:i%3===0?'leaf-light':'leaf',vertices,indices,collision:[],smoothNormals:true,doubleSided:true};parts.push(leaf);
 }
 return {parts};
}
