import * as THREE from 'three';
// Vegetation built from individual leaves instead of painted blobs.
// - leafTexture: one leaf per texture, per species outline (ovate serrated tree
//   leaf, 5-lobed ivy, small glossy box leaf), midrib + secondary veins, colour
//   mottling, paler margin, darker base; a tangent-space normal map from a domed
//   blade with sunken veins; an antialiased alpha edge.
// - clusterCard: many such leaves composited (rotated, scaled, layered, with their
//   normals rotated into card space) for dense small-leaved plants (hedge, box,
//   distant crowns) where individual meshes would be millions of leaves.
// - leafGeometry: a curved leaf blade (V-fold along the midrib, tip curl) as a
//   small mesh, instanced for plants seen close up (climbers, garden trees).
// - growClimber: a vine trained on horizontal wires: main stems rise from the
//   root with a wander, side shoots run along the wires, leaves sit at nodes on
//   short petioles, alternate, facing out and down to the light, older/larger low.
// All deterministic and procedural; authored look development, not botany data.

export function rng(seed){let s=(seed>>>0)||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function lattice(w,h,seed){const r=rng(seed),g=Array.from({length:w*h},r);return (u,v)=>{const x=((u%1)+1)%1*w,y=((v%1)+1)%1*h,i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),at=(a,b)=>g[((b%h+h)%h)*w+((a%w+w)%w)];return (at(i,j)*(1-sx)+at(i+1,j)*sx)*(1-sy)+(at(i,j+1)*(1-sx)+at(i+1,j+1)*sx)*sy;};}

