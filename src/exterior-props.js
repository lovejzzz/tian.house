import * as THREE from 'three';
import {mergeGeometries} from '../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
// Signs of life round the house (render-only dressing, deterministic placement):
// at every exterior door a steel canopy on tie rods, a concrete step, a coir mat,
// a house-number plaque and a wall letterbox; at the water butt an outdoor tap and
// a hose reel; a bicycle leaning on a blank wall; a rotary-free washing line with
// pegged laundry on the lawn; a wheelbarrow, a spade standing in the border and a
// watering can. Dimensions are typical domestic objects; nothing is surveyed.

const MAT={
 steel:{color:0x1f2326,metalness:.45,roughness:.5},galv:{color:0xa9aeb0,metalness:.8,roughness:.38},brass:{color:0xb08a46,metalness:1,roughness:.3},
 concrete:{color:0x9a978f,roughness:.92},coir:{color:0x8a6a3f,roughness:1},rubber:{color:0x1c1c1c,roughness:.8},wood:{color:0x7b5a3a,roughness:.75},
 hoseGreen:{color:0x2f6b2a,roughness:.55},barrow:{color:0x3d6b3e,metalness:.3,roughness:.55},paintRed:{color:0x8e2a22,metalness:.2,roughness:.5},
 white:{color:0xe8e6df,roughness:.9},towel:{color:0x3f6f8f,roughness:.95},shirt:{color:0xd8cfc0,roughness:.95},cloth2:{color:0x8a4f3a,roughness:.95},
 peg:{color:0xd9c7a0,roughness:.7},canGreen:{color:0x4c6b4a,metalness:.35,roughness:.5}
};
const box=(w,d,h,x=0,y=0,z=0)=>{const g=new THREE.BoxGeometry(w,d,h);g.translate(x,y,z+h/2);return g;};
function rod(a,b,r,seg=8){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),len=A.distanceTo(B),g=new THREE.CylinderGeometry(r,r,len,seg);g.translate(0,len/2,0);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize()));g.translate(...a);return g;}
function torus(R,r,x,y,z,axis='y',seg=24){const g=new THREE.TorusGeometry(R,r,8,seg);if(axis==='y')g.rotateX(Math.PI/2);if(axis==='x')g.rotateY(Math.PI/2);g.translate(x,y,z);return g;}
// Local frame on a wall face: u along, d out from the face, z up.
const frame=(p,t,out)=>(u,d,z)=>[p[0]+t[0]*u+out[0]*d,p[1]+t[1]*u+out[1]*d,z];
function oriented(geos,origin,t,out){
 // Geometry authored in local (x=u along wall, y=d out, z up) → world.
 const m=new THREE.Matrix4().makeBasis(new THREE.Vector3(t[0],t[1],0),new THREE.Vector3(out[0],out[1],0),new THREE.Vector3(0,0,1)).setPosition(origin[0],origin[1],origin[2]||0);
 // A left-handed basis (doors pass t = out rotated clockwise) mirrors the mesh, which reverses
 // its winding: front faces would cull and the step showed its inside. Restore the winding.
 const mirrored=m.determinant()<0;
 return geos.map(g=>{g.applyMatrix4(m);if(mirrored)flipWinding(g);return g;});
}
function flipWinding(g){
 if(g.index){const a=g.index.array;for(let i=0;i<a.length;i+=3){const k=a[i+1];a[i+1]=a[i+2];a[i+2]=k;}g.index.needsUpdate=true;return;}
 for(const attr of Object.values(g.attributes)){const n=attr.itemSize,a=attr.array;for(let i=0;i<attr.count;i+=3)for(let c=0;c<n;c++){const x=a[(i+1)*n+c];a[(i+1)*n+c]=a[(i+2)*n+c];a[(i+2)*n+c]=x;}attr.needsUpdate=true;}
}
// Draped cloth: a sagging, gently rippled sheet hanging from a line.
function cloth(w,h,seed){const g=new THREE.PlaneGeometry(w,h,8,8),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),t=(h/2-y)/h;p.setXYZ(i,x,.02*Math.sin(x*14+seed)+.03*t*Math.sin(x*6+seed*2),y-h/2-.004*Math.cos(x*9));}g.computeVertexNormals();return g;} // hangs in the x–z plane below the line
function numberTexture(text){
 if(typeof document==='undefined')return null;
 const c=document.createElement('canvas');c.width=128;c.height=96;const x=c.getContext('2d');x.fillStyle='#24282b';x.fillRect(0,0,128,96);x.fillStyle='#e9e6dd';x.font='bold 64px Helvetica, Arial, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,64,52);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 // The plaque's outward box face maps v top-to-bottom: flip it so the numeral reads upright.
 t.wrapT=THREE.RepeatWrapping;t.repeat.y=-1;return t;
}

