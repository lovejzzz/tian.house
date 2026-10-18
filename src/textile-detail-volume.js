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
 return {id,role:'furniture',materialId,vertices,indices,collision:[],smoothNormals:true,doubleSided:true,castShadow:false};
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

// A sewn pillow: two faces whose loft falls to a flat seam all round, with
// pinched "ears" at the corners, a slight head dent and soft surface rumple.
export function pillowVolume({id,materialId='linen',origin,size,dent=.25,seed=1}){
 if(origin?.length!==3||size?.length!==3||!origin.every(Number.isFinite)||!size.every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid pillow');
 const [W,D,H]=size,N=40,M=26,vertices=[],indices=[],cx=origin[0]+W/2,cy=origin[1]+D/2,cz=origin[2]+H/2;
 const rumple=(u,v)=>.035*Math.sin(u*7.1+seed)*Math.sin(v*5.3+seed*.7)+.02*Math.sin(u*13.7+v*9.1+seed*1.9);
 for(const side of [1,-1])for(let j=0;j<=M;j++)for(let i=0;i<=N;i++){
  const u=-1+2*i/N,v=-1+2*j/M;
  // Corners pull in (ears); the edge itself is the seam line at mid-height.
  const ear=1-.1*Math.abs(u*v)**2;
  const loft=Math.pow(Math.max(0,1-Math.abs(u)**2.6),.55)*Math.pow(Math.max(0,1-Math.abs(v)**2.6),.55);
  const head=side>0?dent*Math.exp(-((u*1.3)**2+(v*1.6)**2)*2.2):0;
  const z=cz+side*(H/2)*loft*(1-head+rumple(u,v)*loft);
  vertices.push([cx+u*W/2*ear,cy+v*D/2*ear,z]);
 }
 const stride=N+1,face=(M+1)*stride;
 for(let f=0;f<2;f++)for(let j=0;j<M;j++)for(let i=0;i<N;i++){const a=f*face+j*stride+i,b=a+1,c=a+stride+1,d=a+stride;if(f===0)indices.push(a,b,c,a,c,d);else indices.push(a,c,b,a,d,c);}
 return {id,role:'furniture',materialId,vertices,indices,collision:[],nonblocking:true,smoothNormals:true,doubleSided:true,castShadow:false};
}

// Quilted duvet lying on a mattress and falling over both sides and the foot:
// one continuous surface along an across-profile (side drop, corner roll, top) and
// an along-profile (top, roll, foot drop), with channel quilting and loose rumples.
export function quiltedDuvet({id,materialId='cloth',x,y,z,width,length,sideDrop,footDrop,radius=.06,loft=.035,quilt=.3,seed=3}){
 if(![x,y,z,width,length,sideDrop,footDrop,radius,loft,quilt].every(Number.isFinite)||Math.min(width,length,sideDrop,footDrop,radius,quilt)<=0)throw Error('Invalid quilted duvet');
 const bend=radius*Math.PI/2;
 // profile(s): distance s along a cross-section -> [offset outward, drop down]
 const profile=(s,flat)=>{if(s<0){const a=Math.min(-s/radius,Math.PI/2);return -s<=bend?[radius*Math.sin(a),radius*(1-Math.cos(a))]:[radius,radius+(-s-bend)];}if(s>flat){const t=s-flat,a=Math.min(t/radius,Math.PI/2);return t<=bend?[flat+radius*Math.sin(a),radius*(1-Math.cos(a))]:[flat+radius,radius+(t-bend)];}return [s,0];};
 const across=[-(bend+sideDrop),width+bend+sideDrop],along=[0,length+bend+footDrop],N=72,M=84,vertices=[],indices=[];
 for(let j=0;j<=M;j++)for(let i=0;i<=N;i++){
  const s=across[0]+(across[1]-across[0])*i/N,t=along[0]+(along[1]-along[0])*j/M;
  const [px,dx]=profile(s,width),[py,dy]=profile(t,length);
  const onTop=s>=0&&s<=width&&t<=length;
  // Channel quilting: soft puffs between stitched lines across the bed.
  const puff=onTop?loft*(.55+.45*Math.abs(Math.sin(Math.PI*t/quilt)))*Math.min(1,s/.05,(width-s)/.05,1):loft*.6;
  const rumple=.006*Math.sin(s*9+seed)*Math.sin(t*6.3+seed*.4)+.004*Math.sin(s*23+t*17+seed);
  const xx=s<0?x-(px):s>width?x+px:x+s,yy=t>length?y+py:y+t;
  vertices.push([xx,yy,z+puff-dx-dy+rumple]);
 }
 const stride=N+1;
 for(let j=0;j<M;j++)for(let i=0;i<N;i++){const a=j*stride+i,b=a+1,c=a+stride+1,d=a+stride;indices.push(a,b,c,a,c,d);}
 return {id,role:'furniture',materialId,vertices,indices,collision:[],smoothNormals:true,doubleSided:true,castShadow:false};
}