export const LEAF_SPECIES={
 ovate:{base:[.09,.23,.035],tip:[.15,.31,.05],vein:[.22,.36,.1],margin:[.22,.32,.06],veins:'pinnate',roughness:.55},
 ivy:{base:[.03,.1,.018],tip:[.05,.15,.025],vein:[.32,.4,.22],margin:[.08,.16,.03],veins:'palmate',roughness:.38},
 dry:{base:[.32,.18,.06],tip:[.45,.3,.1],vein:[.4,.28,.12],margin:[.22,.12,.05],veins:'pinnate',roughness:.8},
 box:{base:[.04,.13,.02],tip:[.08,.21,.03],vein:[.1,.22,.04],margin:[.12,.24,.04],veins:'pinnate',roughness:.35}
};
// Leaf outline: half-width (in v units, blade spans v∈[-1,1]) at position u (0 base … 1 tip).
function outline(kind,u,v){
 if(kind==='ivy'){
  // Polar outline round the petiole point (u=.1): five pointed lobes, heart-shaped base.
  // Broad triangular lobes (Hedera): each lobe a cone of influence with straight
  // flanks; a filled centre; shallow sinuses between lobes; heart-shaped base.
  const du=u-.3,a=Math.atan2(v*.82,du),R=Math.hypot(v*.82,du);
  const lobes=[[0,.66],[1.05,.56],[-1.05,.56],[2.0,.42],[-2.0,.42]];let reach=.3*(1-.35*Math.max(0,Math.cos(a-Math.PI))**8);
  for(const [ang,len] of lobes){const d=Math.abs(Math.atan2(Math.sin(a-ang),Math.cos(a-ang)));reach=Math.max(reach,len*(1-d/1.2));}
  return (reach-R)*.6;
 }
 if(u<=0||u>=1)return -1;
 const w=kind==='box'?.62*Math.pow(Math.sin(Math.PI*u),.65)*(1-.12*u):.66*Math.pow(Math.sin(Math.PI*Math.pow(u,.9)),.95)*(1-.32*u);
 const teeth=kind==='ovate'?1-.06*Math.pow(Math.abs(Math.sin(u*Math.PI*14)),3)*Math.min(1,u*3):1;
 return (w*teeth-Math.abs(v))*.5;
}
export function leafTexture(kind='ovate',size=256,seed=11){
 const sp=LEAF_SPECIES[kind];if(!sp)throw Error('Unknown leaf species');
 const color=new Uint8Array(size*size*4),height=new Float32Array(size*size),mottle=lattice(6,9,seed),fine=lattice(40,40,seed+1),px=1/size;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=1-(y+.5)/size,v=((x+.5)/size-.5)*2,d=outline(kind,u,v),i=y*size+x;
  if(d<-px*1.5){height[i]=0;continue;}
  const alpha=Math.max(0,Math.min(1,d/(px*1.5)+.5));
  let vein=0;
  if(sp.veins==='pinnate'){const mid=Math.max(0,1-Math.abs(v)/.035);const sec=Math.max(0,1-Math.abs(((u-Math.abs(v)*.7)*8)%1-.5)/.06)*Math.min(1,Math.abs(v)*6)*(u>.05?1:0);vein=Math.max(mid,sec*.55);}
  else{const du=u-.3,a=Math.atan2(v*.82,du);for(const ang of [0,1.05,-1.05,2.0,-2.0])vein=Math.max(vein,Math.max(0,1-Math.abs(Math.atan2(Math.sin(a-ang),Math.cos(a-ang)))/.045)*(Math.hypot(v,du)>.03?1:0));}
  const edge=Math.max(0,1-d/.05),t=Math.max(0,Math.min(1,u)),m=mottle(u,v*.5+.5),f=fine(u,v*.5+.5);
  let c=sp.base.map((b,k)=>b+(sp.tip[k]-b)*t);c=c.map((b,k)=>b+(sp.margin[k]-b)*edge*.6);c=c.map((b,k)=>b+(sp.vein[k]-b)*vein*.85);
  const k=(.82+.36*m)*(.93+.14*f);c=c.map(b=>b*k);
  // Species colours are linear reflectance; the texture is sRGB-encoded.
  color.set([...c.map(v=>Math.round(255*Math.pow(Math.min(1,v),1/2.2))),Math.round(255*alpha)],i*4);
  height[i]=Math.min(1,d*6)*.7-vein*.22+.04*(f-.5);
 }
 // Bleed edge colour outward so mipmaps don't fringe dark.
 for(let pass=0;pass<4;pass++)for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){const i=(y*size+x)*4;if(color[i+3])continue;for(const o of [-4,4,-size*4,size*4])if(color[i+o+3]){color[i]=color[i+o];color[i+1]=color[i+o+1];color[i+2]=color[i+o+2];break;}}
 const normal=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,h=(xx,yy)=>height[Math.min(size-1,Math.max(0,yy))*size+Math.min(size-1,Math.max(0,xx))];
  const dx=(h(x+1,y)-h(x-1,y))*size*.02,dy=-(h(x,y+1)-h(x,y-1))*size*.02,l=Math.hypot(dx,dy,1);
  normal.set([Math.round(127.5+127.5*(-dx/l)),Math.round(127.5+127.5*(-dy/l)),Math.round(127.5+127.5/l),255],i*4);}
 return {width:size,height:size,color,normal,roughness:sp.roughness,kind};
}
// Composite many leaves into one card (colour+alpha, and normals rotated into card space).
export function clusterCard(kind='box',{size=256,leaves=60,leafScale=[.16,.26],seed=7,sourceSize=128,wrap=false}={}){
 const leaf=leafTexture(kind,sourceSize,seed+3),r=rng(seed),color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4);
 for(let i=0;i<size*size;i++)normal.set([128,128,255,255],i*4);
 const S=leaf.width;
 for(let n=0;n<leaves;n++){const depth=n/leaves,cx=wrap?r():.12+.76*r(),cy=wrap?r():.12+.76*r(),ang=r()*Math.PI*2,sc=leafScale[0]+(leafScale[1]-leafScale[0])*r(),ca=Math.cos(ang),sa=Math.sin(ang),shade=.62+.38*depth,tilt=[(r()-.5)*.6,(r()-.5)*.6];
  const half=sc*.5,lo=v=>Math.floor((v-half*1.5)*size),hi=v=>Math.ceil((v+half*1.5)*size),x0=wrap?lo(cx):Math.max(0,lo(cx)),x1=wrap?hi(cx):Math.min(size-1,hi(cx)),y0=wrap?lo(cy):Math.max(0,lo(cy)),y1=wrap?hi(cy):Math.min(size-1,hi(cy));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const px=(x+.5)/size-cx,py=(y+.5)/size-cy,lx=(px*ca+py*sa)/sc+.5,ly=(-px*sa+py*ca)/sc+.5;if(lx<0||ly<0||lx>=1||ly>=1)continue;
   const li=(Math.floor(ly*S)*S+Math.floor(lx*S))*4,a=leaf.color[li+3];if(a<128)continue;const o=((((y%size)+size)%size)*size+(((x%size)+size)%size))*4;
   color[o]=Math.round(leaf.color[li]*shade);color[o+1]=Math.round(leaf.color[li+1]*shade);color[o+2]=Math.round(leaf.color[li+2]*shade);color[o+3]=255;
   const nx=leaf.normal[li]/127.5-1+tilt[0],ny=leaf.normal[li+1]/127.5-1+tilt[1],nz=leaf.normal[li+2]/127.5-1,rx=nx*ca-ny*sa,ry=nx*sa+ny*ca,l=Math.hypot(rx,ry,nz);
   normal.set([Math.round(127.5+127.5*rx/l),Math.round(127.5+127.5*ry/l),Math.round(127.5+127.5*nz/l),255],o);}}
 for(let pass=0;pass<4;pass++)for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){const i=(y*size+x)*4;if(color[i+3])continue;for(const o of [-4,4,-size*4,size*4])if(color[i+o+3]===255){color[i]=color[i+o];color[i+1]=color[i+o+1];color[i+2]=color[i+o+2];break;}}
 return {width:size,height:size,color,normal,roughness:leaf.roughness,kind};
}
// Curved leaf blade: base at the origin, midrib along +Y (length 1), face normal +Z,
// V-fold across the midrib and a drooping tip; UVs cover the square leaf texture.
export function leafGeometry({fold=.16,curl=.22,rows=5}={}){
 const pos=[],uv=[],idx=[],cols=[-.5,-.25,0,.25,.5];
 for(let j=0;j<=rows;j++)for(const x of cols){const y=j/rows;pos.push(x,y,fold*Math.abs(x)*2*Math.sin(Math.PI*Math.min(1,y*1.2))*.5-curl*y*y);uv.push(x+.5,y);}
 const n=cols.length;for(let j=0;j<rows;j++)for(let i=0;i<n-1;i++){const a=j*n+i,b=a+n;idx.push(a,a+1,b+1,a,b+1,b);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function leafTextures(data,{repeat=false}={}){
 const make=(bytes,srgb)=>{const t=new THREE.DataTexture(bytes,data.width,data.height,THREE.RGBAFormat);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=8;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;};
 return {map:make(data.color,true),normalMap:make(data.normal,false)};
}
// Leaf orientation from a direction along the blade and the face normal.
export function leafQuaternion(along,normal){
 const y=along.clone().normalize(),z=normal.clone().sub(y.clone().multiplyScalar(normal.dot(y))).normalize(),x=new THREE.Vector3().crossVectors(y,z);
 return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
}
// Vine on a wall span. frame: {at(u,d,z)->Vector3, out:Vector3 (unit, horizontal)}, span u0..u1,
// z0..z1 (wire band), wires: z levels. Returns {stems:[[a,b,radius]...], leaves:[{p,along,normal,size,age}]}.
export function growClimber({u0,u1,z0,z1,base,wires=[],seed=3,mainStems=3,density=1}){
 const r=rng(seed),stems=[],leaves=[],mid=(u0+u1)/2,w=u1-u0,step=.07;
 const addLeaves=(path,age0,sideBias)=>{let side=1;for(let i=1;i<path.length;i++){if(r()>.97*density)continue;side=-side;const [u,z]=path[i],[pu,pz]=path[i-1],du=u-pu,dz=z-pz,l=Math.hypot(du,dz)||1;
   const age=age0*(1-i/path.length*.6),size=(.085+.075*age)*(.75+.5*r());
   // Leaf points along the stem, swung to one side, tilted outward and slightly down.
   const along2=[du/l*Math.cos(.9*side)-dz/l*Math.sin(.9*side)*sideBias,dz/l*Math.cos(.9*side)+du/l*Math.sin(.9*side)];
   leaves.push({u:u+along2[0]*.02,z:z+along2[1]*.02,along:[along2[0],along2[1]-.25],out:.03+.06*r()+.04*age,size,age,tilt:-.35+.5*r()});}};
 for(let k=0;k<mainStems;k++){
  // Main stem: from the root, wander up and outward to its share of the span.
  const target=mid+(k/(Math.max(1,mainStems-1))-.5)*w*.85,top=z0+(z1-z0)*(.7+.3*r());let u=mid+(r()-.5)*.12,z=base+.02;const path=[[u,z]];
  while(z<top){z+=step;u+=(target-u)*.06+(r()-.5)*.035;path.push([u,z]);}
  for(let i=1;i<path.length;i++)stems.push([path[i-1],path[i],.007*(1-i/path.length*.55)]);
  addLeaves(path,1,1);
  // Side shoots along each wire the stem crosses, both directions, random lengths.
  for(const wz of wires){if(wz>top||wz<z0)continue;for(const dir of [-1,1]){if(r()<.1)continue;const len=(.25+.75*r())*w*.5;let su=path.find(p=>p[1]>=wz)?.[0]??u,sz=wz;const sp=[[su,sz]];
   for(let s=0;s<len;s+=step){su+=dir*step;sz=wz+.012*Math.sin(s*9)+(r()-.5)*.01;if(su<u0-.2||su>u1+.2)break;sp.push([su,sz]);}
   for(let i=1;i<sp.length;i++)stems.push([sp[i-1],sp[i],.0035]);addLeaves(sp,.7,dir);
   // A few laterals hang or reach up off the shoot.
   // Laterals hang or reach up off the shoot, arching sideways as they grow.
   for(let i=2;i<sp.length;i+=3){if(r()<.3)continue;const up=r()<.65?1:-1,sway=(r()-.5)*.08;let lu=sp[i][0],lz=sp[i][1];const lp=[[lu,lz]];for(let s=0;s<.15+.25*r();s+=step*.7){lu+=sway+(r()-.5)*.025;lz+=up*step*.7*(1-s*.8);lp.push([lu,lz]);}for(let j=1;j<lp.length;j++)stems.push([lp[j-1],lp[j],.0022]);addLeaves(lp,.45,1);}}}
 }
 return {stems,leaves};
}
