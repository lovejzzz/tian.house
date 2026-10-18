import * as THREE from 'three';
import {mergeVertices,mergeGeometries} from '../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import {lawnPixels} from './procedural-surfaces.js?v=1d7ffb1877ce';
import {installSurfaceVariation} from './surface-variation.js?v=1d7ffb1877ce';
import {trellisSpan} from './exterior-architecture.js?v=1d7ffb1877ce';
import {installLeafTranslucency,installLeafWind} from './foliage-shading.js?v=1d7ffb1877ce';
import {installGroundVariation} from './facade-weathering.js?v=1d7ffb1877ce';
import {resolveExterior} from './scene-exterior.js?v=1d7ffb1877ce';
import {scannedTextureSet,loadScannedModel} from './scanned-assets.js?v=1d7ffb1877ce';
import {leafTexture,clusterCard,leafGeometry,leafTextures,leafQuaternion,growClimber} from './vegetation-leaves.js?v=1d7ffb1877ce';
import {buildExteriorProps} from './exterior-props.js?v=1d7ffb1877ce';
import {SimplifyModifier} from '../node_modules/three/examples/jsm/modifiers/SimplifyModifier.js';
import {buildExteriorContext} from './exterior-context.js?v=1d7ffb1877ce';
import {createBirds,createFallingLeaves} from './atmosphere-effects.js?v=1d7ffb1877ce';
// Runtime landscape around the authored plot (Z-up, metres = grid cells):
// meadow ground to the horizon, a varied distant tree line, a few detailed garden
// trees whose leaf cards cast dappled shadows, a clipped boundary hedge with a gap
// where a path leaves, and short instanced grass blades with a gentle sway near
// the house. Deterministic (seeded); dressing only — no collision or gameplay.

export function rng(seed){let s=(seed>>>0)||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
const LAWN='blends_natural_01_16';

// Plot analysis from the house plan: bounds, lawn cells, path exits, built area.
export function plotLayout(squares){
 const cells=new Map(squares.filter(s=>s.z===0).map(s=>[`${s.x},${s.y}`,s]));
 const xs=[...cells.values()].map(s=>s.x),ys=[...cells.values()].map(s=>s.y);
 const bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs)+1,Math.max(...ys)+1];
 const lawn=[...cells.values()].filter(s=>s.tiles?.[0]===LAWN).map(s=>[s.x,s.y]);
 const built=[...cells.values()].filter(s=>s.tiles?.[0]!==LAWN).map(s=>[s.x,s.y]);
 const isLawn=(x,y)=>cells.get(`${x},${y}`)?.tiles?.[0]===LAWN;
 // Edge cells that are not lawn (a path reaching the boundary) open the hedge.
 const gaps=[...cells.values()].filter(s=>s.tiles?.[0]!==LAWN&&(s.x===bounds[0]||s.y===bounds[1]||s.x===bounds[2]-1||s.y===bounds[3]-1)).map(s=>[s.x,s.y]);
 const distBuilt=(x,y)=>built.reduce((m,[bx,by])=>Math.min(m,Math.hypot(x-bx,y-by)),Infinity);
 return {bounds,lawn,built,gaps,isLawn,distBuilt,centre:[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2]};
}

// Leaf-cluster card: overlapping ovate leaves with midribs on transparency.
export function leafCardPixels(size=128,seed=5,{leaves=14,length=[.16,.12]}={}){
 const r=rng(seed),px=new Uint8Array(size*size*4);
 for(let k=0;k<leaves;k++){
  const cx=.12+.76*r(),cy=.12+.76*r(),a=r()*Math.PI*2,len=length[0]+length[1]*r(),wid=len*(.38+.12*r()),tone=.75+.35*r(),hue=r();
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size-cx,v=(y+.5)/size-cy,s=Math.cos(a),c=Math.sin(a),p=u*s+v*c,q=-u*c+v*s;
   const t=p/len;if(t<-1||t>1)continue;const half=wid*Math.sqrt(Math.max(0,1-t*t))*(1-.25*t);if(Math.abs(q)>half)continue;
   const rib=Math.abs(q)<half*.08?1.12:1,edge=1-.25*Math.pow(Math.abs(q)/half,4),i=(y*size+x)*4;
   const g=Math.min(1,(.28+.1*hue)*tone*rib*edge),R=g*(.42+.25*hue),B=g*.28;px.set([Math.round(R*255),Math.round(g*255),Math.round(B*255),255],i);}
 }
 return {width:size,height:size,data:px};
}

// Cut-out textures: transparent texels were left black, so mipmaps averaged black
// into the edges and small or distant cut-outs (paving weeds, tufts) rendered as dark
// specks. Bleed the nearest opaque colour outward (alpha stays 0).
export function bleedCutout(data,width,height,passes=8){
 let any=false;for(let i=3;i<data.length;i+=4)if(data[i]===0){any=true;break;}if(!any)return data;
 const filled=new Uint8Array(width*height);for(let i=0;i<width*height;i++)filled[i]=data[i*4+3]>0?1:0;
 for(let p=0;p<passes;p++){const next=filled.slice();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(filled[i])continue;let r=0,g=0,b=0,n=0;
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height)continue;const j=yy*width+xx;if(!filled[j])continue;r+=data[j*4];g+=data[j*4+1];b+=data[j*4+2];n++;}
   if(n){data[i*4]=r/n;data[i*4+1]=g/n;data[i*4+2]=b/n;next[i]=1;}}
  filled.set(next);}
 // Anything still unreached takes the mean opaque colour.
 let r=0,g=0,b=0,n=0;for(let i=0;i<width*height;i++)if(data[i*4+3]){r+=data[i*4];g+=data[i*4+1];b+=data[i*4+2];n++;}
 if(n)for(let i=0;i<width*height;i++)if(!filled[i]){data[i*4]=r/n;data[i*4+1]=g/n;data[i*4+2]=b/n;}
 return data;
}
function dataTexture({width,height,data},color=true,repeat=false){if(color)bleedCutout(data,width,height);const t=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=8;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;}

// Tapered branch cylinder from a to b (radii ra, rb), appended to arrays. UVs wrap
// once around (seam vertices duplicated) and run along the length in metres/0.7,
// continuing from vStart so bark furrows flow from the trunk into the limbs.
function branch(pos,idx,col,a,b,ra,rb,seg,color,uv=null,vStart=0){
 const d=new THREE.Vector3().subVectors(b,a),len=d.length();d.normalize();
 const ref=Math.abs(d.z)<.9?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0),u=new THREE.Vector3().crossVectors(d,ref).normalize(),v=new THREE.Vector3().crossVectors(d,u);
 const base=pos.length/3,ring=seg+1;
 for(const [p,r,vv] of [[a,ra,vStart],[b,rb,vStart+len/.7]])for(let i=0;i<=seg;i++){const t=i/seg*Math.PI*2,q=p.clone().addScaledVector(u,Math.cos(t)*r).addScaledVector(v,Math.sin(t)*r);pos.push(q.x,q.y,q.z);col.push(...color);uv?.push(Math.max(1,Math.round(r*Math.PI*2/.55))*i/seg,vv);}
 for(let i=0;i<seg;i++){const j=i+1;idx.push(base+i,base+j,base+ring+j,base+i,base+ring+j,base+ring+i);}
 return len;
}
// Periodic value noise on a w×h lattice (tiles seamlessly), smoothstep-interpolated.
function lattice(w,h,seed){const r=rng(seed),g=Array.from({length:w*h},r);return (u,v)=>{const x=((u%1)+1)%1*w,y=((v%1)+1)%1*h,i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),at=(a,b)=>g[((b%h+h)%h)*w+((a%w+w)%w)];
 return (at(i,j)*(1-sx)+at(i+1,j)*sx)*(1-sy)+(at(i,j+1)*(1-sx)+at(i+1,j+1)*sx)*sy;};}
// Bark (mature deciduous trunk): irregular vertical plates separated by wandering
// dark furrows, plates broken by occasional cross-cracks, grey-brown with lichen-pale
// ridges. Furrow position meanders with low-frequency noise so nothing reads as a
// repeating pattern. Returns albedo (times the vertex colour) and relief.
export function barkPixels(size=256,seed=13){
 const color=new Uint8Array(size*size*4),relief=new Uint8Array(size*size*4),cols=7;
 const meander=lattice(cols,3,seed),width=lattice(cols,5,seed+1),crack=lattice(cols*2,9,seed+2),fine=lattice(72,14,seed+3),tone=lattice(4,6,seed+4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size,v=(y+.5)/size;
  const cu=(u+.09*(meander(u,v)-.5)+.02*(fine(u,v)-.5))*cols,f=cu-Math.floor(cu),w=.18+.22*width(u,v);
  const edge=Math.min(f,1-f),furrow=Math.min(1,edge/w),plate=Math.pow(furrow,.7);
  // Plates break across where a per-column noise peaks: short horizontal furrows.
  const col=Math.floor(cu)/cols,cr=crack(col+.03,v),cut=cr>.72?1-.5*Math.min(1,(cr-.72)/.05)*Math.max(0,1-Math.abs(((v*9)%1)-.5)/.08):1;
  const h=plate*cut*(.82+.36*fine(u,v)),lichen=Math.max(0,Math.min(1,(tone(u*3+.3,v*2)-.6)*4))*Math.max(0,h-.6)*2.5;
  const t=.32+.68*h,base=[.48+.12*lichen*.4,.42+.2*lichen*.4,.36+.16*lichen*.4],k=.85+.3*tone(u,v),i=(y*size+x)*4;
  color.set(base.map(c=>Math.min(255,Math.round(255*c*t*k))).concat(255),i);
  const q=Math.round(255*Math.min(1,h));relief.set([q,q,q,255],i);}
 return {width:size,height:size,data:color,relief};
}

