import {appendSlabPolygon} from './scene-slab-volumes.js';
import {convexSolid} from './convex-solid.js';
export function tableVolume(recipe){
 const {width:w,depth:d,height:h,topThickness:top,cornerCut:c,legWidth:leg,legInset:inset,apronHeight:apron}=recipe.parameters;
 if(![w,d,h,top,c,leg,inset,apron].every(v=>Number.isFinite(v)&&v>0)||top+apron>=h||2*(inset+leg)>=Math.min(w,d)||c>=Math.min(w,d)/2)throw Error('Invalid table recipe dimensions');
 const parts=[];
 const add=(name,polygon,bottom,upper,taper=false)=>{
  const mesh={id:name,role:'furniture',materialId:'timber',vertices:[],indices:[],collision:[]};appendSlabPolygon(mesh,polygon,bottom,upper);
  if(taper){const cx=polygon.reduce((s,p)=>s+p[0],0)/polygon.length,cy=polygon.reduce((s,p)=>s+p[1],0)/polygon.length;mesh.vertices=mesh.vertices.map(([x,y,z])=>z===bottom?[cx+(x-cx)*.72,cy+(y-cy)*.72,z]:[x,y,z]);}
  mesh.collision=[convexSolid(mesh)];parts.push(mesh);
 };
 const box=(name,x,y,W,D,z,Z,taper=false)=>add(name,[[x,y],[x+W,y],[x+W,y+D],[x,y+D]],z,Z,taper);
 add('top',[[c,0],[w-c,0],[w,c],[w,d-c],[w-c,d],[c,d],[0,d-c],[0,c]],h-top,h);
 for(const [i,x]of [inset,w-inset-leg].entries())for(const [j,y]of [inset,d-inset-leg].entries())box(`leg:${i}:${j}`,x,y,leg,leg,0,h-top,true);
 for(const [i,y]of [inset,d-inset-leg].entries())box(`apron:long:${i}`,inset+leg,y,w-2*(inset+leg),leg,h-top-apron,h-top);
 for(const [i,x]of [inset,w-inset-leg].entries())box(`apron:short:${i}`,x,inset+leg,leg,d-2*(inset+leg),h-top-apron,h-top);
 return {parts,support:{height:h,polygon:[[0,0],[w,0],[w,d],[0,d]]}};
}
