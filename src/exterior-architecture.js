import {wallVolume} from './wall-volume.js?v=a890ced93fdd';
import {roomContainsPoint} from './room-footprint.js?v=a890ced93fdd';
import {architecturalSurfaceUV} from './architectural-materials.js?v=a890ced93fdd';
import {resolveExterior} from './scene-exterior.js?v=a890ced93fdd';
// Exterior envelope detail derived from the authored walls and roofs (render-only,
// no collision; navigation stays owned by the structural walls):
// - parapet upstand in the wall's own finish hiding the low-pitch roof skin,
//   capped by a folded aluminium coping with drip lips on both faces;
// - a proud plinth band in darker textured render at the foot of every exterior
//   face, broken at door thresholds;
// - pressed aluminium sills (with end upstands) under every exterior window;
// - rainwater downpipes with hopper heads, stand-off brackets and a shoe, at the
//   two exterior corners furthest from any door.
// Dimensions are typical residential construction, authored, not surveyed.
export const EXTERIOR_DETAIL={parapetRise:.42,copingOverhang:.035,copingThickness:.045,drip:.035,plinthHeight:.32,plinthDepth:.014,sillProjection:.055,sillThickness:.028,pipeRadius:.04,pipeOffset:.07};
const ANODISED={color:0x34373a,metalness:.55,roughness:.42,variation:{tone:.05,roughness:.25,scale:2}};
// Weathered larch boards (silvered, open grain) for the clad volume.
const LARCH={color:0x9a8a74,roughness:.82,bumpScale:.01,texture:{kind:'walnut',size:256,seed:71,repeatMetres:[.14,1.6]},variation:{tone:.3,roughness:.2,scale:2.5}};
const PLINTH={color:0x5e5c57,roughness:.96,bumpScale:.012,texture:{kind:'wall-paint',size:512,seed:53,repeatMetres:[.9,.9]},variation:{tone:.22,roughness:.15,scale:1.4}};

function merge(id,parts,extra){const mesh={id,vertices:[],indices:[],collision:[],...extra};for(const p of parts){const o=mesh.vertices.length;mesh.vertices.push(...p.vertices);mesh.indices.push(...p.indices.map(i=>i+o));}return mesh;}
// Box along a wall frame: u along the wall, d across (signed from the centreline), z up.
function slab(frame,u0,u1,d0,d1,z0,z1){const {a,t,n}=frame,dm=(d0+d1)/2,p=u=>[a[0]+t[0]*u+n[0]*dm,a[1]+t[1]*u+n[1]*dm];return wallVolume({id:'x',a:p(u0),b:p(u1),base:z0,height:z1-z0,thickness:Math.abs(d1-d0)});}
// Vertical or sloped tube between two points (closed, 12 sides).
export function tube(a,b,radius,sides=12){
 const d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d),k=d.map(v=>v/len),ref=Math.abs(k[2])<.9?[0,0,1]:[1,0,0];
 const cross=(x,y)=>[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]],norm=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
 const u=norm(cross(k,ref)),v=cross(k,u),vertices=[],indices=[];
 for(const c of [a,b])for(let i=0;i<sides;i++){const t=i/sides*Math.PI*2;vertices.push(c.map((x,j)=>x+(u[j]*Math.cos(t)+v[j]*Math.sin(t))*radius));}
 for(let i=0;i<sides;i++){const j=(i+1)%sides;indices.push(i,j,sides+j,i,sides+j,sides+i);}
 vertices.push(a,b);const ca=2*sides,cb=ca+1;for(let i=0;i<sides;i++){const j=(i+1)%sides;indices.push(ca,j,i,cb,sides+i,sides+j);}
 return {vertices,indices};
}
function textured(mesh,material){return {...mesh,material,uv:architecturalSurfaceUV(mesh,material.texture.repeatMetres)};}