// Garden tree: leaning trunk, 5–6 scaffold limbs spreading out of the trunk, each
// forking (parent direction turned 22–42° about a random axis, mild upward pull)
// down to twigs; leaf-card clusters at twig ends fill a broad, open crown.
// Bark colours are linear (a dark grey-brown that reads correctly in sunlight).
export function gardenTree(seed,height=7){
 const r=rng(seed),pos=[],idx=[],col=[],uvs=[],leaves=[],k=height/7;
 const bark=[.11,.085,.06],up=new THREE.Vector3(0,0,1);
 const turn=(dir,angle)=>{const axis=new THREE.Vector3(r()-.5,r()-.5,r()-.5).cross(dir).normalize();return dir.clone().applyAxisAngle(axis,angle);};
 // A branch is one smooth tube swept along a gently curving path (parallel-transport
 // frames, tapering radius); side branches leave along its length at 30–55°, the
 // tip continues as the leader. No straight segments, no visible joints.
 const sweep=(path,r0,r1,sides,v0)=>{const base=pos.length/3,n=path.length;let normal=null;
  for(let j=0;j<n;j++){const t=j/(n-1),p=path[j],d=path[Math.min(n-1,j+1)].clone().sub(path[Math.max(0,j-1)]).normalize();
   if(!normal){const ref=Math.abs(d.z)<.9?up:new THREE.Vector3(1,0,0);normal=new THREE.Vector3().crossVectors(d,ref).normalize();}else{normal.sub(d.clone().multiplyScalar(normal.dot(d))).normalize();}
   const bin=new THREE.Vector3().crossVectors(d,normal),rad=r0+(r1-r0)*t,shade=bark.map(c=>c*(.85+.3*r()));
   for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2,q=p.clone().addScaledVector(normal,Math.cos(a)*rad).addScaledVector(bin,Math.sin(a)*rad);pos.push(q.x,q.y,q.z);col.push(...shade);uvs.push(Math.max(1,Math.round(rad*Math.PI*2/.55))*i/sides,v0+t*path.length*.1);}}
  for(let j=0;j<n-1;j++)for(let i=0;i<sides;i++){const a=base+j*(sides+1)+i,b=a+sides+1;idx.push(a,b,b+1,a,b+1,a+1);}};
 const grow=(a,dir,len,radius,depth,v0=0)=>{
  const steps=Math.max(4,Math.round(len/.18)),path=[a.clone()],d=dir.clone();let p=a.clone();
  const bend=new THREE.Vector3(r()-.5,r()-.5,(r()-.3)*.6).multiplyScalar(.12);
  for(let s=1;s<=steps;s++){d.add(bend.clone().multiplyScalar(1/steps*3)).addScaledVector(up,depth>1?.02:-.015).add(new THREE.Vector3(r()-.5,r()-.5,r()-.5).multiplyScalar(.06)).normalize();p=p.clone().addScaledVector(d,len/steps);path.push(p);}
  sweep(path,radius,radius*.62,depth>2?10:depth>0?7:5,v0);
  if(depth===0){for(let j=0;j<17;j++){const q=path[Math.max(1,path.length-1-Math.floor(r()*Math.min(3,path.length-1)))].clone().add(new THREE.Vector3((r()-.5)*1.05,(r()-.5)*1.05,(r()-.35)*.7).multiplyScalar(k));leaves.push({p:q,rot:r()*Math.PI*2,tilt:(r()-.5)*1.3,s:(.42+.3*r())*k});}return;}
  // Leader continues from the tip; laterals leave from the outer half of the branch.
  grow(path[path.length-1],turn(d,.15+.2*r()).addScaledVector(up,.1).normalize(),len*(.68+.1*r()),radius*.62,depth-1,v0+len);
  const laterals=depth>2?2:1;for(let j=0;j<laterals;j++){const at=Math.floor(path.length*(.45+.45*r())),pd=path[Math.min(path.length-1,at+1)].clone().sub(path[at]).normalize();
   grow(path[at],turn(pd,.55+.4*r()).addScaledVector(up,.15).normalize(),len*(.55+.15*r()),radius*(.75-.25*at/path.length)*.75,depth-1,v0+len*at/path.length);}
 };
 const lean=new THREE.Vector3((r()-.5)*.12,(r()-.5)*.12,1).normalize(),trunkTop=lean.clone().multiplyScalar(height*.36);
  // Trunk: one continuous tube whose radius flares exponentially into five buttress
 // roots at the ground, so it meets the lawn like a grown tree, not a cone on a pole.
 {const seg=20,rings=14,base=pos.length/3,rep=Math.max(1,Math.round(.2*k*Math.PI*2/.55));
  for(let j=0;j<=rings;j++){const f=j/rings,z=-.1+(trunkTop.z+.1)*f*f,c=lean.clone().multiplyScalar(z/lean.z),flare=Math.exp(-(z+.1)/(.32*k));
   for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2,rad=(.13+.04*(1-f))*k*(1+1.1*flare*(1+.35*Math.cos(5*a+seed)));pos.push(c.x+Math.cos(a)*rad,c.y+Math.sin(a)*rad,z);col.push(...bark);uvs.push(rep*i/seg,z/.7);}}
  for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){const a=base+j*(seg+1)+i,b=a+seg+1;idx.push(a,a+1,b+1,a,b+1,b);}}
 const scaffolds=5+Math.floor(r()*2);
 for(let j=0;j<scaffolds;j++){const yaw=j/scaffolds*Math.PI*2+r()*.6,tilt=.6+.45*r(),start=trunkTop.clone().addScaledVector(lean,-r()*height*.08);
  const dir=new THREE.Vector3(Math.cos(yaw)*Math.sin(tilt),Math.sin(yaw)*Math.sin(tilt),Math.cos(tilt));
  grow(start,dir,height*(.2+.06*r()),.09*k,4,height*.3/.7);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();
 return {wood:g,leaves};
}

// Distant tree (seen at 55–260 m through haze): smooth, lumpy crown blobs with
// welded vertices (soft normals, no facets) or a layered, drooping conifer; the
// crown underside is darkened in vertex colour as cheap self-occlusion.
export function distantTreeGeometry(conifer,seed=1){
 const r=rng(seed),parts=[];
 const trunk=new THREE.CylinderGeometry(.16,.3,conifer?3:3.6,8);trunk.rotateX(Math.PI/2);trunk.translate(0,0,conifer?1.5:1.8);parts.push([trunk,[.07,.055,.045],false]);
 const cards=[];
 if(conifer){for(let k=0;k<6;k++){const rk=2.3-k*.33,zk=2.6+k*1.45;for(let j=0;j<20-2*k;j++){const a=(j+r())/(20-2*k)*Math.PI*2,f=.6+.45*r();cards.push({p:[Math.cos(a)*rk*f,Math.sin(a)*rk*f,zk-.1-1.05*f],n:[Math.cos(a),Math.sin(a),-.25],s:.95+.16*(6-k)});}
  const c=new THREE.ConeGeometry(2.3-k*.33,2.4-k*.12,16,2,true);c.rotateX(Math.PI/2);const p=c.attributes.position;
   for(let i=0;i<p.count;i++){const z=p.getZ(i),rad=Math.hypot(p.getX(i),p.getY(i));if(rad>.05){const a=Math.atan2(p.getY(i),p.getX(i)),f=1+.16*Math.sin(a*7+k*1.7)+.1*(r()-.5);p.setXYZ(i,p.getX(i)*f,p.getY(i)*f,z-.25*rad*rad/2.3);}}
   c.translate(0,0,2.6+k*1.45);parts.push([c,[.014,.03,.018],true]);}}
 else{for(let k=0;k<5;k++){let s=new THREE.IcosahedronGeometry(1.6+r()*1.1,2);s.deleteAttribute('normal');s.deleteAttribute('uv');s=mergeVertices(s);const p=s.attributes.position,ph=[r()*6,r()*6,r()*6];
   for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),l=Math.hypot(x,y,z),f=.78*(1+.13*Math.sin(x*2.1+ph[0])*Math.sin(y*2.3+ph[1])+.09*Math.sin(z*3.1+ph[2])+.05*(r()-.5));p.setXYZ(i,x*f,y*f,z*f*.82);}
   const R=s.boundingSphere?.radius??(s.computeBoundingSphere(),s.boundingSphere.radius),off=[(r()-.5)*2.4,(r()-.5)*2.4,4.4+r()*2.4];s.translate(...off);parts.push([s,[.022,.04,.016],true]);
   for(let j=0;j<48;j++){const z=r()*1.75-.75,a=r()*Math.PI*2,q=Math.sqrt(1-z*z),n=[q*Math.cos(a),q*Math.sin(a),z],d=.7+.45*r();cards.push({p:[off[0]+n[0]*R*d,off[1]+n[1]*R*d,off[2]+n[2]*R*.8*d],n,s:1.5+.9*r()});}}}
 const pos=[],col=[],idx=[];let off=0;
 for(const [g,c,crown] of parts){const p=g.attributes.position;let zmin=Infinity,zmax=-Infinity;for(let i=0;i<p.count;i++){zmin=Math.min(zmin,p.getZ(i));zmax=Math.max(zmax,p.getZ(i));}
  for(let i=0;i<p.count;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));const shade=(.85+.3*r())*(crown?.55+.45*(p.getZ(i)-zmin)/(zmax-zmin||1):1);col.push(c[0]*shade,c[1]*shade,c[2]*shade);}
  const ix=g.index?g.index.array:Array.from({length:p.count},(_,i)=>i);for(const i of ix)idx.push(i+off);off+=p.count;g.dispose();}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();g.userData.cards=cards;return g;
}