export function buildExteriorProps({plot,facades=[],doors=[],seed=5,hoseReel=true}){
 const parts=new Map(),add=(mat,...g)=>{if(!parts.has(mat))parts.set(mat,[]);parts.get(mat).push(...g);};
 const placed={doors:0,bike:false,clothesline:false,barrow:false};
 // 1. Each exterior door.
 doors.forEach((d,i)=>{const t=[-d.out[1],d.out[0]],o=[d.p[0],d.p[1],0],w=d.width||.9,top=d.top||2.1;
  const W=w+.6,D=.95,cz=top+.22;
  add('steel',...oriented([box(W,D,.05,0,D/2,cz),box(W,.04,.12,0,D-.02,cz-.07),rod([-W/2+.05,D-.05,cz+.02],[-W/2+.05,.02,cz+.62],.012),rod([W/2-.05,D-.05,cz+.02],[W/2-.05,.02,cz+.62],.012),box(W*.9,.03,.08,0,.015,cz+.58)],o,t,d.out));
  add('concrete',...oriented([box(w+.5,.5,.12,0,.25,0)],o,t,d.out));
  add('coir',...oriented([box(.8,.48,.018,0,.29,.12)],o,t,d.out));
  add('steel',...oriented([box(.34,.13,.4,w/2+.42,.065,1.05),box(.2,.02,.02,w/2+.42,.135,1.33)],o,t,d.out));
  add('number',...oriented([box(.19,.012,.14,-w/2-.32,.006,1.55)],o,t,d.out));
  placed.doors++;});
 // 2. Tap and hose reel on the facade nearest the first downpipe-ish corner: use the longest facade run's start.
 const runs=[...facades].sort((a,b)=>b.length-a.length);
 if(runs[0]){const f=runs[0],o=[...f.a,0],tf=f.t,T=(f.thickness||.2)/2;
  add('brass',...oriented([rod([.35,T,.62],[.35,T+.09,.62],.012),rod([.35,T+.09,.62],[.35,T+.09,.55],.01),box(.05,.02,.02,.35,T+.09,.66)],o,tf,f.out));
  if(hoseReel){const reel=[torus(.2,.03,.35,T+.32,.32,'x',28),torus(.16,.03,.35,T+.32,.32,'x',28),torus(.12,.03,.35,T+.32,.32,'x',28)];
  add('hoseGreen',...oriented(reel,o,tf,f.out));
  add('steel',...oriented([rod([.22,T+.32,.32],[.48,T+.32,.32],.015),rod([.22,T+.25,0],[.22,T+.32,.32],.012),rod([.48,T+.25,0],[.48,T+.32,.32],.012),rod([.22,T+.39,0],[.22,T+.32,.32],.012),rod([.48,T+.39,0],[.48,T+.32,.32],.012)],o,tf,f.out));
  add('hoseGreen',...oriented([rod([.35,T+.32,.12],[.35,T+.09,.55],.012)],o,tf,f.out));}}
 // 3. Bicycle leaning on the second-longest blank run, a metre in.
 if(runs[1]&&runs[1].length>2.5){const f=runs[1],T=(f.thickness||.2)/2,u0=Math.min(1.2,f.length/3),o=[f.a[0]+f.t[0]*u0,f.a[1]+f.t[1]*u0,0],lean=.16;
  const L=(u,d,z)=>[u,T+.36+d-z*Math.sin(lean),z*Math.cos(lean)]; // top leans onto the wall
  const wheelA=[-.52,0,.34],wheelB=[.52,0,.34],bb=[-.02,0,.3],seat=[-.2,0,.82],head=[.42,0,.8],bars=[.38,0,1.02];
  const bike=[torus(.34,.018,...L(...wheelA),'y'),torus(.34,.018,...L(...wheelB),'y')];
  add('rubber',...oriented(bike,o,f.t,f.out));
  const tubes=[[bb,seat],[bb,head],[seat,head],[bb,wheelA],[seat,wheelA],[head,wheelB],[head,bars],[[bars[0],-.24,bars[2]],[bars[0],.24,bars[2]]]].map(([a,b])=>rod(L(...a),L(...b),.014));
  add('paintRed',...oriented(tubes,o,f.t,f.out));
  add('rubber',...oriented([box(.24,.09,.05,...L(seat[0],0,seat[2]+.02))],o,f.t,f.out));
  placed.bike=true;}
 // 4. Washing line across open lawn: two T-posts, three lines, pegged laundry.
 const r=(()=>{let s=seed>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};})();
 const open=plot.lawn.filter(([x,y])=>plot.distBuilt(x,y)>4&&plot.isLawn(x+4,y)&&plot.distBuilt(x+4,y)>3&&x>plot.bounds[0]+2&&y>plot.bounds[1]+2&&y<plot.bounds[3]-2&&x+4<plot.bounds[2]-2);
 if(open.length){const [x,y]=open[Math.floor(open.length*.5)],a=[x+.5,y+.5],b=[x+4.5,y+.5],lines=[-.25,0,.25];
  for(const p of [a,b])add('galv',rod([p[0],p[1],-.2],[p[0],p[1],1.85],.03),rod([p[0],p[1]-.32,1.82],[p[0],p[1]+.32,1.82],.022));
  for(const dy of lines){const pts=[];for(let i=0;i<=16;i++){const t=i/16;pts.push([a[0]+(b[0]-a[0])*t,a[1]+dy,1.8-.12*Math.sin(Math.PI*t)]);}for(let i=0;i<16;i++)add('white',rod(pts[i],pts[i+1],.0035,5));
   // Laundry on the line: towels, a shirt, a tea towel, hung where the line sags.
   let t=.12+.1*r();while(t<.85){const kind=r(),w=kind<.4?.6:kind<.7?.5:.35,h=kind<.4?.95:kind<.7?.7:.45,z=1.8-.12*Math.sin(Math.PI*(t+w/8));const g=cloth(w,h,dy*7+t*13);g.translate(a[0]+(b[0]-a[0])*(t+w/8),a[1]+dy,z);add(kind<.4?'towel':kind<.7?'shirt':'cloth2',g);
    for(const e of [-w/2+.04,w/2-.04])add('peg',box(.012,.02,.07,a[0]+(b[0]-a[0])*(t+w/8)+e,a[1]+dy,z-.05));t+=w/4+.12+.15*r();}}
  placed.clothesline=true;}
 // 5. Wheelbarrow on the lawn by the border, spade in the soil, watering can.
 const edge=plot.lawn.filter(([x,y])=>(x===plot.bounds[0]+1||y===plot.bounds[1]+1)&&plot.distBuilt(x,y)>3);
 if(edge.length){const [x,y]=edge[Math.floor(edge.length*.35)],o=[x+.5,y+.5,0],t=[1,0],out=[0,1];
  const tray=new THREE.CylinderGeometry(.42,.3,.32,14,1,true);tray.rotateX(Math.PI/2);tray.scale(1.25,.9,1);tray.translate(0,0,.48);
  add('barrow',...oriented([tray,box(.9,.62,.02,0,0,.32)],o,t,out));
  add('rubber',...oriented([torus(.18,.05,.62,0,.2,'y')],o,t,out));
  add('steel',...oriented([rod([.62,0,.2],[-.2,.25,.42],.016),rod([.62,0,.2],[-.2,-.25,.42],.016),rod([-.2,.25,.42],[-.85,.28,.55],.016),rod([-.2,-.25,.42],[-.85,-.28,.55],.016),rod([-.1,.25,.42],[-.15,.25,0],.016),rod([-.1,-.25,.42],[-.15,-.25,0],.016)],o,t,out));
  add('wood',...oriented([rod([-.75,.28,.53],[-.95,.29,.57],.022),rod([-.75,-.28,.53],[-.95,-.29,.57],.022)],o,t,out));
  placed.barrow=true;
  const s=[x-1.5,y+.3];add('wood',rod([s[0],s[1],.15],[s[0]+.05,s[1]-.04,1.05],.016),box(.12,.03,.03,s[0]+.05,s[1]-.04,1.03));add('galv',box(.18,.012,.26,s[0],s[1],-.08));
  const c=[x+1.6,y+.7],can=new THREE.CylinderGeometry(.13,.15,.28,18);can.rotateX(Math.PI/2);can.translate(c[0],c[1],.14);add('canGreen',can,rod([c[0]+.1,c[1],.1],[c[0]+.42,c[1],.32],.012),torus(.1,.012,c[0],c[1],.32,'x'));}
 // Merge per material.
 const group=new THREE.Group();group.name='exterior-props';
 for(const [key,list] of parts){const geo=mergeGeometries(list.map(g=>g.index?g.toNonIndexed():g),false);for(const g of list)g.dispose();
  const def=key==='number'?{color:0xffffff,roughness:.6,map:numberTexture('7')}:MAT[key];
  const mat=new THREE.MeshPhysicalMaterial({...def,side:/towel|shirt|cloth2/.test(key)?THREE.DoubleSide:THREE.FrontSide});
  // Thin parts flush to walls: screen-space AO reads them as fully occluded, so they
  // keep real shadows but stay out of the contact-occlusion pass.
  const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.noContactAO=true;mat.userData.noContactAO=true;mesh.name='prop-'+key;group.add(mesh);}
 group.userData.placed=placed;return group;
}
