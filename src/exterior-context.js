import * as THREE from 'three';
import {mergeGeometries} from '../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
// The plot's surroundings, so the house sits somewhere rather than in a field:
// a lane passing the gate side (worn asphalt with patching, edge lines, verge
// kerbs), a gravel drive from the lane to the hedge gap, an open five-bar gate on
// timber posts, telegraph poles with sagging wires (one drop wire to the house),
// a few neighbouring cottages along the lane, a desire-line path worn into the
// lawn from the door to the gate, and weeds in the paving joints. Deterministic;
// follows the terrain; dressing only (no collision or gameplay).

export function rng(seed){let s=(seed>>>0)||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function tex({width,height,data},srgb=true,repeat=true){const t=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=8;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;}
function noise2(seed,w,h){const r=rng(seed),g=Array.from({length:w*h},r);return (u,v)=>{const x=((u%1)+1)%1*w,y=((v%1)+1)%1*h,i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),at=(a,b)=>g[((b%h+h)%h)*w+((a%w+w)%w)];return (at(i,j)*(1-sx)+at(i+1,j)*sx)*(1-sy)+(at(i,j+1)*(1-sx)+at(i+1,j+1)*sx)*sy;};}

// Lane surface, 8 m of road per tile (u along, v across the 6 m width): aggregate
// speckle, lighter polished wheel tracks, darker patch repairs and edge crazing,
// white edge lines and a dashed centre line.
export function asphaltPixels(size=512,seed=31){
 const px=new Uint8Array(size*size*4),r=rng(seed),grain=noise2(seed,size/2,size/2),blot=noise2(seed+1,6,4),patch=noise2(seed+2,3,2),crack=noise2(seed+3,48,48);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size,v=(y+.5)/size,across=v*6;
  let c=.21+.06*(grain(u,v)-.5)+.03*(blot(u,v)-.5);if(r()<.02)c+=.12*r();
  const track=Math.min(Math.abs(across-1.6),Math.abs(across-4.4));if(track<.35)c+=.035*(1-track/.35);
  if(patch(u,v)>.68)c-=.05;
  if((across<.45||across>5.55)&&crack(u,v)>.62)c-=.06;
  let paint=0;if(Math.abs(across-.25)<.06||Math.abs(across-5.75)<.06)paint=.85;if(Math.abs(across-3)<.055&&(u*8)%3<1.8)paint=.8;
  if(paint){const wear=.55+.45*grain(u*3,v*3);c=c*(1-paint*wear)+.82*paint*wear;}
  const k=Math.round(255*Math.min(1,c));px.set([k,k,Math.round(k*.98),255],(y*size+x)*4);}
 return {width:size,height:size,data:px};
}
// Loose gravel drive (tan/grey stones on a darker bed) and worn-grass/mud decal.
function gravelDrivePixels(size=256,seed=9){const px=new Uint8Array(size*size*4),r=rng(seed);for(let i=0;i<size*size;i++){const t=r();px.set(t<.35?[96,88,76,255]:t<.7?[138,128,112,255]:t<.9?[160,150,132,255]:[70,66,60,255],i*4);}for(let k=0;k<size*size/40;k++){const cx=Math.floor(r()*size),cy=Math.floor(r()*size),rad=1+r()*2.5,col=[120+60*r(),112+50*r(),98+40*r()];for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){if(x*x+y*y>rad*rad)continue;const X=(cx+x+size)%size,Y=(cy+y+size)%size;px.set([...col.map(Math.round),255],(Y*size+X)*4);}}return {width:size,height:size,data:px};}
function wornPixels(size=128,seed=4){const px=new Uint8Array(size*size*4),n=noise2(seed,8,8),f=noise2(seed+1,32,32);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size-.5,v=(y+.5)/size-.5,d=Math.hypot(u*1.1,v*2.2)*2,a=Math.max(0,1-d)*(.55+.6*n(u+.5,v+.5));const c=.32+.15*f(u+.5,v+.5);px.set([Math.round(255*c*.95),Math.round(255*c*.82),Math.round(255*c*.58),Math.round(255*Math.min(1,a))],(y*size+x)*4);}return {width:size,height:size,data:px};}