// Conifer spray card: a drooping twig with fine needles in two ranks, cut-out.
export function needlePixels(size=128,seed=9){
 const r=rng(seed),px=new Uint8Array(size*size*4),dot=(x,y,c)=>{const i=Math.round(x*size),j=Math.round(y*size);if(i>=0&&j>=0&&i<size&&j<size)px.set([...c.map(v=>Math.round(255*v)),255],(j*size+i)*4);};
 for(let b=0;b<7;b++){const y0=.1+.8*b/6+(r()-.5)*.05,dir=r()<.5?-1:1,len=.35+.15*r();
  for(let t=0;t<=1;t+=.5/size){const x=.5+dir*t*len,y=y0+.18*t*t;dot(x,y,[.12,.1,.06]);
   if(Math.floor(t*size*1.3)%2===0)for(const side of [-1,1])for(let q=0;q<.07*(1-t*.5);q+=.5/size){const g=.1+.12*r();dot(x+dir*q*.4,y+side*q,[g*.55,g*1.15,g*.6]);}}}
 for(let t=0;t<1;t+=.5/size)dot(.5,.02+.96*t,[.14,.11,.07]);
 return {width:size,height:size,data:px};
}
// Rough meadow tuft: ~55 tapering blades fanning out of a narrow base and arching
// over, so the clump has a rounded, ragged silhouette; a few dry seed stems.
export function tuftPixels(size=128,seed=7){
 const r=rng(seed),px=new Uint8Array(size*size*4);
 const paint=(x,y,rad,col)=>{for(let j=Math.floor((y-rad)*size);j<=Math.ceil((y+rad)*size);j++)for(let i=Math.floor((x-rad)*size);i<=Math.ceil((x+rad)*size);i++){if(i<0||j<0||i>=size||j>=size)continue;const u=(i+.5)/size-x,v=(j+.5)/size-y;if(u*u+v*v<=rad*rad)px.set([...col.map(c=>Math.round(255*Math.min(1,c))),255],(j*size+i)*4);}};
 for(let k=0;k<58;k++){const bx=.5+(r()-.5)*.22,ang=(r()-.5)*1.5,len=.45+.5*r()*(1-Math.abs(ang)*.35),w=.007+.006*r(),tone=.7+.5*r(),dry=r()<.3;
  for(let t=0;t<=1;t+=.5/size/len){const bend=ang*(.35+.9*t),x=bx+Math.sin(bend)*len*t*.55,y=.995-Math.cos(bend*.7)*len*t,f=t;
   const g=(.2+.16*f)*tone,col=dry?[g*1.25,g*1.15,g*.55]:[g*.8,g*1.2,g*.42];paint(x,y,Math.max(.0015,w*(1-f*.9)),col);}}
 for(let k=0;k<4;k++){const bx=.5+(r()-.5)*.2,lean=(r()-.5)*.4,top=.08+.12*r();for(let t=0;t<=1;t+=1/size){const x=bx+lean*(1-t)*.3,y=top+(1-top)*t;paint(x,y,.0025,[.45,.42,.26]);}
  for(let j=0;j<8;j++)paint(bx+lean*.3+(r()-.5)*.02,top+j*.01,.005,[.62,.55,.34]);}
 return {width:size,height:size,data:px};
}
// Perennial clump card: a fan of narrow leaves (grey-green for lavender) under
// 30 flowering stems of one kind (lavender spikes, white daisies, rudbeckia); cut-out.
export function flowerPixels(kind,size=128,seed=3){
 const r=rng(seed),px=new Uint8Array(size*size*4);
 const paint=(x,y,rad,col)=>{for(let j=Math.floor((y-rad)*size);j<=Math.ceil((y+rad)*size);j++)for(let i=Math.floor((x-rad)*size);i<=Math.ceil((x+rad)*size);i++){if(i<0||j<0||i>=size||j>=size)continue;const u=(i+.5)/size-x,v=(j+.5)/size-y;if(u*u+v*v<=rad*rad)px.set([...col.map(c=>Math.round(255*Math.min(1,c))),255],(j*size+i)*4);}};
 const flower={lavender:[.47,.4,.78],daisy:[.97,.96,.92],rudbeckia:[.98,.7,.1]}[kind];if(!flower)throw Error('Unknown flower');
 const leaf=kind==='lavender'?[.36,.45,.33]:[.17,.33,.12],step=.5/size;
 for(let k=0;k<70;k++){const bx=.5+(r()-.5)*.35,ang=(r()-.5)*2.2,len=.22+.3*r(),w=(kind==='lavender'?.006:.014)+.008*r(),tone=.7+.5*r();
  for(let t=0;t<=1;t+=step/len){const bend=ang*(.3+.8*t),x=bx+Math.sin(bend)*len*t*.6,y=.995-Math.cos(bend*.8)*len*t;paint(x,y,Math.max(.002,w*Math.sin(Math.PI*Math.min(1,t*1.1+.08))),leaf.map(c=>c*tone*(.8+.35*t)));}}
 for(let k=0;k<30;k++){const bx=.5+(r()-.5)*.3,top=.06+.32*r(),lean=(r()-.5)*.55,g=.2+.08*r();let fx=bx,fy=top;
  for(let t=0;t<=1;t+=step){const x=bx+lean*(1-t)*(1-t)*.6,y=top+(.98-top)*t;if(t===0){fx=x;fy=y;}paint(x,y,.003,[g*.65,g*1.25,g*.5]);}
  if(kind==='lavender'){for(let j=0;j<11;j++)paint(fx+(r()-.5)*.01,fy+j*.011,.009-.0004*j,flower.map(c=>c*(.75+.35*r())));}
  else{const R=kind==='daisy'?.03:.034;for(let j=0;j<14;j++){const a=j/14*Math.PI*2;paint(fx+Math.cos(a)*R*.62,fy+Math.sin(a)*R*.42,R*.42,flower.map(c=>c*(.9+.15*r())));}paint(fx,fy,R*.38,kind==='daisy'?[.95,.72,.12]:[.22,.12,.05]);}}
 return {width:size,height:size,data:px};
}
// Shredded-bark mulch: overlapping elongated chips, warm dark browns.
export function mulchPixels(size=256,seed=19){
 const r=rng(seed),px=new Uint8Array(size*size*4);for(let i=0;i<size*size;i++)px.set([38,28,20,255],i*4);
 for(let k=0;k<size*size/14;k++){const cx=r(),cy=r(),a=r()*Math.PI,len=.012+.02*r(),wid=len*(.25+.2*r()),t=.6+.8*r(),col=[.24*t,.16*t,.1*t];
  for(let y=Math.floor((cy-len)*size);y<=Math.ceil((cy+len)*size);y++)for(let x=Math.floor((cx-len)*size);x<=Math.ceil((cx+len)*size);x++){const u=(x+.5)/size-cx,v=(y+.5)/size-cy,p=u*Math.cos(a)+v*Math.sin(a),q=-u*Math.sin(a)+v*Math.cos(a);if((p/len)**2+(q/wid)**2>1)continue;const X=(x%size+size)%size,Y=(y%size+size)%size;px.set([...col.map(c=>Math.round(255*c)),255],(Y*size+X)*4);}}
 return {width:size,height:size,data:px};
}
// n vertical cards crossed about z, base at the origin, 1×1 (v flipped: the pixel
// generators write rows top-down); normals lean up so
// clumps shade softly like a volume rather than as flat planes.
export function crossGeometry(n=3){
 const pos=[],nrm=[],uv=[],idx=[],col=[];
 for(let k=0;k<n;k++){const a=k/n*Math.PI,c=Math.cos(a),s=Math.sin(a),o=pos.length/3;
  for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]]){pos.push((u-.5)*c,(u-.5)*s,v);const nx=-s*.75,ny=c*.75;nrm.push(nx,ny,.66);uv.push(u,1-v);const sh=.42+.58*v;col.push(sh,sh,sh);}
  idx.push(o,o+1,o+2,o,o+2,o+3);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);return g;
}