// Which side of a wall (sign along its left normal) is outside: 0 when both or
// neither side is in a room (internal partition or free-standing garden wall).
export function wallExteriorSide(scene,wall,{cellSize}){
 if(!wall.hostEndpoints)return 0;const [a,b]=wall.hostEndpoints,L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=[-(b[1]-a[1])/L,(b[0]-a[0])/L],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
 const inside=s=>scene.rooms.some(r=>r.levelId===wall.levelId&&roomContainsPoint(r,(mid[0]+n[0]*s*(wall.thickness/2+.05))/cellSize,(mid[1]+n[1]*s*(wall.thickness/2+.05))/cellSize));
 const plus=inside(1),minus=inside(-1);return plus===minus?0:plus?-1:1;
}
// Long blank stretches of exterior wall: collinear exterior segments without
// openings merged into runs (world metres), with the outward normal.
export function exteriorFacadeRuns(scene,walls,{cellSize}){
 const lines=new Map();
 for(const w of walls){if(!w.hostEndpoints||!w.indices?.length||w.opening)continue;const side=wallExteriorSide(scene,w,{cellSize});if(!side)continue;
  const [a,b]=w.hostEndpoints,L=Math.hypot(b[0]-a[0],b[1]-a[1]),t=[(b[0]-a[0])/L,(b[1]-a[1])/L],flip=t[0]<-1e-9||(Math.abs(t[0])<1e-9&&t[1]<0),T=flip?t.map(v=>-v):t,[p,q]=flip?[b,a]:[a,b];
  const out=[-t[1]*side,t[0]*side],key=[T[0].toFixed(3),T[1].toFixed(3),(-T[1]*p[0]+T[0]*p[1]).toFixed(3),out[0].toFixed(2),out[1].toFixed(2),w.levelId,w.base].join('|');
  if(!lines.has(key))lines.set(key,[]);lines.get(key).push({w,u0:p[0]*T[0]+p[1]*T[1],u1:q[0]*T[0]+q[1]*T[1],T,out});}
 const runs=[];
 for(const segs of lines.values()){segs.sort((x,y)=>x.u0-y.u0);let cur=null;
  const flush=()=>{if(!cur)return;const {T,out,w}=cur.segs[0],c0=cur.segs[0],o=-T[1]*w.hostEndpoints[0][0]+T[0]*w.hostEndpoints[0][1],pt=u=>[T[0]*u-T[1]*o,T[1]*u+T[0]*o];
   runs.push({a:pt(cur.u0),b:pt(cur.u1),length:cur.u1-cur.u0,t:T,out,thickness:w.thickness,base:w.base,top:w.base+w.height,levelId:w.levelId,wallIds:cur.segs.map(s=>s.w.id)});void c0;};
  for(const sg of segs){if(cur&&Math.abs(sg.u0-cur.u1)<1e-6){cur.u1=sg.u1;cur.segs.push(sg);}else{flush();cur={u0:sg.u0,u1:sg.u1,segs:[sg]};}}flush();}
 return runs;
}
const STAINLESS={color:0xc4c8ca,metalness:1,roughness:.3},BUTT={color:0x2b3a2c,roughness:.62,variation:{tone:.06,roughness:.2,scale:3}};
// Climbing-plant support on a blank run: tensioned stainless wires on eye bolts.
export function trellisSpan(run){const w=Math.min(3.2,run.length-1.2);if(w<2.4)return null;const mid=run.length/2;return {u0:mid-w/2,u1:mid+w/2,z0:run.base+.45,z1:Math.min(run.top-.35,run.base+2.65)};}
export function sceneExteriorDetails(scene,walls,roofs,{cellSize}){
 // The house's saved exterior design decides which envelope details exist.
 const X=resolveExterior(scene),env=X.envelope;
 const D=EXTERIOR_DETAIL,out=[],openings=new Map(scene.openings.map(o=>[o.id,o])),corners=[],doorPoints=[];
 const inRoom=(levelId,p)=>scene.rooms.some(r=>r.levelId===levelId&&roomContainsPoint(r,p[0]/cellSize,p[1]/cellSize));
 const roofBoxes=roofs.filter(r=>r.role==='roof').map(r=>{const xs=r.vertices.map(v=>v[0]),ys=r.vertices.map(v=>v[1]),zs=r.vertices.map(v=>v[2]);return {roofId:r.roofId,box:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],top:Math.max(...zs)};});
 // Cladding: the smallest room with exterior walls is wrapped in vertical larch
 // boards, so the house reads as a rendered volume plus a timber one.
 const roomOf=(levelId,p)=>scene.rooms.find(r=>r.levelId===levelId&&roomContainsPoint(r,p[0]/cellSize,p[1]/cellSize));
 const area=r=>(r.rect[2]-r.rect[0])*(r.rect[3]-r.rect[1]),extCount=new Map();
 for(const w of walls){if(!w.hostEndpoints)continue;const [a,b]=w.hostEndpoints,L=Math.hypot(b[0]-a[0],b[1]-a[1])||1,n=[-(b[1]-a[1])/L,(b[0]-a[0])/L],m=[(a[0]+b[0])/2,(a[1]+b[1])/2],q=s=>[m[0]+n[0]*s*(w.thickness/2+.05),m[1]+n[1]*s*(w.thickness/2+.05)];
  const ra=roomOf(w.levelId,q(1)),rb=roomOf(w.levelId,q(-1));if(!!ra!==!!rb){const r=ra||rb;extCount.set(r,(extCount.get(r)||0)+1);}}
 const cladRoom=env.cladding&&extCount.size>1?[...extCount.keys()].filter(r=>extCount.get(r)>=2).sort((x,y)=>area(x)-area(y))[0]:null;
 for(const wall of walls){
  // Walls that are wholly a glazed opening have no mesh but still carry parapet and coping.
  if(!wall.hostEndpoints||(!wall.indices?.length&&!wall.opening))continue;
  const [a,b]=wall.hostEndpoints,L=Math.hypot(b[0]-a[0],b[1]-a[1]),t=[(b[0]-a[0])/L,(b[1]-a[1])/L],n=[-t[1],t[0]],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],T=wall.thickness;
  const probe=s=>[mid[0]+n[0]*s*(T/2+.05),mid[1]+n[1]*s*(T/2+.05)];
  const outside=[-1,1].filter(s=>!inRoom(wall.levelId,probe(s))),inside=[-1,1].filter(s=>inRoom(wall.levelId,probe(s)));
  if(outside.length!==1||inside.length!==1)continue;
  const s=outside[0],frame={a,t,n},face=s*T/2,top=wall.base+wall.height,ext=T/2;
  const opening=wall.opening,kind=openings.get(wall.openingId)?.kind,door=opening&&kind!=='window'&&opening[1]<D.plinthHeight;
  const tag={hostWallId:wall.id,levelId:wall.levelId,castShadow:true};
  if(door)doorPoints.push([a[0]+t[0]*(opening[0]+opening[2])/2,a[1]+t[1]*(opening[0]+opening[2])/2]);
  // Plinth: proud band, wrapping the corner by the wall half-thickness.
  const runs=door?[[-ext-D.plinthDepth,opening[0]],[opening[2],L+ext+D.plinthDepth]]:[[-ext-D.plinthDepth,L+ext+D.plinthDepth]];
  const plinth=runs.filter(([u,v])=>v-u>.02).map(([u,v])=>slab(frame,u,v,face,face+s*D.plinthDepth,wall.base,wall.base+D.plinthHeight));
  if(env.plinth&&plinth.length)out.push(textured(merge(wall.id+':plinth',plinth,{...tag,role:'plinth'}),PLINTH));
  // Window sill below an exterior window: pressed blade with drip and end upstands.
  if(env.sills&&opening&&kind==='window'&&opening[1]>.05){
   const [u,z,v]=opening,zz=wall.base+z,sill=[slab(frame,u-.03,v+.03,face-s*.02,face+s*D.sillProjection,zz-D.sillThickness,zz),slab(frame,u-.03,v+.03,face+s*(D.sillProjection-.004),face+s*D.sillProjection,zz-D.sillThickness-.022,zz-D.sillThickness)];
   for(const e of [u-.03,v+.018])sill.push(slab(frame,e,e+.012,face,face+s*D.sillProjection*.8,zz,zz+.025));
   out.push(merge(wall.id+':sill',sill,{...tag,role:'sill',material:ANODISED}));
  }
  // Parapet and coping where a roof sits on this wall.
  const roof=roofBoxes.find(r=>mid[0]>=r.box[0]-T&&mid[0]<=r.box[2]+T&&mid[1]>=r.box[1]-T&&mid[1]<=r.box[3]+T&&Math.abs(r.top-top)<.6);
  if(roof){
   const z1=Math.max(top,roof.top)+D.parapetRise-.12,o=D.copingOverhang,c=D.copingThickness;
   const axisNudge=Math.abs(t[0])>Math.abs(t[1])?.0012:0; // overlapping corners never z-fight
   const parapet=wallVolume({id:wall.id+':parapet',a:[a[0]-t[0]*ext,a[1]-t[1]*ext],b:[b[0]+t[0]*ext,b[1]+t[1]*ext],base:top,height:z1-top,thickness:T});
   if(env.parapet)out.push({...parapet,id:wall.id+':parapet',role:'parapet',roofId:roof.roofId,levelId:wall.levelId,materialId:wall.materialId,hostEndpoints:[a,b],collision:[]});
   const zc=z1+axisNudge,coping=[slab(frame,-ext-o,L+ext+o,-T/2-o,T/2+o,zc,zc+c)];
   for(const side of [-1,1])coping.push(slab(frame,-ext-o,L+ext+o,side*(T/2+o),side*(T/2+o-.006),zc-D.drip,zc));
   if(env.parapet)out.push(merge(wall.id+':coping',coping,{role:'coping',roofId:roof.roofId,levelId:wall.levelId,castShadow:true,material:ANODISED}));
   for(const [end,u] of [[a,-1],[b,1]])corners.push({point:end,along:t.map(v=>v*u),out:n.map(v=>v*s),wall,top:z1});
  }
  if(cladRoom&&roomOf(wall.levelId,probe(-s))===cladRoom){
   // 120 mm boards, 12 mm gaps, on 25 mm battens; cut round openings; up under the coping.
   const z0=wall.base+D.plinthHeight+.01,zTop=(roof&&env.parapet?Math.max(top,roof.top)+D.parapetRise-.12:top)-.005,bw=.12,gap=.012,d0=face+s*.025,d1=d0+s*.022,boards=[];
   for(let u=-ext;u<L+ext-.02;u+=bw+gap){const u1=Math.min(L+ext,u+bw);
    const spans=opening&&u1>opening[0]&&u<opening[2]?[[z0,wall.base+opening[1]-.005],[wall.base+opening[3]+.005,zTop]]:[[z0,zTop]];
    for(const [za,zb] of spans)if(zb-za>.03)boards.push(slab(frame,u,u1,d0,d1,za,zb));}
   for(const zb of [z0+.08,(z0+zTop)/2,zTop-.1])boards.push(slab(frame,-ext,L+ext,face,d0,zb,zb+.04)); // battens show at the ends
   if(boards.length)out.push(textured(merge(wall.id+':cladding',boards,{...tag,role:'cladding'}),LARCH));
  }
 }
 // Downpipes at outer building corners (the neighbouring exterior wall faces the
 // direction beyond this wall's end), away from doors, at most two, spread apart.
 const same=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-6;
 const outer=corners.filter(c=>corners.some(o=>o!==c&&same(o.point,c.point)&&o.out[0]*c.along[0]+o.out[1]*c.along[1]>.9));
 const doorDistance=c=>Math.min(Infinity,...doorPoints.map(d=>Math.hypot(d[0]-c.point[0],d[1]-c.point[1])));
 const picked=[];for(const c of outer.filter(c=>doorDistance(c)>2).sort((x,y)=>doorDistance(y)-doorDistance(x))){if(picked.length>=2)break;if(picked.some(p=>Math.hypot(p.point[0]-c.point[0],p.point[1]-c.point[1])<4))continue;picked.push(c);}
 for(const [i,c] of picked.entries()){
  const T=c.wall.thickness,inset=T/2+.16,o=T/2+D.pipeOffset,x=c.point[0]-c.along[0]*inset+c.out[0]*o,y=c.point[1]-c.along[1]*inset+c.out[1]*o,base=c.wall.base;
  const parts=[tube([x,y,base+.16],[x,y,c.top-.26],D.pipeRadius)];
  // Shoe kicking out over a gully; hopper head under the coping; brackets every ~1.1 m.
  parts.push(tube([x,y,base+.17],[x+c.out[0]*.09,y+c.out[1]*.09,base+.05],D.pipeRadius));
  const h=c.top-.26,hw=.11,box=(cx,cy,z0,z1,w,d)=>wallVolume({id:'h',a:[cx-c.along[0]*w,cy-c.along[1]*w],b:[cx+c.along[0]*w,cy+c.along[1]*w],base:z0,height:z1-z0,thickness:d});
  parts.push(box(x,y,h,h+.2,hw,.15),box(x-c.out[0]*(o-T/2)/2,y-c.out[1]*(o-T/2)/2,h+.12,h+.16,.045,o-T/2+.02));
  for(let z=base+.6;z<h-.3;z+=1.1)parts.push(tube([x,y,z],[x,y,z+.035],D.pipeRadius+.008),box(x-c.out[0]*(o-T/2)/2,y-c.out[1]*(o-T/2)/2,z+.008,z+.027,.012,o-T/2));
  if(env.downpipes)out.push(merge(c.wall.id+':downpipe:'+i,parts,{hostWallId:c.wall.id,levelId:c.wall.levelId,role:'downpipe',castShadow:true,material:ANODISED}));
  // Water butt beside the first downpipe, clear of the shoe.
  if(i===0&&env.waterButt){const bx=x-c.along[0]*.5+c.out[0]*(.33-D.pipeOffset),by=y-c.along[1]*.5+c.out[1]*(.33-D.pipeOffset),b0=base+.02;
   out.push(merge(c.wall.id+':water-butt',[tube([bx,by,b0],[bx,by,b0+.92],.29,24),tube([bx,by,b0+.92],[bx,by,b0+.96],.305,24),tube([bx,by,b0+.3],[bx,by,b0+.86],.296,24),tube([bx+c.out[0]*.29,by+c.out[1]*.29,b0+.16],[bx+c.out[0]*.35,by+c.out[1]*.35,b0+.16],.016,10)],{hostWallId:c.wall.id,levelId:c.wall.levelId,role:'water-butt',castShadow:true,material:BUTT}));}
 }
 for(const run of exteriorFacadeRuns(scene,walls,{cellSize})){const span=trellisSpan(run);if(!span)continue;
  if(X.climbers.mode==='none'||X.climbers.mode==='listed'&&!run.wallIds.some(id=>X.climbers.walls.includes(id)))continue;
  const f=run.thickness/2,pt=(u,d,z)=>[run.a[0]+run.t[0]*u+run.out[0]*(f+d),run.a[1]+run.t[1]*u+run.out[1]*(f+d),z],parts=[];
  for(let z=span.z0;z<=span.z1+1e-6;z+=.35){parts.push(tube(pt(span.u0,.05,z),pt(span.u1,.05,z),.0028,8));for(const u of [span.u0,span.u1])parts.push(tube(pt(u,0,z),pt(u,.058,z),.006,8));}
  for(let u=span.u0+.6;u<span.u1-.3;u+=.8)parts.push(tube(pt(u,.05,span.z0),pt(u,.05,span.z1),.0022,8));
  out.push(merge(run.wallIds[Math.floor(run.wallIds.length/2)]+':trellis',parts,{hostWallId:run.wallIds[Math.floor(run.wallIds.length/2)],levelId:run.levelId,role:'trellis',castShadow:true,material:STAINLESS}));}
 return out;
}