const M={
 asphalt:null,kerb:{color:0x8f8c84,roughness:.9},gravel:null,timber:{color:0x5d4630,roughness:.85},gatewood:{color:0x8a6f4e,roughness:.8},galv:{color:0x9ea3a5,metalness:.8,roughness:.4},
 pole:{color:0x4a3a2c,roughness:.9},wire:{color:0x1d1d1d,roughness:.6},render:{color:0xe4ddcc,roughness:.92},brick:{color:0x8c4b38,roughness:.9},tile:{color:0x5a3a30,roughness:.8},slate:{color:0x3a3e44,roughness:.7},
 glass:{color:0x1d2629,metalness:.1,roughness:.08},frame:{color:0xe8e6df,roughness:.6},door:{color:0x2e4a3c,roughness:.6},hedge:{color:0x2d4422,roughness:.95}
};
const box=(w,d,h,x,y,z)=>{const g=new THREE.BoxGeometry(w,d,h);g.translate(x,y,z+h/2);return g;};
function rod(a,b,r,seg=6){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),len=A.distanceTo(B),g=new THREE.CylinderGeometry(r,r,len,seg,1);g.translate(0,len/2,0);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize()));g.translate(...a);return g;}
// Cottage: rendered or brick box, gabled roof with overhang, chimney, windows, door.
function cottage(r){const W=7+3*r(),D=6+2*r(),H=2.7+.4*r(),brick=r()<.45,g={};const add=(k,x)=>{(g[k]??=[]).push(x);};
 add(brick?'brick':'render',box(W,D,H,0,0,0));
 const rise=2.2+.6*r(),over=.35,half=D/2+over,slope=Math.hypot(half,rise);
 for(const s of [-1,1]){const pl=new THREE.BoxGeometry(W+2*over,slope,.12);pl.rotateX(s*Math.atan2(rise,half));pl.translate(0,s*half/2,H+rise/2);add('tile',pl);}
 const gable=new THREE.BufferGeometry();const gp=[];for(const x of [-W/2,W/2])gp.push(x,-D/2,H,x,D/2,H,x,0,H+rise);gable.setAttribute('position',new THREE.Float32BufferAttribute(gp,3));gable.setIndex([0,1,2,3,5,4]);gable.computeVertexNormals();add(brick?'brick':'render',gable.toNonIndexed());
 add('brick',box(.6,.6,1.6,W*.3,D*.15,H+rise*.55));
 for(let i=0;i<3;i++){const x=-W/2+W*(i+.5)/3;if(i!==1){add('frame',box(1.1,.08,1.2,x,-D/2-.02,.9));add('glass',box(.95,.1,1.05,x,-D/2-.03,.97));}else{add('door',box(.95,.1,2.05,x,-D/2-.03,0));}
  add('frame',box(1.1,.08,1.1,x,-D/2-.02,H-1.25));add('glass',box(.95,.1,.95,x,-D/2-.03,H-1.17));}
 add('hedge',box(W+3,.7,1,0,-D/2-4,0));
 return g;}