// One grass blade: 3 segments, tapering, curving forward; z up, base at origin.
function bladeGeometry(){
 const pos=[],idx=[],n=3;
 const col=[];for(let i=0;i<=n;i++){const t=i/n,w=.0032*(1-t*.85),bend=.012*t*t,shade=.35+.5*t;pos.push(-w,bend,t,w,bend,t);col.push(shade,shade,shade*.9,shade,shade,shade*.9);}
 for(let i=0;i<n;i++){const a=i*2;idx.push(a,a+1,a+3,a,a+3,a+2);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
 // Base of the sward sits in its own shade (vertex gradient); normals mostly up so blades read like a lawn surface, not flat cards.
 const nrm=g.attributes.normal;for(let i=0;i<nrm.count;i++){nrm.setXYZ(i,nrm.getX(i)*.35,nrm.getY(i)*.35,.94);}nrm.needsUpdate=true;
 return g;
}

// Vegetation: dielectric but with a low specular level (waxy-to-matt leaves, not
// glossy paint), otherwise grazing sky reflection washes foliage out to pale grey.
const foliage=params=>new THREE.MeshPhysicalMaterial({specularIntensity:.07,...params});
// Leaf material from generated leaf maps: alpha cut-out (alpha-to-coverage on the
// multisampled target softens the edge), tangent-space normal map, species gloss.
function leafMaterial(data,{translucency=.45,wind=0,time=null,specular=.3,normalScale=1}={}){
 const t=leafTextures(data);
 const m=foliage({map:t.map,normalMap:t.normalMap,normalScale:new THREE.Vector2(normalScale,normalScale),alphaTest:.5,alphaToCoverage:true,side:THREE.DoubleSide,roughness:data.roughness,specularIntensity:specular});
 m.userData.leafTextures=t;installLeafTranslucency(m,translucency);if(wind&&time)installLeafWind(m,time,wind);return m;
}
function swayMaterial(base,uniforms,amount){
 const previous=base.onBeforeCompile,key=base.customProgramCacheKey();
 base.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.uniforms.tianWind=uniforms.time;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float tianWind;').replace('#include <begin_vertex>',`#include <begin_vertex>
  #ifdef USE_INSTANCING
   vec3 tianRoot=instanceMatrix[3].xyz;
  #else
   vec3 tianRoot=vec3(0.);
  #endif
  float tianPhase=tianRoot.x*.7+tianRoot.y*.9;
  // Gust fronts roll across the whole landscape (same field everywhere), so grass
  // and flowers bend together in travelling waves rather than each on its own.
  float tianGust=.35+1.15*smoothstep(-.2,1.0,.55*sin(dot(tianRoot.xy,vec2(.09,.035))-tianWind*1.25)+.45*sin(dot(tianRoot.xy,vec2(.021,.03))-tianWind*.47));
  transformed.xy+=(vec2(sin(tianWind*1.3+tianPhase),cos(tianWind*1.1+tianPhase*1.3))*.6+vec2(.8,.3)*tianGust)*${amount.toFixed(3)}*tianGust*transformed.z*transformed.z;`);};
 base.customProgramCacheKey=()=>key+'|tian-sway-'+amount;return base;
}

// Rolling ground beyond the plot: flat (just below the plot surfaces) inside a
// 12 m apron round the hedge, rising into gentle swells further out (±2.5 m at
// 150 m), so the horizon is not a ruler-flat disc. Deterministic in world xy.
export function terrainHeight(x,y,plot){
 const [x0,y0,x1,y1]=plot.bounds,d=Math.max(x0-x,x-x1,y0-y,y-y1,0),ramp=Math.min(1,Math.max(0,(d-12)/90));
 const n=Math.sin(x*.021+1.3)*Math.cos(y*.017+.4)+.6*Math.sin(x*.047-y*.039+2.1)+.35*Math.sin(x*.093+y*.081);
 return -.03+ramp*ramp*(3.2*n/1.95+1.2*ramp);
}
// Distant hills: a ring 380–1100 m out with layered ridgelines (forested, dark),
// seen through the aerial haze for depth on every side.
export function hillRingGeometry(seed=5,segments=256){
 const r=rng(seed),ph=[r()*6,r()*6,r()*6],pos=[],col=[],idx=[],rings=[380,420,470,530,600,680,770,880,1000,1100];
 for(let j=0;j<rings.length;j++)for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,R=rings[j],k=j/(rings.length-1);
  const ridge=Math.max(0,Math.sin(a*3+ph[0])*.5+Math.sin(a*7+ph[1])*.3+Math.sin(a*17+ph[2])*.12+.45);
  const h=j===0?-1:j===rings.length-1?-1:(12+34*ridge)*Math.pow(Math.sin(k*Math.PI),.7)*(.85+.15*Math.sin(a*11+j*1.7));
  pos.push(Math.cos(a)*R,Math.sin(a)*R,h);
  // Woodland and field patches on the slopes (dark canopy vs lighter pasture), so the
  // ridges read as forested country through the haze rather than smooth plastic.
  const wood=Math.sin(a*23+j*1.9)*Math.sin(a*9-j*2.7)+.4*Math.sin(a*61+j*5.1)>.05?1:0,g=(.55+.3*ridge)*(wood?.75:1.35)*(.85+.3*r());col.push((wood?.05:.11)*g,(wood?.085:.14)*g,(wood?.06:.07)*g);}
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;idx.push(a,b,a+1,a+1,b,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
// Fallen-leaf scatter card: a few curled, browned leaves on transparency.
export function fallenLeafPixels(size=128,seed=3){
 const r=rng(seed),px=new Uint8Array(size*size*4);
 for(let k=0;k<7;k++){const cx=.15+.7*r(),cy=.15+.7*r(),a=r()*Math.PI,len=.1+.07*r(),wid=len*.45,t=r(),col=t<.4?[.48,.33,.14]:t<.75?[.62,.48,.2]:[.36,.24,.12],curl=.3+.4*r();
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=(x+.5)/size-cx,v=(y+.5)/size-cy,p=u*Math.cos(a)+v*Math.sin(a),q=-u*Math.sin(a)+v*Math.cos(a),tt=p/len;if(Math.abs(tt)>1)continue;
   const half=wid*Math.sqrt(1-tt*tt);if(Math.abs(q)>half)continue;const shade=(1-curl*Math.abs(q)/half)*(Math.abs(q)<half*.08?.75:1),i=(y*size+x)*4;px.set([...col.map(c=>Math.round(255*c*shade)),255],i);}}
 return {width:size,height:size,data:px};
}
// Split one big InstancedMesh into spatial chunks (cell × cell metres) so frustum
// culling skips off-screen ground cover and distant chunks can be hidden outright.
export const SCAN_GROUND_COVER=new Set(['periwinkle_plant','dandelion_01','weed_plant_02','fern_02']);
export function chunkInstances(im,cell=12,maxDist=Infinity){
 const groups=new Map(),m=new THREE.Matrix4(),c=new THREE.Color(),p=new THREE.Vector3();
 for(let i=0;i<im.count;i++){im.getMatrixAt(i,m);p.setFromMatrixPosition(m);const k=Math.floor(p.x/cell)+','+Math.floor(p.y/cell);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);}
 const out=[];for(const ids of groups.values()){const ch=new THREE.InstancedMesh(im.geometry,im.material,ids.length);ids.forEach((id,j)=>{im.getMatrixAt(id,m);ch.setMatrixAt(j,m);if(im.instanceColor){im.getColorAt(id,c);ch.setColorAt(j,c);}});
  ch.computeBoundingSphere();ch.castShadow=im.castShadow;ch.receiveShadow=im.receiveShadow;ch.userData={...im.userData,maxDist};ch.name=im.name;out.push(ch);}
 return out;
}
// Tangent-space normal map from a cut-out card: height = blurred coverage plus a
// little luminance, so blades and petals read rounded instead of flat paper.
export function normalFromCutout({width:w,height:h,data},strength=2.2){
 const H=new Float32Array(w*h);for(let i=0;i<w*h;i++)H[i]=data[i*4+3]/255*.8+(data[i*4]+data[i*4+1])/510*.2;
 const B=new Float32Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,n=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=Math.min(w-1,Math.max(0,x+dx)),yy=Math.min(h-1,Math.max(0,y+dy));s+=H[yy*w+xx];n++;}B[y*w+x]=s/n;}
 const out=new Uint8Array(w*h*4),at=(x,y)=>B[Math.min(h-1,Math.max(0,y))*w+Math.min(w-1,Math.max(0,x))];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=(at(x+1,y)-at(x-1,y))*strength,dy=(at(x,y-1)-at(x,y+1))*strength,l=Math.hypot(dx,dy,1);out.set([Math.round(127.5-127.5*dx/l),Math.round(127.5-127.5*dy/l),Math.round(127.5+127.5/l),255],(y*w+x)*4);}
 const t=new THREE.DataTexture(out,w,h,THREE.RGBAFormat);t.colorSpace=THREE.NoColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;
}
// Scanned plants arrive at full scan density (a periwinkle is ~35k triangles);
// instanced by the hundred that is millions of triangles for ground cover. Keep
// each part under a per-plant budget by edge-collapse simplification, once per
// model (cached), so the silhouette survives and the frame stays affordable.
const SCAN_BUDGET={periwinkle_plant:500,dandelion_01:400,weed_plant_02:600,fern_02:1500,shrub_02:6000,shrub_03:3000,shrub_04:2500,garden_hose_wall_mounted_01:4000};
const simplified=new Map();
export async function simplifiedScanGeometry(id,geometry,budget=SCAN_BUDGET[id]??4000){
 const key=id+':'+geometry.uuid;if(simplified.has(key))return simplified.get(key);
 const tris=(geometry.index?geometry.index.count:geometry.attributes.position.count)/3;let out=geometry;
 if(tris>budget*1.15){try{let g=geometry.clone();for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);if(!g.index)g=mergeVertices(g);
   // Each collapse removes one vertex and about two triangles on a closed-ish mesh.
   const removeVerts=Math.floor(Math.min(g.attributes.position.count*.92,(tris-budget)/2));out=await new SimplifyModifier().modify(g,Math.max(0,removeVerts));out.computeVertexNormals();g.dispose();}catch(e){console.warn('Scan simplification failed',id,e);out=geometry;}}
 simplified.set(key,out);return out;
}
function blobTexture(){const px=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const d=Math.hypot(x-31.5,y-31.5)/32,a=Math.max(0,1-d);px.set([0,0,0,Math.round(255*a*a*(3-2*a))],(y*64+x)*4);}const t=new THREE.DataTexture(px,64,64,THREE.RGBAFormat);t.needsUpdate=true;return t;}
export function createExteriorLandscape(scene,{quality=1,scanned=typeof document!=='undefined',onChange=()=>{}}={}){
 const root=new THREE.Group();root.name='exterior-landscape';scene.add(root);
 const uniforms={time:{value:0}};const disposables=[];let built=false;
 const track=(...items)=>{disposables.push(...items);return items[0];};
 let generation=0;const animated=[];
 function clear(){generation++;for(const a of animated.splice(0))a.dispose();for(const c of [...root.children])root.remove(c);for(const d of disposables.splice(0))d.dispose();built=false;}
 // exterior: the house's saved exterior design (scene.exterior via resolveExterior);
 // omitted means the automatic defaults, i.e. how houses rendered before it existed.
 function rebuild(squares,{facades=[],doors=[],exterior=null}={}){
  clear();if(!squares?.length)return;const X=exterior||resolveExterior(null);
  const plot=plotLayout(squares),[x0,y0,x1,y1]=plot.bounds,[cx,cy]=plot.centre,r=rng(97);
  const trackGroup=g=>{g.traverse(o=>{if(o.geometry)track(o.geometry);for(const mt of [].concat(o.material||[])){track(mt);if(mt.map)track(mt.map);}});for(const d of g.userData.disposables||[])track(d);return g;};
  // 0. Surroundings: lane, drive, gate, poles, cottages, worn path; and what to keep clear of.
  const paving=squares.filter(q=>q.z===0&&/exterior|paving|stone/.test(q.tiles?.[0]||'')).map(q=>[q.x,q.y]);
  const context=trackGroup(buildExteriorContext({plot,terrainHeight,doors,paving}));if(X.surroundings.enabled)root.add(context);const blocked=context.userData.blocked;
  const aoSpots=[]; // ground contact occlusion under trees, shrubs and the hedge
  // 1. Meadow to the horizon (plot surfaces sit above it).
  const lawnTex=track(dataTexture((()=>{const p=lawnPixels({size:1024,seed:23});const d=new Uint8Array(p.color.length);d.set(p.color);return {width:p.width,height:p.height,data:d};})(),true,true));
  const groundGeo=track(new THREE.PlaneGeometry(1600,1600,200,200));const uv=groundGeo.attributes.uv,gp=groundGeo.attributes.position;for(let i=0;i<uv.count;i++){uv.setXY(i,uv.getX(i)*1600/1.3,uv.getY(i)*1600/1.3);gp.setZ(i,terrainHeight(gp.getX(i)+cx,gp.getY(i)+cy,plot)+.03);}groundGeo.computeVertexNormals();
  // Scanned grass ground (CC0) where the browser can load it; procedural lawn otherwise.
  // The scanned grass_ground set is mostly bare soil at meadow distances (it read as a
  // ploughed field); the meadow keeps the procedural sward, scans stay for close work.
  const groundMaps={map:lawnTex};
  const groundMat=track(installGroundVariation(installSurfaceVariation(foliage({...groundMaps,roughness:1,color:0xa3a372}),{tone:.34,roughness:.1,scale:.09}),{dry:.85,lush:.25}));
  const ground=new THREE.Mesh(groundGeo,groundMat);ground.position.set(cx,cy,-.03);ground.receiveShadow=true;ground.name='meadow';root.add(ground);
  // Hills (0.4–1 km) are drawn pre-lit in aerial perspective — woodland blue-green,
  // paler pasture, lifted toward the haze — and dimmed with daylight; full lighting
  // under the bright sky dome washed them out to grey felt.
  const hillMat=new THREE.MeshBasicMaterial({vertexColors:true,fog:false});hillMat.userData.tianLandscapeInstalled=true;hillMat.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <dithering_fragment>','gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.30,.38,.44)*diffuse,.30);\n#include <dithering_fragment>');};hillMat.customProgramCacheKey=()=>'tian-hills-aerial-v3';
  const hills=new THREE.Mesh(track(hillRingGeometry(5)),track(hillMat));hills.position.set(cx,cy,0);hills.name='hills';hills.userData.indirectCaptureExclude=true;root.add(hills);
  // 2. Distant tree line: two species, ring 55–260 m, clumped, never inside the plot.
  const farCard=track(new THREE.PlaneGeometry(1,1));
  // Five species/shape variants so the tree line does not repeat one silhouette.
  for(const [conifer,vseed,share] of [[false,4,120],[false,8,110],[false,15,100],[true,3,95],[true,11,75]]){
   const geo=track(distantTreeGeometry(conifer,vseed)),mat=track(foliage({vertexColors:true,roughness:.95,side:conifer?THREE.DoubleSide:THREE.FrontSide}));
   const n=Math.round(share*quality),mesh=new THREE.InstancedMesh(geo,mat,n),m=new THREE.Matrix4(),c=new THREE.Color(),cm=new THREE.Matrix4();
   const crownTex=conifer?track(dataTexture(needlePixels(128,9))):track(leafTextures(clusterCard('ovate',{size:256,leaves:90,leafScale:[.1,.16],seed:71,sourceSize:64})).map);
   const crown=new THREE.InstancedMesh(farCard,track(foliage({map:crownTex,alphaTest:.3,side:THREE.DoubleSide,roughness:.85})),n*geo.userData.cards.length);let ci2=0;
   for(let i=0;i<n;i++){let a,d,tx,ty,tries=0;do{a=r()*Math.PI*2;d=55+Math.pow(r(),.7)*205;const clump=Math.sin(a*5+1.3)*.5+.5;if(r()>.35+.6*clump){a+=.2;d+=20;}tx=cx+Math.cos(a)*d;ty=cy+Math.sin(a)*d;}while(blocked(tx,ty)&&++tries<20);
    const s=(.7+.9*r())*(d>140?1.25:1);aoSpots.push([tx,ty,2.6*s,.32]);m.compose(new THREE.Vector3(tx,ty,terrainHeight(tx,ty,plot)-.05),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),r()*6.3),new THREE.Vector3(s,s,s*(.85+.4*r())));
    mesh.setMatrixAt(i,m);mesh.setColorAt(i,c.setRGB(.8+.4*r(),.85+.3*r(),.75+.35*r()));
    // Leaf-cluster (or needle-spray) cards over the crown break the smooth silhouette.
    const q=new THREE.Quaternion(),sc=new THREE.Vector3(),pp=new THREE.Vector3();m.decompose(pp,q,sc);
    for(const k of geo.userData.cards){const n=new THREE.Vector3(...k.n).applyQuaternion(q).normalize().add(new THREE.Vector3(r()-.5,r()-.5,r()-.5).multiplyScalar(.6)).normalize();
     cm.compose(new THREE.Vector3(...k.p).multiply(sc).applyQuaternion(q).add(pp),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),n).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),r()*6.3)),new THREE.Vector3(1,1,1).multiplyScalar(k.s*sc.x));
     crown.setMatrixAt(ci2,cm);crown.setColorAt(ci2++,c.setHSL(conifer?.32+.04*r():.22+.06*r(),.4+.15*r(),(conifer?.2:.26)+.14*(k.n[2]+1)/2+.06*r()));}}
   crown.count=ci2;crown.castShadow=false;crown.receiveShadow=false;crown.userData.indirectCaptureExclude=true;crown.name=(conifer?'conifers':'tree-line')+'-foliage';root.add(crown);
   mesh.castShadow=false;mesh.receiveShadow=false;mesh.userData.indirectCaptureExclude=true;mesh.name=conifer?'conifers':'tree-line';root.add(mesh);
  }
  // 3. Garden trees on lawn far from the house, with dappled leaf shadows.
  const leafMat=track(leafMaterial(clusterCard('ovate',{size:512,leaves:46,leafScale:[.14,.22],seed:11,sourceSize:256}),{translucency:.55,wind:.012,time:uniforms.time,specular:.25}));track(...Object.values(leafMat.userData.leafTextures));
  const barkPx=barkPixels(256,13),barkTex=track(dataTexture(barkPx,true,true)),barkBump=track(dataTexture({width:barkPx.width,height:barkPx.height,data:barkPx.relief},false,true));
  const barkMaps=scanned?(()=>{const t=scannedTextureSet('bark_willow');for(const x of [t.map,t.normalMap])x.repeat.set(.55,.7);return t;})():{map:barkTex,bumpMap:barkBump,bumpScale:4};
  const barkMat=track(installSurfaceVariation(new THREE.MeshStandardMaterial({vertexColors:true,...barkMaps,roughness:scanned?1:.95,color:scanned?0xffffff:0xffffff}),{tone:.2,roughness:.1,scale:3}));if(scanned)barkMat.vertexColors=false;
  const spots=plot.lawn.filter(([x,y])=>plot.distBuilt(x,y)>=5&&x>x0+1&&y>y0+1&&x<x1-2&&y<y1-2);
  const chosen=[];for(const pick of [[x0,y0],[x1,y0],[x0,y1],[x1,y1]]){const best=spots.filter(s=>chosen.every(c=>Math.hypot(c[0]-s[0],c[1]-s[1])>8)).sort((a,b)=>Math.hypot(a[0]-pick[0],a[1]-pick[1])-Math.hypot(b[0]-pick[0],b[1]-pick[1]))[0];if(best)chosen.push(best);}
  if(X.gardenTrees.mode==='none')chosen.length=0;
  else if(X.gardenTrees.mode==='listed')chosen.splice(0,chosen.length,...X.gardenTrees.trees.map(t=>[t.x-.5,t.y-.5,t.height,t.seed]));
  const card=track(new THREE.PlaneGeometry(1,1));
  // Crown clusters are crossed pairs (the card plus one turned 90° about its own
  // horizontal axis): cards on the crown's flanks stand vertical and went edge-on,
  // streaky, when the crown is seen from above; the second plane faces up there.
  const crownCard=track((()=>{const a=new THREE.PlaneGeometry(1,1),b=new THREE.PlaneGeometry(1,1);b.rotateX(Math.PI/2);const g=mergeGeometries([a,b]);a.dispose();b.dispose();return g;})());
  // Cards face outward from the crown (normal ≈ radial + jitter): the canopy then
  // shades like one soft volume — lit crown top, darker underside — not loose paper.
  const Z=new THREE.Vector3(0,0,1),outward=(radial,jitter)=>{const n=radial.clone().normalize().add(new THREE.Vector3(r()-.5,r()-.5,r()-.5).multiplyScalar(jitter)).normalize();return new THREE.Quaternion().setFromUnitVectors(Z,n).multiply(new THREE.Quaternion().setFromAxisAngle(Z,r()*Math.PI*2));};
  chosen.forEach(([x,y,th,ts],k)=>{const autoH=6.5+r()*2.5,t=gardenTree(ts??31+k*17,th??autoH);track(t.wood);const wood=new THREE.Mesh(t.wood,barkMat);wood.position.set(x+.5,y+.5,0);wood.castShadow=true;wood.receiveShadow=true;wood.name='garden-tree';root.add(wood);
   const leaves=new THREE.InstancedMesh(crownCard,leafMat,t.leaves.length),m=new THREE.Matrix4(),c=new THREE.Color();
   const centre=t.leaves.reduce((a,L)=>a.add(L.p),new THREE.Vector3()).multiplyScalar(1/t.leaves.length),reach=Math.max(...t.leaves.map(L=>L.p.distanceTo(centre)));
   t.leaves.forEach((L,i)=>{const radial=L.p.clone().sub(centre),depth=radial.length()/reach;radial.z+=.25*reach;m.compose(L.p.clone().add(new THREE.Vector3(x+.5,y+.5,0)),outward(radial,.9),new THREE.Vector3(L.s,L.s,L.s));leaves.setMatrixAt(i,m);
    // Inner leaves sit in the crown's own shade.
    leaves.setColorAt(i,c.setHSL(.24+.05*r(),.5,.2+.22*depth+.08*r()));});
   leaves.castShadow=true;leaves.receiveShadow=true;leaves.name='garden-tree-leaves';root.add(leaves);});
  // 4. Boundary hedge just outside the plot, open where a path leaves.
  const hedgeMat=track(leafMaterial(clusterCard('box',{size:512,leaves:110,leafScale:[.09,.14],seed:29,sourceSize:128}),{translucency:.3,wind:.004,time:uniforms.time,specular:.15}));track(...Object.values(hedgeMat.userData.leafTextures));
  // Core reads as foliage depth, not a painted box: an opaque leaf mat over dark gaps.
  const corePx=clusterCard('box',{size:512,leaves:900,leafScale:[.07,.11],seed:53,sourceSize:128,wrap:true});for(let i=0;i<corePx.color.length;i+=4)if(corePx.color[i+3]<255){corePx.color.set([22,34,16,255],i);corePx.normal.set([128,128,255,255],i);}
  const coreMaps=leafTextures(corePx,{repeat:true}),coreTex=track(coreMaps.map);track(coreMaps.normalMap);
  const hedgeCore=track(installSurfaceVariation(foliage({map:coreTex,normalMap:coreMaps.normalMap,color:0xffffff,roughness:.85,specularIntensity:.12}),{tone:.3,roughness:.1,scale:2}));
  const runs=[];const gapAt=(x,y)=>plot.gaps.some(([gx,gy])=>Math.abs(gx-x)<=1&&Math.abs(gy-y)<=1);
  for(let x=x0;x<x1;x++){if(!gapAt(x,y0))runs.push([x+.5,y0-.45,0]);if(!gapAt(x,y1-1))runs.push([x+.5,y1+.45,0]);}
  for(let y=y0;y<y1;y++){if(!gapAt(x0,y))runs.push([x0-.45,y+.5,1]);if(!gapAt(x1-1,y))runs.push([x1+.45,y+.5,1]);}
  // Corner blocks close the L where two runs meet (otherwise a bare end face shows).
  for(const [x,y,gx,gy] of [[x0-.45,y0-.45,x0,y0],[x1+.45,y0-.45,x1-1,y0],[x0-.45,y1+.45,x0,y1-1],[x1+.45,y1+.45,x1-1,y1-1]])if(!gapAt(gx,gy))runs.push([x,y,0,true]);
  if(!X.hedge.enabled)runs.length=0;const hk=X.hedge.height/1.05;
  const coreGeo=track(new THREE.BoxGeometry(1,.62,1.05));coreGeo.translate(0,0,.525);{const cu=coreGeo.attributes.uv;for(let i=0;i<cu.count;i++)cu.setXY(i,cu.getX(i)*2.2,cu.getY(i)*2.2);}
  const cores=new THREE.InstancedMesh(coreGeo,hedgeCore,runs.length),m=new THREE.Matrix4();
  runs.forEach(([x,y,side,corner],i)=>{m.compose(new THREE.Vector3(x,y,0),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),side?Math.PI/2:0),new THREE.Vector3(corner?.62:1,1,hk));cores.setMatrixAt(i,m);});
  cores.castShadow=true;cores.receiveShadow=true;cores.name='hedge';root.add(cores);
  const perRun=Math.round(72*quality),cards=new THREE.InstancedMesh(card,hedgeMat,runs.length*perRun),c=new THREE.Color();let ci=0;
  for(const [x,y,side] of runs)for(let k=0;k<perRun;k++){const along=r()-.5,face=r()<.5?-1:1,top=r()<.42;
   const lx=along*1.05,ly=top?(r()-.5)*.62:face*(.31+.04*r()),lz=(top?1.02+.05*r():.08+r()*.95)*hk,px=side?x+ly:x+lx,py=side?y+lx:y+ly;
   const nx=top?0:(side?face:0),ny=top?0:(side?0:face);m.compose(new THREE.Vector3(px,py,lz),outward(new THREE.Vector3(nx,ny,top?1:.15),.8),new THREE.Vector3(.32,.32,.32));cards.setMatrixAt(ci,m);cards.setColorAt(ci++,c.setHSL(.24+.03*r(),.45,.2+.1*r()));}
  cards.castShadow=false;cards.receiveShadow=true;cards.name='hedge-leaves';root.add(cards);
  // 5. Grass blades over the lawn (mown, 5–11 cm).
  // Whole lawn: full density within 4 m of the house, easing to 55% beyond 8 m
  // (seen from further away there), so the sward never shows an edge.
  const near=plot.lawn.map(([x,y])=>[x,y,plot.distBuilt(x,y)]);
  const perCell=Math.round(100*quality),bladeGeo=track(bladeGeometry());
  const bladeMat=track(swayMaterial(foliage({color:0xffffff,vertexColors:true,roughness:1,envMapIntensity:.6,side:THREE.DoubleSide}),uniforms,.04));
  const blades=new THREE.InstancedMesh(bladeGeo,bladeMat,near.length*perCell);let bi=0;
  for(const [x,y,d] of near)for(let k=0;k<perCell;k++){const keep=.55+.45*Math.min(1,Math.max(0,(8-d)/4));if(r()>keep){r();r();r();continue;}const h=.05+.06*r();m.compose(new THREE.Vector3(x+r(),y+r(),0),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),r()*6.3),new THREE.Vector3(1,1,h));blades.setMatrixAt(bi,m);blades.setColorAt(bi++,c.setHSL(.23+.05*r(),.55+.15*r(),.09+.07*r()));}
  blades.count=bi;
  blades.castShadow=false;blades.receiveShadow=true;blades.userData.indirectCaptureExclude=true;blades.name='grass-blades';for(const ch of chunkInstances(blades,8,45))root.add(ch);blades.dispose?.();
  // 6. Planted border inside the hedge: mulch bed with steel edging, shrubs and
  //    perennial clumps, skipping the path gaps and the house surroundings.
  const bedCells=X.borders.enabled?plot.lawn.filter(([x,y])=>(x===x0||y===y0||x===x1-1||y===y1-1)&&!gapAt(x,y)&&plot.distBuilt(x,y)>2.5):[];
  const planting=X.borders.planting;
  const mulchTex=track(dataTexture(mulchPixels(256,19),true,true));
  const mulchMaps=scanned?(()=>{const t=scannedTextureSet('wood_chips');for(const x of [t.map,t.normalMap])x.repeat.set(1/1.6/2,1/1.5/2);return t;})():{map:mulchTex};
  const bedMat=track(installSurfaceVariation(foliage({...mulchMaps,roughness:scanned?1:.95,color:scanned?0xffffff:0xb8aca0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),{tone:.25,roughness:.1,scale:1}));
  const bedGeo=track(new THREE.PlaneGeometry(1,.95));const buv=bedGeo.attributes.uv;for(let i=0;i<buv.count;i++)buv.setXY(i,buv.getX(i)*1.6,buv.getY(i)*1.5);
  const beds=new THREE.InstancedMesh(bedGeo,bedMat,bedCells.length),edgeGeo=track(new THREE.BoxGeometry(1,.012,.05));edgeGeo.translate(0,0,.012);
  const edging=new THREE.InstancedMesh(edgeGeo,track(new THREE.MeshStandardMaterial({color:0x3a3430,metalness:.6,roughness:.55})),bedCells.length);
  const inward=(x,y)=>x===x0?[1,0]:x===x1-1?[-1,0]:y===y0?[0,1]:[0,-1];
  bedCells.forEach(([x,y],i)=>{const [ix,iy]=inward(x,y),rot=ix?Math.PI/2:0;
   m.compose(new THREE.Vector3(x+.5-ix*.025,y+.5-iy*.025,.012),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),rot),new THREE.Vector3(1,1,1));beds.setMatrixAt(i,m);
   m.compose(new THREE.Vector3(x+.5+ix*.45,y+.5+iy*.45,0),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),rot),new THREE.Vector3(1,1,1));edging.setMatrixAt(i,m);});
  beds.receiveShadow=true;beds.name='border-beds';edging.receiveShadow=true;edging.castShadow=true;edging.name='bed-edging';root.add(beds,edging);
  // Shrubs: leaf-card shells (box/hebe-like domes) every other bed cell.
  const shrubAt=planting==='meadow'?[]:planting==='box'?bedCells:bedCells.filter((_,i)=>i%2===0),shrubCards=Math.round(420*quality),shrubs=new THREE.InstancedMesh(card,hedgeMat,shrubAt.length*shrubCards);let si=0;
  const shrubCoreGeo=track((()=>{let g=new THREE.IcosahedronGeometry(1,3);g.deleteAttribute('normal');g=mergeVertices(g);const p=g.attributes.position,q=rng(77);const ph=[q()*6,q()*6,q()*6];for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=1+.07*Math.sin(x*5+ph[0])*Math.sin(y*6+ph[1])+.05*Math.sin(z*7+ph[2]);p.setXYZ(i,x*f,y*f,z*f);}g.computeVertexNormals();return g;})()),shrubCores=new THREE.InstancedMesh(shrubCoreGeo,track(foliage({map:coreTex,color:0x6f7a64,roughness:.95,specularIntensity:.05})),shrubAt.length);let sc=0;
  for(const [x,y] of shrubAt){const R=.32+.2*r(),cx=x+.3+.4*r(),cy=y+.3+.4*r(),hz=R*(.75+.25*r());m.compose(new THREE.Vector3(cx,cy,hz),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),r()*6.3),new THREE.Vector3(R*.95,R*.95,hz*.95));shrubCores.setMatrixAt(sc++,m);
   for(let k=0;k<shrubCards;k++){const z=r()*1.1-.15,a=r()*Math.PI*2,rr=Math.sqrt(Math.max(0,1-z*z)),n=new THREE.Vector3(rr*Math.cos(a),rr*Math.sin(a),z);
    m.compose(new THREE.Vector3(cx+n.x*R*1.02,cy+n.y*R*1.02,Math.max(.05,hz+n.z*hz*1.02)),outward(n,.7),new THREE.Vector3(.25,.25,.25));shrubs.setMatrixAt(si,m);shrubs.setColorAt(si++,c.setHSL(.22+.06*r(),.45,.16+.14*(z+1)/2+.05*r()));}}
  shrubCores.castShadow=true;shrubCores.receiveShadow=true;shrubCores.name='shrub-cores';root.add(shrubCores);
  shrubs.castShadow=true;shrubs.receiveShadow=true;shrubs.name='shrubs';root.add(shrubs);
  // Perennials between the shrubs, in drifts of one kind.
  const clump=track(crossGeometry(3));let drift=0;
  for(const kind of ['lavender','daisy','rudbeckia']){if(planting==='box'||planting==='lavender'&&kind!=='lavender'||planting==='meadow'&&kind==='lavender'){drift++;continue;}
   const fpx=flowerPixels(kind,256,7+drift),tex=track(dataTexture(fpx)),fnm=track(normalFromCutout(fpx)),mat=track(swayMaterial(installLeafTranslucency(foliage({vertexColors:true,map:tex,normalMap:fnm,alphaTest:.45,side:THREE.DoubleSide,roughness:.8}),.45),uniforms,.06));
   const cells=bedCells.filter((_,i)=>planting==='mixed'?i%2===1&&Math.floor(i/6)%3===drift:planting==='meadow'?i%2===drift-1:i%2===1),per=3,mesh=new THREE.InstancedMesh(clump,mat,Math.max(1,cells.length*per));let fi=0;
   for(const [x,y] of cells)for(let k=0;k<per;k++){const h=(kind==='lavender'?.45:.6)*(.8+.4*r());m.compose(new THREE.Vector3(x+.2+.6*r(),y+.2+.6*r(),.01),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),r()*Math.PI),new THREE.Vector3(h*1.1,h*1.1,h));mesh.setMatrixAt(fi++,m);}
   mesh.count=fi;mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='perennials-'+kind;root.add(mesh);drift++;}
  // 7. Rough meadow tufts outside the hedge (unmown, 35–75 cm), thinning with distance.
  const tuftPx=tuftPixels(256,41),tuftTex=track(dataTexture(tuftPx)),tuftNm=track(normalFromCutout(tuftPx,1.6)),tuftMat=track(swayMaterial(installLeafTranslucency(foliage({vertexColors:true,map:tuftTex,normalMap:tuftNm,alphaTest:.4,side:THREE.DoubleSide,roughness:.9}),.45),uniforms,.08));
  const tuftN=Math.round(16000*quality),tufts=new THREE.InstancedMesh(clump,tuftMat,tuftN);let ti=0;
  for(let i=0;i<tuftN*5&&ti<tuftN;i++){const px=x0-55+r()*(x1-x0+110),py=y0-55+r()*(y1-y0+110),d=Math.max(x0-px,px-x1,y0-py,py-y1);if(d<1.4||r()>Math.exp(-d/26)||blocked(px,py))continue;
   const h=.35+.4*r();m.compose(new THREE.Vector3(px,py,terrainHeight(px,py,plot)),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),r()*Math.PI),new THREE.Vector3(h*1.5,h*1.5,h));tufts.setMatrixAt(ti,m);tufts.setColorAt(ti++,c.setHSL(.16+.07*r(),.3+.2*r(),.6+.25*r()));}
  tufts.count=ti;tufts.castShadow=false;tufts.receiveShadow=true;tufts.userData.indirectCaptureExclude=true;tufts.name='meadow-tufts';for(const ch of chunkInstances(tufts,20,160))root.add(ch);
  // 9. Leaf litter under the garden trees: denser near the trunk, thinning to the
  //    crown's drip line; flat cards just above the lawn.
  const litterMaps=leafTextures(clusterCard('dry',{size:256,leaves:9,leafScale:[.22,.34],seed:3,sourceSize:128})),litterMat=track(foliage({map:track(litterMaps.map),normalMap:track(litterMaps.normalMap),alphaTest:.5,roughness:.85,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
  const litterPer=Math.round(110*quality),litter=new THREE.InstancedMesh(card,litterMat,chosen.length*litterPer);let li=0;
  for(const [tx,ty] of chosen)for(let k=0;k<litterPer;k++){const a=r()*Math.PI*2,d=Math.pow(r(),.65)*3.6,lx=tx+.5+Math.cos(a)*d,ly=ty+.5+Math.sin(a)*d;if(!plot.isLawn(Math.floor(lx),Math.floor(ly)))continue;
   m.compose(new THREE.Vector3(lx,ly,.014+.002*r()),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),r()*6.3),new THREE.Vector3(1,1,1).multiplyScalar(.28+.12*r()));litter.setMatrixAt(li,m);litter.setColorAt(li++,c.setHSL(.08+.05*r(),.35,.42+.2*r()));}
  litter.count=li;litter.receiveShadow=true;litter.name='leaf-litter';root.add(litter);
  // 8. Ivy trained on the trellis wires of long blank walls, grown as a vine: main
  //    stems from the root, side shoots along each wire, laterals off the shoots, and
  //    individual curved ivy leaves on petioles at the nodes (alternate, facing out
  //    and up to the light, larger and darker on old wood, small and fresh at tips).
  let climberLeaves=0;
  const climbOn=f=>X.climbers.mode==='auto'||X.climbers.mode==='listed'&&f.wallIds.some(id=>X.climbers.walls.includes(id));
  const climbSpans=facades.filter(climbOn).map(f=>[f,trellisSpan(f)]).filter(([,sp])=>sp);
  if(climbSpans.length){
   const vinePos=[],vineIdx=[],vineCol=[],vineUv=[],leafList=[];let seedK=0;
   for(const [f,sp] of climbSpans){const T=f.thickness/2,t=new THREE.Vector3(f.t[0],f.t[1],0),out=new THREE.Vector3(f.out[0],f.out[1],0),up=new THREE.Vector3(0,0,1);
    const at=(u,d,z)=>new THREE.Vector3(f.a[0]+f.t[0]*u+f.out[0]*(T+d),f.a[1]+f.t[1]*u+f.out[1]*(T+d),z),wires=[];for(let z=sp.z0;z<=sp.z1+1e-6;z+=.35)wires.push(z);
    const g=growClimber({u0:sp.u0,u1:sp.u1,z0:sp.z0,z1:sp.z1,base:f.base,wires,seed:41+17*seedK++,mainStems:3,density:quality});
    for(const [[u0,z0],[u1,z1],rad] of g.stems)branch(vinePos,vineIdx,vineCol,at(u0,.045,z0),at(u1,.045,z1),rad,rad*.92,5,rad>.004?[.11,.085,.06]:[.09,.11,.05],vineUv);
    for(const L of g.leaves){const along=t.clone().multiplyScalar(L.along[0]).addScaledVector(up,L.along[1]).addScaledVector(out,.35).normalize();
     const normal=out.clone().addScaledVector(up,.35+L.tilt*.4).addScaledVector(t,(r()-.5)*.5).normalize();
     leafList.push({p:at(L.u,.045+L.out,L.z),wall:at(L.u,.003,L.z-.01),wallQ:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),out),q:leafQuaternion(along,normal),size:L.size,age:L.age,gap:L.out});}}
   const vg=new THREE.BufferGeometry();vg.setAttribute('position',new THREE.Float32BufferAttribute(vinePos,3));vg.setAttribute('color',new THREE.Float32BufferAttribute(vineCol,3));vg.setAttribute('uv',new THREE.Float32BufferAttribute(vineUv,2));vg.setIndex(vineIdx);vg.computeVertexNormals();track(vg);
   const vines=new THREE.Mesh(vg,barkMat);vines.castShadow=true;vines.receiveShadow=true;vines.name='climber-stems';root.add(vines);
   const ivyMat=track(leafMaterial(leafTexture('ivy',256,12),{translucency:.4,wind:.0025,time:uniforms.time,specular:.3,normalScale:1.2}));track(...Object.values(ivyMat.userData.leafTextures));
   const ivyGeo=track(leafGeometry({fold:.22,curl:.18,rows:4})),climber=new THREE.InstancedMesh(ivyGeo,ivyMat,leafList.length);
   leafList.forEach((L,i)=>{m.compose(L.p,L.q,new THREE.Vector3(L.size,L.size,L.size));climber.setMatrixAt(i,m);climber.setColorAt(i,c.setHSL(.27+.04*(1-L.age)+.02*r(),.35+.2*(1-L.age),.22+.2*(1-L.age)+.05*r()));});
   climber.castShadow=true;climber.receiveShadow=true;climber.name='climber-leaves';root.add(climber);climberLeaves=leafList.length;
   // Contact occlusion on the wall behind each leaf: soft dark decals, darker and
   // tighter where the leaf sits close to the render (the AO pass skips cut-outs).
   const blobPx=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const d=Math.hypot(x-31.5,y-31.5)/32,a=Math.max(0,1-d)**2;blobPx.set([0,0,0,Math.round(255*a)],(y*64+x)*4);}
   const blobTex=track(new THREE.DataTexture(blobPx,64,64,THREE.RGBAFormat));blobTex.needsUpdate=true;
   const blobMat=track(new THREE.MeshBasicMaterial({map:blobTex,color:0x000000,transparent:true,opacity:.42,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));blobMat.userData.tianLandscapeInstalled=true; // unlit decal: no shadow/AO hooks
   const blobs=new THREE.InstancedMesh(card,blobMat,leafList.length);
   leafList.forEach((L,i)=>{const k=L.size*(1.5+L.gap*6);m.compose(L.wall,L.wallQ,new THREE.Vector3(k,k,k));blobs.setMatrixAt(i,m);});
   blobs.renderOrder=1;blobs.name='climber-contact';root.add(blobs);}
  // 10. Scanned CC0 plants (Poly Haven), instanced: low shrubs and periwinkle in the
  //     borders, a few large shrubs near the plot corners, ferns and weeds at the
  //     foot of the house, dandelions in the lawn margins, and a hose reel by the
  //     first long blank wall. Loaded asynchronously; a later rebuild drops them.
  if(scanned&&X.scannedPlants.enabled){const gen=generation,placements=new Map(),add=(id,x,y,z,yaw,s=1,tilt=null)=>{if(!placements.has(id))placements.set(id,[]);placements.get(id).push({x,y,z,yaw,s,tilt});};
   bedCells.forEach(([x,y],i)=>{const [ix,iy]=inward(x,y);if(i%3===1)add('shrub_04',x+.5-ix*.05,y+.5-iy*.05,.01,r()*6.3,.85+.3*r());if(i%5===3)add('shrub_03',x+.3+.4*r(),y+.3+.4*r(),.01,r()*6.3,.9+.4*r());
    for(let k=0;k<(i%2?1:0);k++)add('periwinkle_plant',x+.5+ix*.32+(r()-.5)*.6*(iy?1:0),y+.5+iy*.32+(r()-.5)*.6*(ix?1:0),.01,r()*6.3,.8+.4*r());});
   for(const [cxn,cyn] of [[x0+1.4,y0+1.4],[x1-1.4,y1-1.4],[x0+1.4,y1-1.4]])if(plot.isLawn(Math.floor(cxn),Math.floor(cyn))&&plot.distBuilt(cxn,cyn)>3)add('shrub_02',cxn,cyn,0,r()*6.3,.9+.2*r());
   const foot=plot.lawn.filter(([x,y])=>plot.distBuilt(x,y)<=1.01);foot.forEach(([x,y],i)=>{const n=[[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dy])=>!plot.isLawn(x+dx,y+dy)&&plot.built.some(([bx,by])=>bx===x+dx&&by===y+dy));if(!n)return;// Stay on the lawn side of the wall: ferns (≈0.8 m across) sit near the cell
    // centre so no frond reaches through the wall; weeds hug the wall foot with jitter
    // only along it, never across it.
    const along=(r()-.5)*.7,tx=-n[1]*along,ty=n[0]*along;
    if(i%4===0)add('fern_02',x+.5+n[0]*.05+tx*.4,y+.5+n[1]*.05+ty*.4,0,r()*6.3,.8+.3*r());else if(i%3===0)add('weed_plant_02',x+.5+n[0]*.3+tx,y+.5+n[1]*.3+ty,0,r()*6.3,.8+.5*r());});
   plot.lawn.filter(([x,y])=>plot.distBuilt(x,y)>3).forEach(([x,y])=>{if(r()<.025)add('dandelion_01',x+r(),y+r(),0,r()*6.3,.8+.4*r());});
   const wall=facades.find(f=>f.length>=4);if(wall){const T=wall.thickness/2,u=Math.min(1,wall.length*.2),hx=wall.a[0]+wall.t[0]*u+wall.out[0]*T,hy=wall.a[1]+wall.t[1]*u+wall.out[1]*T;add('garden_hose_wall_mounted_01',hx,hy,wall.base+.75,Math.atan2(wall.out[1],wall.out[0]),1,'wall');}
   for(const [id,list] of placements)loadScannedModel(id).then(async model=>{if(gen!==generation)return;
    for(const part of model.parts){const geo=await simplifiedScanGeometry(id,part.geometry);if(gen!==generation)return;const mesh=new THREE.InstancedMesh(geo,part.material,list.length),q=new THREE.Quaternion();
     list.forEach((p,i)=>{
      // glTF models face +Y after the up-axis turn; the hose reel's back goes to the wall.
      q.setFromAxisAngle(new THREE.Vector3(0,0,1),p.tilt==='wall'?p.yaw-Math.PI/2:p.yaw);m.compose(new THREE.Vector3(p.x,p.y,p.z),q,new THREE.Vector3(p.s,p.s,p.s));mesh.setMatrixAt(i,m);});
     // Ground cover (periwinkle, dandelions, weeds, ferns) is dense scan geometry in
     // many copies: it casts no shadows (contact AO grounds it) and is drawn in
     // distance-culled chunks like the grass. Shrubs keep shadows and a longer range.
     const ground=SCAN_GROUND_COVER.has(id);mesh.castShadow=!ground;mesh.receiveShadow=true;mesh.name='scanned-'+id;
     if(list.length>1){for(const ch of chunkInstances(mesh,8,ground?22:45))root.add(ch);mesh.dispose();}else root.add(mesh);}
    onChange();}).catch(e=>console.warn('Scanned plant failed to load',id,e));}
  // 11. Lived-in dressing round the house (door canopies, steps, mat, letterbox,
  //     number, tap, bicycle, washing line, wheelbarrow, spade, watering can).
  if(X.props.enabled)root.add(trackGroup(buildExteriorProps({plot,facades,doors,hoseReel:!scanned})));
  // 12. Weeds in the paving joints and wildflowers through the meadow.
  const weedMat=track(swayMaterial(installLeafTranslucency(foliage({vertexColors:true,map:tuftTex,normalMap:tuftNm,alphaTest:.4,side:THREE.DoubleSide,roughness:.9}),.4),uniforms,.05));
  const weedList=context.userData.weeds,weeds=new THREE.InstancedMesh(clump,weedMat,Math.max(1,weedList.length));
  weedList.forEach(([wx,wy],i)=>{const h=.06+.08*r();m.compose(new THREE.Vector3(wx,wy,.01),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),r()*Math.PI),new THREE.Vector3(h*1.6,h*1.6,h));weeds.setMatrixAt(i,m);weeds.setColorAt(i,c.setHSL(.22+.05*r(),.5,.32+.15*r()));});
  weeds.count=weedList.length;weeds.receiveShadow=true;weeds.name='paving-weeds';root.add(weeds);
  const wildPx=flowerPixels('daisy',256,31),wildTex=track(dataTexture(wildPx)),wildMat=track(swayMaterial(installLeafTranslucency(foliage({vertexColors:true,map:wildTex,normalMap:track(normalFromCutout(wildPx)),alphaTest:.45,side:THREE.DoubleSide,roughness:.8}),.45),uniforms,.07));
  const wildN=Math.round(1400*quality),wild=new THREE.InstancedMesh(clump,wildMat,wildN);let wi=0;
  for(let i=0;i<wildN*6&&wi<wildN;i++){const px=x0-60+r()*(x1-x0+120),py=y0-60+r()*(y1-y0+120),d=Math.max(x0-px,px-x1,y0-py,py-y1);const patch=Math.sin(px*.13)*Math.cos(py*.11);if(d<2||patch<.2||r()>Math.exp(-d/40)||blocked(px,py))continue;
   const h=.32+.25*r();m.compose(new THREE.Vector3(px,py,terrainHeight(px,py,plot)),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),r()*Math.PI),new THREE.Vector3(h*1.2,h*1.2,h));wild.setMatrixAt(wi,m);wild.setColorAt(wi++,c.setHSL(.12+.06*r(),.3,.7+.2*r()));}
  wild.count=wi;wild.receiveShadow=true;wild.name='wildflowers';for(const ch of chunkInstances(wild,20,160))root.add(ch);
  // 13. Ground contact occlusion: soft dark pools under garden trees, shrubs, the
  //     hedge foot and the tree line (where the sun shadow map does not reach).
  for(const [tx,ty] of chosen)aoSpots.push([tx+.5,ty+.5,3.4,.42]);
  for(const [sx,sy] of shrubAt)aoSpots.push([sx+.5,sy+.5,.75,.5]);
  for(const [hx,hy] of runs)aoSpots.push([hx,hy,1.1,.38]);
  const aoMat=track(new THREE.MeshBasicMaterial({map:track(blobTexture()),color:0x000000,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5}));aoMat.userData.tianLandscapeInstalled=true;
  const ao=new THREE.InstancedMesh(card,aoMat,aoSpots.length),aoOpacity=new Float32Array(aoSpots.length);
  aoSpots.forEach(([ax,ay,rad,k],i)=>{m.compose(new THREE.Vector3(ax,ay,terrainHeight(ax,ay,plot)+.018),new THREE.Quaternion(),new THREE.Vector3(rad*2,rad*2,1));ao.setMatrixAt(i,m);ao.setColorAt(i,c.setRGB(k,k,k));aoOpacity[i]=k;});
  // Instance colour carries the strength: shade = colour × alpha (premultiplied via onBeforeCompile).
  aoMat.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n #ifdef USE_INSTANCING_COLOR\n diffuseColor.a*=vColor.r;diffuseColor.rgb=vec3(0.0);\n #endif');};aoMat.customProgramCacheKey=()=>'tian-ground-ao-v1';
  ao.renderOrder=1;ao.name='ground-contact';ao.userData.indirectCaptureExclude=true;root.add(ao);
  // 14. Life: a small flock wheeling overhead and leaves drifting down from the crowns.
  if(X.life.enabled)animated.push(createBirds(root,[cx,cy]),createFallingLeaves(root,chosen.map(([tx,ty])=>[tx+.5,ty+.5]),track(leafTextures(clusterCard('dry',{size:64,leaves:1,leafScale:[.9,.9],seed:5,sourceSize:64})).map)));
  // Sections switched off in the house's exterior design (built for their side
  // effects on placement, then dropped so they cost nothing to draw).
  const off=[[!X.meadow.enabled,/^(meadow-tufts|wildflowers)$/],[!X.treeLine.enabled,/^(tree-line|conifers)/],[!X.hills.enabled,/^hills$/],[!X.lawn.blades,/^grass-blades$/],[!X.hedge.enabled,/^hedge/],[!X.borders.enabled,/^(border-beds|bed-edging|shrub-cores|shrubs|perennials-)/]];
  for(const ch of [...root.children])if(off.some(([on,re])=>on&&re.test(ch.name)))root.remove(ch);
  built=true;
  return {climberLeaves,trees:chosen.length,hedgeRuns:runs.length,blades:bi,lawnCells:plot.lawn.length,bedCells:bedCells.length,tufts:ti};
 }
 const camPos=new THREE.Vector3();let detailScale=1;
 return {root,rebuild,update(dt,camera=null,day=1){uniforms.time.value+=dt;for(const a of animated)a.update(dt,day);const hills=root.getObjectByName('hills');if(hills)hills.material.color.setScalar(.04+.96*day);
   // Distance culling of chunked ground cover (frustum culling handles the rest).
   if(camera){camera.getWorldPosition(camPos);for(const ch of root.children){const md=ch.userData.maxDist;if(!md||md===Infinity||!ch.boundingSphere)continue;ch.visible=ch.boundingSphere.center.distanceTo(camPos)-ch.boundingSphere.radius<md*detailScale;}}},
  // Quality governor hook: scales every chunk's draw distance (grass, tufts, flowers).
  setDetailScale(k){detailScale=Math.max(.2,Math.min(1,k));},stats:()=>({built,children:root.children.map(c=>[c.name,c.isInstancedMesh?c.count:1])}),dispose(){clear();scene.remove(root);}};
}
