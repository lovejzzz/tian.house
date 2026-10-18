import {appendSlabPolygon} from './scene-slab-volumes.js?v=a890ced93fdd';
import {convexSolid} from './convex-solid.js?v=a890ced93fdd';
// Shared fine-detail primitives for furniture recipes. Every part carries exact
// per-vertex normals: fillets and turned surfaces shade round while flat faces
// stay crisp, without angle-weighted smoothing tilting large faces. Collision
// stays a simple convex proxy; visual detail must not change physical reach.
const norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
function part(id,materialId,{collision=true,role='furniture',...extra}={}){return {id,role,materialId,vertices:[],normals:[],indices:[],collision:[],...extra,_collision:collision};}
// Parts without collision are explicitly marked nonblocking detail (knobs, grilles, bins).
function finish(p,proxy){const {_collision,...out}=p;if(_collision)out.collision=[proxy??convexSolid(out)];else out.nonblocking=true;return out;}
export function boxProxy(x,y,z,W,D,H){const p={vertices:[],indices:[],collision:[]};appendSlabPolygon(p,[[x,y],[x+W,y],[x+W,y+D],[x,y+D]],z,z+H);return convexSolid(p);}
export function filletSegments(radius){return radius>=.02?3:radius>=.006?2:1;}
// Rounded box: an inner box swept by a sphere of `radius`. Each face is a grid whose
// edge rows sample the fillet at equal angles; corners become spherical patches.
// `radius` may be [rx,ry,rz]-independent via `round` = which axes are rounded.
export function roundedBox(id,materialId,[x,y,z],[W,D,H],radius,options={}){
 if(![x,y,z,W,D,H,radius].every(Number.isFinite)||Math.min(W,D,H)<=0||radius<0)throw Error('Invalid rounded box '+id);
 const r=Math.min(radius,W/2-1e-6,D/2-1e-6,H/2-1e-6),seg=options.segments??filletSegments(r),p=part(id,materialId,options);
 const h=[W/2,D/2,H/2],c=[x+W/2,y+D/2,z+H/2],inner=h.map(v=>v-r);
 const samples=axis=>{const s=[];for(let k=seg;k>=1;k--)s.push(-(inner[axis]+r*Math.tan(k*Math.PI/4/seg)));s.push(-inner[axis]);if(inner[axis]>1e-9)s.push(inner[axis]);else s[s.length-1]=0;for(let k=1;k<=seg;k++)s.push(inner[axis]+r*Math.tan(k*Math.PI/4/seg));return r>0?s:[-h[axis],h[axis]];};
 const faces=[[0,1,2,1],[0,2,1,-1],[1,2,0,1],[1,0,2,-1],[2,0,1,1],[2,1,0,-1]];
 // [normal axis, u axis, v axis, sign]; winding chosen so u×v points along +normal*sign.
 for(const [n,u,v,sign] of faces){
  const us=samples(u),vs=samples(v),base=p.vertices.length;
  for(const b of vs)for(const a of us){
   const q=[0,0,0];q[n]=sign*h[n];q[u]=a;q[v]=b;
   const cl=q.map((t,i)=>Math.max(-inner[i],Math.min(inner[i],t))),d=q.map((t,i)=>t-cl[i]),dir=r>0?norm(d):[0,0,0].map((_,i)=>i===n?sign:0);
   p.vertices.push(cl.map((t,i)=>c[i]+t+dir[i]*r));p.normals.push(dir);
  }
  const nu=us.length,flip=((u+1)%3===v)!==(sign>0);
  for(let j=0;j<vs.length-1;j++)for(let i=0;i<nu-1;i++){const a=base+j*nu+i,b=a+1,cc=a+nu,dd=cc+1;if(flip)p.indices.push(a,cc,b,b,cc,dd);else p.indices.push(a,b,cc,b,dd,cc);}
 }
 return finish(p,boxProxy(x,y,z,W,D,H));
}
// Surface of revolution around a Z axis through (cx,cy). Profile is [[radius,z],...]
// bottom to top. Smooth around the axis; profile corners sharper than `crease`
// radians get split normals so a turned knob keeps its crisp lip.
// `scale` [sx,sy] stretches the revolution into an ellipse (ceramics); normals use
// the inverse-transpose so shading stays correct on the stretched surface.
export function lathe(id,materialId,[cx,cy],profile,{segments=24,capBottom=true,capTop=true,crease=.6,scale=[1,1],...options}={}){
 if(profile.length<2||!profile.every(([r,z])=>Number.isFinite(r)&&Number.isFinite(z)&&r>=0))throw Error('Invalid lathe profile '+id);
 const p=part(id,materialId,options);
 const tangent=i=>{const a=profile[Math.max(0,i-1)],b=profile[Math.min(profile.length-1,i+1)];return norm([b[0]-a[0],b[1]-a[1]]);};
 const segN=i=>{const [a,b]=[profile[i],profile[i+1]];return norm([b[1]-a[1],-(b[0]-a[0])]);};
 // Duplicate profile points at creases; each ring stores its own 2D normal (radial,z).
 const rings=[];
 for(let i=0;i<profile.length;i++){
  const before=i>0?segN(i-1):null,after=i<profile.length-1?segN(i):null;
  if(before&&after&&Math.acos(Math.max(-1,Math.min(1,before[0]*after[0]+before[1]*after[1])))>crease){rings.push({p:profile[i],n:before,end:true});rings.push({p:profile[i],n:after,start:true});}
  else rings.push({p:profile[i],n:before&&after?norm([before[0]+after[0],before[1]+after[1]]):(before||after)});
 }
 for(const ring of rings){ring.base=p.vertices.length;for(let s=0;s<segments;s++){const t=2*Math.PI*s/segments,cs=Math.cos(t),sn=Math.sin(t);p.vertices.push([cx+ring.p[0]*cs*scale[0],cy+ring.p[0]*sn*scale[1],ring.p[1]]);p.normals.push(norm([ring.n[0]*cs/scale[0],ring.n[0]*sn/scale[1],ring.n[1]]));}}
 for(let k=0;k<rings.length-1;k++){if(rings[k].end)continue;const A=rings[k].base,B=rings[k+1].base;for(let s=0;s<segments;s++){const s2=(s+1)%segments;p.indices.push(A+s,A+s2,B+s,A+s2,B+s2,B+s);}}
 const cap=(ring,down)=>{if(ring.p[0]<=1e-9)return;const center=p.vertices.length;p.vertices.push([cx,cy,ring.p[1]]);p.normals.push([0,0,down?-1:1]);const base=p.vertices.length;for(let s=0;s<segments;s++){const t=2*Math.PI*s/segments;p.vertices.push([cx+ring.p[0]*Math.cos(t)*scale[0],cy+ring.p[0]*Math.sin(t)*scale[1],ring.p[1]]);p.normals.push([0,0,down?-1:1]);}for(let s=0;s<segments;s++){const s2=(s+1)%segments;if(down)p.indices.push(center,base+s2,base+s);else p.indices.push(center,base+s,base+s2);}};
 if(capBottom)cap(rings[0],true);if(capTop)cap(rings.at(-1),false);
 const R=Math.max(...profile.map(q=>q[0])),zs=profile.map(q=>q[1]);
 return finish(p,boxProxy(cx-R*scale[0],cy-R*scale[1],Math.min(...zs),2*R*scale[0],2*R*scale[1],Math.max(1e-4,Math.max(...zs)-Math.min(...zs))));
}
// Cylinder between two points (any direction) with optional rounded ends.
export function rod(id,materialId,a,b,radius,{segments=12,...options}={}){
 const axis=b.map((v,i)=>v-a[i]),length=Math.hypot(...axis);if(!(length>0&&radius>0))throw Error('Invalid rod '+id);
 const w=norm(axis),u=norm(Math.abs(w[2])<.9?[w[1],-w[0],0]:[0,w[2],-w[1]]),v=[w[1]*u[2]-w[2]*u[1],w[2]*u[0]-w[0]*u[2],w[0]*u[1]-w[1]*u[0]];
 const p=part(id,materialId,options);
 const ring=(o,n)=>{const base=p.vertices.length;for(let s=0;s<segments;s++){const t=2*Math.PI*s/segments,d=u.map((x,i)=>x*Math.cos(t)+v[i]*Math.sin(t));p.vertices.push(o.map((x,i)=>x+d[i]*radius));p.normals.push(n??d);}return base;};
 const A=ring(a),B=ring(b);for(let s=0;s<segments;s++){const s2=(s+1)%segments;p.indices.push(A+s,A+s2,B+s,A+s2,B+s2,B+s);}
 for(const [o,sign] of [[a,-1],[b,1]]){const n=w.map(x=>x*sign),center=p.vertices.length;p.vertices.push([...o]);p.normals.push(n);const base=ring(o,n);for(let s=0;s<segments;s++){const s2=(s+1)%segments;if(sign>0)p.indices.push(center,base+s,base+s2);else p.indices.push(center,base+s2,base+s);}}
 return finish(p);
}
// Bar pull on two standoffs. `from` is the mounting face point, `along` the bar
// direction, `out` the face normal. Returns separate parts (bar + posts).
export function barHandle(id,materialId,from,along,out,{length=.16,radius=.006,standoff=.03,postRadius=.0045}={}){
 const at=t=>from.map((v,i)=>v+along[i]*t),lift=o=>o.map((v,i)=>v+out[i]*standoff),inset=.02;
 return [rod(id+':bar',materialId,lift(at(0)),lift(at(length)),radius,{segments:12,collision:false}),
  ...[inset,length-inset].map((t,k)=>rod(`${id}:post:${k}`,materialId,at(t),lift(at(t)),postRadius,{segments:8,collision:false}))];
}
// Small round knob (control dial, drawer knob) projecting along +y from a face at y.
export function knob(id,materialId,[x,y,z],{radius=.018,depth=.022,segments=20,...options}={}){
 const p=lathe(id,materialId,[0,0],[[0,0],[radius*.75,0],[radius,depth*.25],[radius,depth*.8],[radius*.85,depth],[0,depth]],{segments,capBottom:false,capTop:false,collision:false,...options});
 // Rotate the Z-axis lathe so it points along +y: (u,v,w)->(u,w,v) with winding fix.
 p.vertices=p.vertices.map(([u,v,w])=>[x+u,y+w,z+v]);p.normals=p.normals.map(([u,v,w])=>[u,w,v]);
 for(let i=0;i<p.indices.length;i+=3){const t=p.indices[i+1];p.indices[i+1]=p.indices[i+2];p.indices[i+2]=t;}
 return p;
}
// Validate parts for authoring mistakes: matching normals, finite data, triangles in range.
export function checkDetailPart(p){
 if(p.normals&&p.normals.length!==p.vertices.length)throw Error('Normals do not match vertices in '+p.id);
 if(!p.vertices.every(v=>v.every(Number.isFinite)))throw Error('Non-finite vertex in '+p.id);
 if(p.indices.length%3||p.indices.some(i=>i<0||i>=p.vertices.length))throw Error('Invalid triangles in '+p.id);
 return p;
}
// Prism along +x from x0 to x1 with a 2D (y,z) profile, counter-clockwise when
// viewed from +x. Corners sharper than `crease` keep split normals, so a worktop
// gets a rounded nosing while its butt joints with neighbours stay flat.
export function profileExtrude(id,materialId,profile,x0,x1,{crease=.6,caps=true,...options}={}){
 if(!(x1>x0)||profile.length<3)throw Error('Invalid profile extrusion '+id);
 const p=part(id,materialId,options),n=profile.length;
 const edgeN=i=>{const a=profile[i],b=profile[(i+1)%n];return norm([0,b[1]-a[1],-(b[0]-a[0])]);};
 for(let i=0;i<n;i++){
  const before=edgeN((i-1+n)%n),after=edgeN(i),angle=Math.acos(Math.max(-1,Math.min(1,before[1]*after[1]+before[2]*after[2])));
  const normalsHere=angle>crease?[before,after]:[norm([0,before[1]+after[1],before[2]+after[2]])];
  profile[i]._n=normalsHere;
 }
 // Each edge strip uses its endpoint normals (split at creases).
 for(let i=0;i<n;i++){
  const a=profile[i],b=profile[(i+1)%n],na=a._n.at(-1),nb=b._n[0],base=p.vertices.length;
  p.vertices.push([x0,a[0],a[1]],[x1,a[0],a[1]],[x0,b[0],b[1]],[x1,b[0],b[1]]);p.normals.push(na,na,nb,nb);
  p.indices.push(base,base+2,base+1,base+1,base+2,base+3);
 }
 if(caps)for(const [x,sign] of [[x0,-1],[x1,1]]){const base=p.vertices.length;for(const q of profile){p.vertices.push([x,q[0],q[1]]);p.normals.push([sign,0,0]);}
  // Fan from the profile centroid keeps simple convex-ish profiles valid.
  const c=p.vertices.length;p.vertices.push([x,profile.reduce((s,q)=>s+q[0],0)/n,profile.reduce((s,q)=>s+q[1],0)/n]);p.normals.push([sign,0,0]);
  for(let i=0;i<n;i++){const j=(i+1)%n;if(sign>0)p.indices.push(c,base+i,base+j);else p.indices.push(c,base+j,base+i);}}
 for(const q of profile)delete q._n;
 const ys=profile.map(q=>q[0]),zs=profile.map(q=>q[1]);
 return finish(p,boxProxy(x0,Math.min(...ys),Math.min(...zs),x1-x0,Math.max(...ys)-Math.min(...ys),Math.max(...zs)-Math.min(...zs)));
}
// Rectangle (y0..y1, z0..z1) profile with selected corners rounded: keys 'ft'
// (front-top: y1,z1), 'fb' (y1,z0), 'bt' (y0,z1), 'bb' (y0,z0).
export function roundedProfile(y0,y1,z0,z1,radii={},segments=4){
 const corner=(cy,cz,r,start)=>{if(!r)return [[cy,cz]];const pts=[];const oy=cy+(cy===y0?r:-r),oz=cz+(cz===z0?r:-r);for(let k=0;k<=segments;k++){const t=start+k*Math.PI/2/segments;pts.push([oy+r*Math.cos(t),oz+r*Math.sin(t)]);}return pts;};
 // Counter-clockwise viewed from +x: y right, z up → (y0,z0) → (y1,z0) → (y1,z1) → (y0,z1).
 return [...corner(y0,z0,radii.bb,Math.PI),...corner(y1,z0,radii.fb,1.5*Math.PI),...corner(y1,z1,radii.ft,0),...corner(y0,z1,radii.bt,.5*Math.PI)];
}
// Rigidly rotate a finished part about an axis through `point` (hinged lids,
// tilted panels). Normals rotate with it; collision is cleared or must be re-made.
export function rotatePart(p,point,axis,angle){
 const k=norm(axis),c=Math.cos(angle),s=Math.sin(angle),rot=v=>{const d=k[0]*v[0]+k[1]*v[1]+k[2]*v[2],x=[k[1]*v[2]-k[2]*v[1],k[2]*v[0]-k[0]*v[2],k[0]*v[1]-k[1]*v[0]];return v.map((t,i)=>t*c+x[i]*s+k[i]*d*(1-c));};
 p.vertices=p.vertices.map(v=>rot(v.map((t,i)=>t-point[i])).map((t,i)=>t+point[i]));if(p.normals)p.normals=p.normals.map(rot);return p;
}
// Vertical extrusion of a counter-clockwise plan polygon (curtain waves, rails).
// A cyclic axis permutation of profileExtrude keeps winding and normals valid.
export function extrudeZ(id,materialId,polygon,z0,z1,options={}){
 const p=profileExtrude(id,materialId,polygon.map(([x,y])=>[x,y]),z0,z1,{...options,collision:false});
 const perm=([a,b,c])=>[b,c,a];p.vertices=p.vertices.map(perm);p.normals=p.normals.map(perm);
 if(options.collision!==false){const xs=polygon.map(q=>q[0]),ys=polygon.map(q=>q[1]);p.collision=[boxProxy(Math.min(...xs),Math.min(...ys),z0,Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys),z1-z0)];delete p.nonblocking;}
 return p;
}
// Sphere-ish produce or knobs via a lathe of a semicircle.
export function sphere(id,materialId,[x,y,z],r,{segments=16,rings=8,scale=[1,1],...options}={}){
 const profile=[];for(let i=0;i<=rings;i++){const t=-Math.PI/2+Math.PI*i/rings;profile.push([r*Math.cos(t),z+r*Math.sin(t)]);}
 return lathe(id,materialId,[x,y],profile,{segments,capBottom:false,capTop:false,crease:2,scale,...options});
}
