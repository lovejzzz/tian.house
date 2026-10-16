// Reusable sewn edging and gravity-draped cloth. Deterministic authored geometry;
// no cloth simulation, source-image reconstruction or new collision barriers.
export function upholsteryTrim({id,materialId='cloth',origin,size,exponent=.45}){
 if(origin?.length!==3||size?.length!==3||!origin.every(Number.isFinite)||!size.every(v=>Number.isFinite(v)&&v>0)||exponent<.25||exponent>1)throw Error('Invalid textile trim');
 const thin=size.indexOf(Math.min(...size)),axes=[0,1,2].filter(i=>i!==thin),radius=Math.min(.003,Math.min(...size)*.035),q=.62,section=(1-q**(2/exponent))**(exponent/2),centers=[],vertices=[],indices=[],N=64,M=6;
 const power=v=>Math.sign(v)*Math.abs(v)**exponent;
 for(let i=0;i<N;i++){const t=i*2*Math.PI/N,p=origin.map((v,k)=>v+size[k]/2);p[thin]+=size[thin]*q/2;p[axes[0]]+=section*(size[axes[0]]/2-radius)*power(Math.cos(t));p[axes[1]]+=section*(size[axes[1]]/2-radius)*power(Math.sin(t));centers.push(p);}
 for(let i=0;i<N;i++){
  const prev=centers[(i+N-1)%N],next=centers[(i+1)%N],a=next[axes[0]]-prev[axes[0]],b=next[axes[1]]-prev[axes[1]],length=Math.hypot(a,b);
  for(let j=0;j<M;j++){const angle=j*2*Math.PI/M,p=[...centers[i]];p[thin]+=radius*Math.sin(angle);p[axes[0]]+=radius*Math.cos(angle)*b/length;p[axes[1]]-=radius*Math.cos(angle)*a/length;vertices.push(p);}
 }
 for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*M+j,b=((i+1)%N)*M+j,c=((i+1)%N)*M+(j+1)%M,d=i*M+(j+1)%M;indices.push(a,b,c,a,c,d);}
 return {id,role:'furniture',materialId,vertices,indices,collision:[],smoothNormals:true,doubleSided:true};
}
export function drapedTextile({id,materialId='linen',x,y,z,width,flatLength,drop,radius=.07}){
 if(![x,y,z,width,flatLength,drop,radius].every(Number.isFinite)||Math.min(width,flatLength,drop,radius)<=0||drop>=z)throw Error('Invalid draped textile');
 const vertices=[],indices=[],nx=20,ny=32,bend=radius*Math.PI/2,length=flatLength+bend+drop;
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
  const u=i/nx,s=j/ny*length,fold=Math.sin(u*Math.PI*6+.25)*.008+Math.sin(u*Math.PI*10+1.2)*.003;let Y,Z;
  if(s<=flatLength){Y=y+s;Z=z+fold;}
  else if(s<flatLength+bend){const a=(s-flatLength)/radius;Y=y+flatLength+radius*Math.sin(a)+fold*Math.sin(a);Z=z-radius*(1-Math.cos(a))+fold*Math.cos(a);}
  else{Y=y+flatLength+radius+fold;Z=z-radius-(s-flatLength-bend);}
  vertices.push([x+u*width,Y,Z]);
 }
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+2,d=a+nx+1;indices.push(a,b,c,a,c,d);}
 return {id,role:'furniture',materialId,vertices,indices,collision:[],smoothNormals:true,doubleSided:true};
}
