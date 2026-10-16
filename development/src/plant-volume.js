import {appendSlabPolygon} from './scene-slab-volumes.js';import {convexSolid} from './convex-solid.js';
// A hollow tapered pot with thick, ridged leaves, not crossed image planes.
export function plantVolume(recipe){
 const {radius:r,potHeight:h,leafHeight:H,leaves:n,seed}=recipe.parameters,parts=[];
 if(![r,h,H].every(v=>Number.isFinite(v)&&v>0)||!Number.isInteger(n)||n<4||n>32||!Number.isInteger(seed)||r<.08)throw Error('Invalid plant dimensions');
 const add=(id,materialId,vertices,indices,collision=true)=>{const m={id,role:'furniture',materialId,vertices,indices,collision:[]};if(collision)m.collision=[convexSolid(m)];parts.push(m);};
 for(let i=0;i<20;i++){
  const a=i*Math.PI/10,b=(i+1)*Math.PI/10,p=(R,t,z)=>[.5+R*Math.cos(t),.5+R*Math.sin(t),z];
  const vertices=[p(r*.72,a,0),p(r*.72,b,0),p(r,a,h),p(r,b,h),p(r-.025,a,h),p(r-.025,b,h),p(r*.72-.025,a,.035),p(r*.72-.025,b,.035)];
  add('pot:'+i,'terracotta',vertices,[0,1,3,0,3,2,2,3,5,2,5,4,4,5,7,4,7,6,6,7,1,6,1,0,0,2,4,0,4,6,1,7,5,1,5,3]);
 }
 const soil={id:'soil',role:'furniture',materialId:'soil',vertices:[],indices:[],collision:[]};
 appendSlabPolygon(soil,Array.from({length:20},(_,i)=>[.5+(r-.03)*Math.cos(i*Math.PI/10),.5+(r-.03)*Math.sin(i*Math.PI/10)]),h-.08,h-.055);soil.collision=[convexSolid(soil)];parts.push(soil);
 for(let i=0;i<n;i++){
  const a=i*2.399963+seed*.13,reach=r*(.5+.5*(i%3)/2),height=H*(.65+.35*((i*7)%11)/10),dx=Math.cos(a),dy=Math.sin(a),width=.035;
  const base=[.5+dx*r*.15,.5+dy*r*.15,h-.06],tip=[.5+dx*reach,.5+dy*reach,h+height],mid=[.5+dx*reach*.8,.5+dy*reach*.8,h+height*.55];
  const vertices=[base,[mid[0]-dy*width,mid[1]+dx*width,mid[2]],tip,[mid[0]+dy*width,mid[1]-dx*width,mid[2]],[mid[0]+dx*.012,mid[1]+dy*.012,mid[2]],[mid[0]-dx*.012,mid[1]-dy*.012,mid[2]]];
  add('leaf:'+i,i%3===0?'leaf-light':'leaf',vertices,[0,1,4,1,2,4,2,3,4,3,0,4,1,0,5,2,1,5,3,2,5,0,3,5],false);
 }
 return {parts};
}