export function buildExteriorContext({plot,terrainHeight,doors=[],paving=[],seed=13}){
 const r=rng(seed),[x0,y0,x1,y1]=plot.bounds,parts=new Map(),add=(k,...g)=>{if(!parts.has(k))parts.set(k,[]);parts.get(k).push(...g);};
 const h=(x,y)=>terrainHeight(x,y,plot);
 // Gate side: the side of the first path gap (default south).
 const gap=plot.gaps[0]??[Math.floor((x0+x1)/2),y0];
 const side=gap[1]===y0?'S':gap[1]===y1-1?'N':gap[0]===x0?'W':'E';
 const along=side==='S'||side==='N'?[1,0]:[0,1],out=side==='S'?[0,-1]:side==='N'?[0,1]:side==='W'?[-1,0]:[1,0];
 const edge=side==='S'?y0:side==='N'?y1:side==='W'?x0:x1,gapC=[gap[0]+.5,gap[1]+.5];
 const roadOff=9,roadW=6,L=900,P=(a,d)=>{const c=side==='S'||side==='N'?[a,edge+out[1]*d]:[edge+out[0]*d,a];return c;};
 const centreA=side==='S'||side==='N'?gapC[0]:gapC[1];
 // 1. Lane: strip following the terrain, 4 m segments, UV in road tiles of 8 m.
 {const pos=[],uv=[],idx=[],n=Math.round(L/4);for(let i=0;i<=n;i++){const a=centreA-L/2+i*4;for(const k of [0,1]){const d=roadOff+k*roadW,[x,y]=P(a,d);pos.push(x,y,h(x,y)+.03);uv.push(i*4/8,k);}}
  for(let i=0;i<n;i++){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();if(g.attributes.normal.getZ(0)<0){g.setIndex(idx.map((v,i)=>i%3===1?idx[i+1]:i%3===2?idx[i-1]:v));g.computeVertexNormals();}add('asphalt',g);
  for(const d of [roadOff-.15,roadOff+roadW])for(let i=0;i<n;i++){const a=centreA-L/2+i*4+2,[x,y]=P(a,d+.075),k=box(4,.15,.12,0,0,0);if(along[0]===0)k.rotateZ(Math.PI/2);k.translate(x,y,h(x,y));add('kerb',k);}}
 // 2. Gravel drive from the lane to the gap, flaring at the lane.
 {const pos=[],uv=[],idx=[],n=8;for(let i=0;i<=n;i++){const d=-.6+(roadOff+.1)*i/n,w=1.6+(i>n-2?.9*(i-n+2):0);for(const s of [-1,1]){const [x,y]=P(centreA+s*w,d);pos.push(x,y,h(x,y)+.02);uv.push(s*w/1.2,d/1.2);}}
  for(let i=0;i<n;i++){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();if(g.attributes.normal.getZ(0)<0){g.setIndex(idx.map((v,i)=>i%3===1?idx[i+1]:i%3===2?idx[i-1]:v));g.computeVertexNormals();}add('gravel',g);}
 // 3. Gate posts at the hedge line and an open five-bar gate swung back against the hedge.
 {const posts=[-1.55,1.55].map(s=>P(centreA+s,-.45));for(const [x,y] of posts)add('timber',box(.18,.18,1.45,x,y,h(x,y)),box(.22,.22,.04,x,y,h(x,y)+1.45));
  const [hx,hy]=posts[0],dir=[-along[0]*.25+out[0]*.97,-along[1]*.25+out[1]*.97],len=2.9,z=h(hx,hy);
  for(let k=0;k<5;k++){const zz=z+.25+k*.24;add('gatewood',rod([hx,hy,zz],[hx+dir[0]*len,hy+dir[1]*len,zz],.03,4));}
  for(const t of [0,.5,1])add('gatewood',rod([hx+dir[0]*len*t,hy+dir[1]*len*t,z+.2],[hx+dir[0]*len*t,hy+dir[1]*len*t,z+1.25],.035,4));
  add('gatewood',rod([hx,hy,z+.25],[hx+dir[0]*len,hy+dir[1]*len,z+1.21],.03,4));
  add('galv',box(.08,.06,.06,hx,hy,z+.3),box(.08,.06,.06,hx,hy,z+1.05));}
 // 4. Telegraph poles on the far verge every 38 m, three sagging wires, a drop wire to the house.
 {const poles=[];for(let a=centreA-L/2+10;a<centreA+L/2;a+=38){const [x,y]=P(a+(r()-.5)*3,roadOff+roadW+2.2),z=h(x,y);poles.push([x,y,z]);add('pole',rod([x,y,z-.2],[x,y,z+8.2],.13,8));const arm=[x-out[0]*0,y,z];const ax=along[0],ay=along[1];add('pole',rod([x-ax*.8,y-ay*.8,z+7.6],[x+ax*.8,y+ay*.8,z+7.6],.06,6));}
  for(let i=0;i<poles.length-1;i++)for(const off of [-.65,0,.65]){const a=poles[i],b=poles[i+1],pts=[];for(let k=0;k<=10;k++){const t=k/10;pts.push([a[0]+(b[0]-a[0])*t+along[0]*off,a[1]+(b[1]-a[1])*t+along[1]*off,a[2]+(b[2]-a[2])*t+7.62-.55*Math.sin(Math.PI*t)]);}for(let k=0;k<10;k++)add('wire',rod(pts[k],pts[k+1],.008,3));}
  const near=poles.reduce((m,p)=>Math.hypot(p[0]-gapC[0],p[1]-gapC[1])<Math.hypot(m[0]-gapC[0],m[1]-gapC[1])?p:m,poles[0]),house=plot.built.reduce((m,[x,y])=>Math.hypot(x-gapC[0],y-gapC[1])<Math.hypot(m[0]-gapC[0],m[1]-gapC[1])?[x,y]:m,plot.built[0]);
  if(near&&house){const a=[near[0],near[1],near[2]+7.3],b=[house[0]+.5,house[1]+.5,3.4],pts=[];for(let k=0;k<=12;k++){const t=k/12;pts.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t-.9*Math.sin(Math.PI*t)]);}for(let k=0;k<12;k++)add('wire',rod(pts[k],pts[k+1],.006,3));}}
 // 5. Cottages across the lane at 45–150 m either side, facing it.
 const cottages=[];for(let i=0;i<4;i++){const s=i%2?1:-1,a=centreA+s*(45+i*28+r()*15),[x,y]=P(a,roadOff+roadW+14+r()*6),g=cottage(r),rot=Math.atan2(-out[1],-out[0])-Math.PI/2+Math.PI;cottages.push([x,y]);
  for(const [k,list] of Object.entries(g))for(const geo of list){geo.rotateZ(rot);geo.translate(x,y,h(x,y)-.05);add(k,geo);}}
 // 6. Desire line: worn patches from each door toward the gate across the lawn.
 const worn=[];for(const d of doors){const s=[d.p[0]+d.out[0]*.8,d.p[1]+d.out[1]*.8],e=[gapC[0],gapC[1]];const n=Math.max(2,Math.round(Math.hypot(e[0]-s[0],e[1]-s[1])/.55));for(let i=0;i<=n;i++){const t=i/n,c=[s[0]+(e[0]-s[0])*t+(r()-.5)*.25,s[1]+(e[1]-s[1])*t+(r()-.5)*.25];if(plot.isLawn(Math.floor(c[0]),Math.floor(c[1])))worn.push({c,a:Math.atan2(e[1]-s[1],e[0]-s[0])+(r()-.5)*.4,s:.55+.35*r()});}}
 // 7. Weeds at paving joints (cell edges of paved, non-room cells).
 const weeds=[];for(const [x,y] of paving)for(const [dx,dy] of [[0,.5],[.5,0]]){if(r()>.35)continue;weeds.push([x+dx+(dx?0:r()),y+dy+(dy?0:r())]);}
 // Assemble.
 const group=new THREE.Group();group.name='exterior-context';const disposables=[];
 const asphalt=tex(asphaltPixels(512,31)),gravel=tex(gravelDrivePixels(256,9));disposables.push(asphalt,gravel);
 for(const [k,list] of parts){const geo=mergeGeometries(list.map(g=>g.index?g.toNonIndexed():g).map(g=>{if(!g.attributes.uv){const n=g.attributes.position.count;g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(n*2),2));}return g;}),false);
  const def=k==='asphalt'?{map:asphalt,roughness:.9}:k==='gravel'?{map:gravel,roughness:.95}:M[k];const mat=new THREE.MeshStandardMaterial(def);
  const mesh=new THREE.Mesh(geo,mat);mesh.receiveShadow=true;mesh.castShadow=!['asphalt','gravel','wire'].includes(k);mesh.name='context-'+k;group.add(mesh);}
 if(worn.length){const t=tex(wornPixels(128,4),true,false);disposables.push(t);const mat=new THREE.MeshStandardMaterial({map:t,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const im=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),mat,worn.length),m=new THREE.Matrix4();worn.forEach((w,i)=>{m.compose(new THREE.Vector3(w.c[0],w.c[1],.016),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),w.a),new THREE.Vector3(w.s*1.4,w.s,1));im.setMatrixAt(i,m);});im.receiveShadow=true;im.name='worn-path';group.add(im);}
 // Where other dressing must not grow: the lane corridor, the drive and round cottages.
 const across=(x,y)=>side==='S'?edge-y:side==='N'?y-edge:side==='W'?edge-x:x-edge,lateral=(x,y)=>(side==='S'||side==='N'?x:y)-centreA;
 const blocked=(x,y)=>{const d=across(x,y);if(d>roadOff-1.5&&d<roadOff+roadW+3.5)return true;if(d>-1&&d<roadOff&&Math.abs(lateral(x,y))<3)return true;return cottages.some(([cx,cy])=>Math.hypot(x-cx,y-cy)<11);};
 group.userData={side,weeds,disposables,blocked};
 return group;
}
