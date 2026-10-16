import {convexSolid} from './convex-solid.js';
// Z-up surfaces of revolution. Shade is an open, double-sided shell, not a solid cone.
export function lampVolume(recipe){
 const {height:h,baseRadius:b,baseHeight:bh,stemRadius:s,shadeBottom:z,shadeRadius:r,shadeTopRadius:t,segments:n}=recipe.parameters;
 if(![h,b,bh,s,z,r,t].every(v=>Number.isFinite(v)&&v>0)||!Number.isInteger(n)||n<8||n>64||bh>=z||z>=h||s>=Math.min(b,r,t))throw Error('Invalid lamp recipe dimensions');
 const parts=[];
 function ringPart(id,materialId,lo,hi,ra,rb,capped){
  const vertices=[],indices=[];
  for(const [height,radius] of [[lo,ra],[hi,rb]])for(let i=0;i<n;i++){const a=2*Math.PI*i/n;vertices.push([.5+radius*Math.cos(a),.5+radius*Math.sin(a),height]);}
  for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,j,n+j,i,n+j,n+i);}
  if(capped){for(let i=1;i<n-1;i++)indices.push(0,i+1,i,n,n+i,n+i+1);}
  const part={id,role:'furniture',materialId,vertices,indices,doubleSided:!capped,collision:[]};
  if(capped)part.collision=[convexSolid(part)];parts.push(part);
 }
 ringPart('base','brass',0,bh,b,b*.92,true);
 ringPart('stem','brass',bh,z+.05,s,s,true);
 ringPart('bulb','bulb',z+.04,z+.12,.035,.025,true);
 parts.at(-1).castShadow=false;
 ringPart('shade','linen',z,h,r,t,false);
 // Aperture proxies split the existing output between the open shade ends.
 // This is not measured fabric transmission or an IES distribution.
 const up={type:'spot',position:[.5,.5,h+.015],target:[.5,.5,h+1],color:0xffdca4,intensity:2,distance:4,angle:1.2,penumbra:1,decay:2,samples:[[-t*.45,0,0],[t*.45,0,0]]};
 return {parts,additionalLights:[up],light:{type:'spot',position:[.5,.5,z-.015],target:[.5,.5,0],color:0xffdca4,intensity:6,distance:4,angle:1.2,penumbra:1,decay:2,samples:[[-r*.45,0,0],[0,-r*.45,0],[0,r*.45,0],[r*.45,0,0]]},support:{mount:recipe.semantics.mount}};
}
