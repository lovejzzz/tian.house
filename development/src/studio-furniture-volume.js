import {domesticFurnitureVolume} from './domestic-furniture-volume.js';
import {pianoKeys} from './piano.js';
import {upholsteryTrim,drapedTextile} from './textile-detail-volume.js';
import {upholsteryVolume} from './upholstery-volume.js';
import {appendSlabPolygon} from './scene-slab-volumes.js';
import {convexSolid} from './convex-solid.js';
// Original dimensional models. These are not reconstructed PZ meshes or final source textures.
export function studioFurnitureVolume(recipe){
 const parts=[],kind=recipe.parameters.kind;
 const prism=(id,materialId,polygon,z,h,collision=true)=>{if(!(h>0)||!Number.isFinite(z))throw Error('Invalid studio height');const m={id,role:'furniture',materialId,vertices:[],indices:[],collision:[]};appendSlabPolygon(m,polygon,z,z+h);m.collision=collision?[convexSolid(m)]:[];parts.push(m);};
 const box=(id,mat,x,y,z,w,d,h,c=.0,collision=true)=>{if(![x,y,z,w,d,h,c].every(Number.isFinite)||Math.min(w,d,h)<=0||c<0)throw Error('Invalid studio part');c=Math.min(c,Math.min(w,d)*.24);const p=c?[[x+c,y],[x+w-c,y],[x+w,y+c],[x+w,y+d-c],[x+w-c,y+d],[x+c,y+d],[x,y+d-c],[x,y+c]]:[[x,y],[x+w,y],[x+w,y+d],[x,y+d]];if(!c){prism(id,mat,p,z,h,collision);return;}
  // Bevel the top and bottom as well as plan corners; keep authored extents/IDs.
  const b=Math.min(c,h*.22),k=c+(Math.SQRT2-2)*b;
  const inset=[[x+b+k,y+b],[x+w-b-k,y+b],[x+w-b,y+b+k],[x+w-b,y+d-b-k],[x+w-b-k,y+d-b],[x+b+k,y+d-b],[x+b,y+d-b-k],[x+b,y+b+k]];
  const vertices=[...inset.map(q=>[...q,z]),...p.map(q=>[...q,z+b]),...p.map(q=>[...q,z+h-b]),...inset.map(q=>[...q,z+h])],indices=[],n=p.length;
  for(let i=1;i<n-1;i++)indices.push(0,i+1,i,3*n,3*n+i,3*n+i+1);
  for(let r=0;r<3;r++)for(let i=0;i<n;i++){const j=(i+1)%n,a=r*n+i,B=r*n+j,C=(r+1)*n+j,D=(r+1)*n+i;indices.push(a,B,C,a,C,D);}
  const m={id,role:'furniture',materialId:mat,vertices,indices,collision:[],smoothNormals:['cloth','linen'].includes(mat)};m.collision=collision?[convexSolid(m)]:[];parts.push(m);
 };
 const cushion=(id,x,y,z,w,d,h)=>{const p={id,creaseDepth:recipe.parameters.creaseDepth??0,origin:[x,y,z],size:[w,d,h]};parts.push(upholsteryVolume(p),upholsteryTrim({...p,id:id+':piping'}));};
 const rod=(id,mat,a,b,r)=>{const d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d);if(len<1e-8||r<=0)throw Error('Invalid studio rod');const n=d.map(v=>v/len),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];let u=cross(n,Math.abs(n[2])<.9?[0,0,1]:[0,1,0]);u=u.map(v=>v/Math.hypot(...u));const v=cross(n,u),vertices=[];for(const p of [a,b])for(let i=0;i<12;i++){const t=i*Math.PI/6;vertices.push(p.map((s,j)=>s+r*(u[j]*Math.cos(t)+v[j]*Math.sin(t))));}const indices=[];for(let i=1;i<11;i++){indices.push(0,i+1,i,12,12+i,12+i+1);}for(let i=0;i<12;i++){const j=(i+1)%12;indices.push(i,j,12+j,i,12+j,12+i);}const m={id,role:'furniture',materialId:mat,vertices,indices,collision:[]};m.collision=[convexSolid(m)];parts.push(m);};
 const legs=(id,x,y,w,d,z,h)=>{for(const [i,X]of [x+.06,x+w-.1].entries())for(const [j,Y]of [y+.06,y+d-.1].entries())box(`${id}:${i}:${j}`,'metal',X,Y,z,.04,.04,h,.005);};
 if(kind==='storage-bed'){
  const bed=domesticFurnitureVolume({materials:{...recipe.materials,timber:recipe.materials.walnut,accent:recipe.materials.linen},parameters:{width:1.8,depth:1.95,height:1.05,creaseDepth:.008},semantics:{kind:'bed'}});
  for(const part of bed.parts.filter(p=>p.id!=='frame')){part.materialId=part.materialId==='timber'?'walnut':part.materialId==='accent'?'linen':part.materialId;parts.push(part);}
  box('base-bottom','walnut',.04,.04,.14,1.72,1.87,.025,.008);
  box('left-rail','walnut',.04,.04,.165,.06,1.87,.255,.008);
  box('mattress-support','walnut',.04,.04,.39,1.72,1.87,.03,.008);
  for(let i=0;i<2;i++){
   const start=parts.length,y=.87+i*.50;
   box('drawer-'+i+'-bottom','walnut',.82,y,.18,.9,.45,.025,.006);
   for(const Y of [y,y+.425])box('drawer-'+i+'-side:'+Y,'walnut',.82,Y,.205,.9,.025,.15,.004);
   box('drawer-'+i+'-back','walnut',.82,y+.025,.205,.025,.40,.15,.004);
   box('drawer-'+i+'-front','walnut',1.72,y-.015,.17,.055,.48,.22,.008);
   rod('drawer-'+i+'-handle','brass',[1.79,y+.12,.29],[1.79,y+.32,.29],.008);
   for(let c=0;c<3;c++){const from=parts.length;cushion('folded-clothes:'+i+':'+c,1.15,y+.06,.205+c*.047,.42,.32,.045);for(const part of parts.slice(from)){part.materialId=c%2?'linen':'cloth';part.clothingSlot=i*3+c;delete part.softSupport;part.collision=[];}}
   for(const part of parts.slice(start))part.drawerSlide=[.52,0,0];
  }
 }else if(kind==='nightstand'){
  legs('leg',.1,.175,.8,.65,0,.14);
  box('top','walnut',.1,.175,.54,.8,.65,.035,.015);
  box('bottom','walnut',.1,.175,.14,.8,.65,.03,.008);
  for(const x of [.1,.865])box('side:'+x,'walnut',x,.175,.17,.035,.65,.37,.008);
  box('back','walnut',.135,.175,.17,.73,.035,.37,.004);
  const start=parts.length;
  box('drawer-bottom','walnut',.15,.22,.19,.70,.55,.025,.004);
  for(const x of [.15,.83])box('drawer-side:'+x,'walnut',x,.22,.215,.02,.55,.24,.003);
  box('drawer-back','walnut',.17,.22,.215,.66,.02,.24,.003);
  box('drawer-front','walnut',.12,.79,.18,.76,.035,.33,.009);
  rod('drawer-handle','brass',[.38,.84,.36],[.62,.84,.36],.008);
  for(const part of parts.slice(start))part.drawerSlide=[0,.38,0];
 }else if(kind==='water-glass'){
  const n=32,profile=[[0,0],[.038,0],[.043,.115],[.039,.115],[.034,.008],[0,.008]],vertices=[],indices=[];
  for(const [r,z]of profile)for(let i=0;i<n;i++){const a=i*2*Math.PI/n;vertices.push([.5+r*Math.cos(a),.5+r*Math.sin(a),z]);}
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;indices.push(a,b,b+n,a,b+n,a+n);}
  parts.push({id:'tumbler',role:'furniture',materialId:'glass',vertices,indices,collision:[],smoothNormals:true});
  rod('water','water',[.5,.5,.009],[.5,.5,.083],.036);
 }else if(kind==='upright-piano'){
  box('case','walnut',0,0,.1,1.53,.38,1.11,.018);box('lid','walnut',-.015,-.005,1.21,1.56,.41,.025,.012);
  box('lower-panel','walnut',.09,.375,.12,1.35,.03,.57,.008);box('keyboard-bed','walnut',0,.35,.7,1.53,.27,.065,.012);
  for(const x of [0,1.46]){box('cheek:'+x,'walnut',x,.34,.74,.07,.28,.12,.012);box('key-leg:'+x,'walnut',x,.52,.08,.07,.08,.64,.012);}
  const whiteW=1.36/52;for(let i=0;i<52;i++)box('white-key:'+i,'ivory',.085+i*whiteW,.39,.765,whiteW-.001,.21,.014,.0004);
  // A0, B0, then C major groups. Black keys are separate raised geometry.
  let whiteIndex=0;for(const key of pianoKeys){if(!key.black){whiteIndex++;continue;}box('black-key:'+(whiteIndex-1),'rubber',.085+whiteIndex*whiteW-.007,.39,.779,.014,.13,.018,.001);}
  for(let i=0;i<3;i++)box('pedal:'+i,'brass',.65+i*.08,.42,.055,.045,.17,.015,.006);
  box('music-rest','walnut',.4,.39,.88,.73,.025,.21,.008);box('rest-ledge','walnut',.39,.39,.865,.75,.07,.015,.004);
 }else if(kind==='piano-bench'){
  legs('leg',.05,.05,.9,.38,0,.40);
  box('storage-bottom','dark',.02,.02,.34,.96,.44,.015,.004);
  for(const x of [0,.975])box('storage-side:'+x,'dark',x,0,.34,.025,.48,.125,.006);
  for(const y of [0,.455])box('storage-end:'+y,'dark',.025,y,.34,.95,.025,.125,.006);
  box('seat-frame','dark',0,0,.465,1,.48,.018,.008);cushion('padded-seat',.01,.01,.483,.98,.46,.045);
  for(const part of parts.filter(p=>p.id==='seat-frame'||p.id.startsWith('padded-seat'))){part.lidHinge={point:[.5,.015,.465],axis:[1,0,0],angle:1.22};if(part.id.startsWith('padded-seat'))part.materialId='leather';}
  for(const x of [.18,.78])rod('hinge:'+x,'brass',[x,.015,.46],[x+.05,.015,.46],.009);
 }else if(kind==='office-chair'){
  rod('gas-lift','aluminium',[.5,.5,.12],[.5,.5,.43],.035);
  for(let i=0;i<5;i++){const t=i*Math.PI*2/5,a=[.5,.5,.14],b=[.5+.30*Math.cos(t),.5+.30*Math.sin(t),.09];rod('base-spoke:'+i,'metal',a,b,.023);rod('caster:'+i,'rubber',[b[0]-.025,b[1],.045],[b[0]+.025,b[1],.045],.043);}
  cushion('seat',.23,.25,.43,.54,.52,.075);
  box('back-spine','metal',.47,.23,.48,.06,.04,.48,.01);
  cushion('back-pad',.24,.21,.55,.52,.09,.50);
  for(const x of [.18,.78]){rod('arm-post:'+x,'metal',[x,.39,.46],[x,.39,.66],.018);box('arm-pad:'+x,'rubber',x-.04,.30,.66,.08,.31,.035,.015);}

 }else if(kind==='workstation'){
  legs('leg',0,0,1.8,.75,0,.72);box('desk-top','walnut',0,0,.72,1.8,.75,.045,.022);
  box('monitor-base','metal',.9,.18,.765,.32,.22,.018,.025);rod('monitor-post','metal',[1.06,.25,.78],[1.06,.25,1.02],.018);
  box('monitor-body','dark',.72,.23,.97,.68,.035,.40,.008);box('monitor-screen','screen',.734,.265,.984,.652,.003,.369,.001);
  box('macbook-base','aluminium',.13,.38,.765,.355,.25,.013,.009);box('keyboard-inset','dark',.15,.395,.779,.31,.115,.001,.001);
  for(let row=0;row<4;row++)for(let col=0;col<12;col++)box(`laptop-key:${row}:${col}`,'metal',.154+col*.025,.399+row*.027,.78,.021,.022,.002,.001,false);
  box('trackpad','metal',.25,.53,.779,.12,.075,.001,.003,false);
  // Slightly tilted display, rather than a second vertical box touching the laptop.
  const start=parts.length;box('laptop-lid','aluminium',.13,.365,.778,.355,.009,.235,.003);box('laptop-screen','screen',.141,.374,.79,.333,.002,.21,.001);
  for(const m of parts.slice(start)){for(const v of m.vertices)v[1]-=(v[2]-.778)*.22;m.collision=[convexSolid(m)];}
  box('external-keyboard','ivory',.77,.48,.765,.44,.14,.018,.008);box('mouse-mat','cloth',1.3,.46,.766,.28,.24,.002,.015,false);box('mouse','ivory',1.4,.52,.768,.06,.11,.025,.018);
  box('cable-tray','metal',.3,.12,.64,1.2,.14,.04,.01);rod('monitor-cable','rubber',[1.08,.23,.98],[1.08,.23,.68],.003);
 }else if(kind==='media-console'){
  legs('leg',0,0,2.2,.45,0,.14);box('carcass','walnut',0,0,.12,2.2,.45,.32,.012);box('top','walnut',-.015,-.01,.44,2.23,.47,.035,.012);
  for(let i=0;i<3;i++){box('door:'+i,'walnut',.02+i*.725,.451,.15,.705,.02,.26,.005);for(let s=0;s<15;s++)box(`flute:${i}:${s}`,'edge',.038+i*.725+s*.045,.472,.16,.016,.009,.24,.002,false);}
 }else if(kind==='television-85'){
  // Manufacturer outer dimensions; stand is our separate approximate original design.
  box('bezel','dark',0,.12,.08,1.8922,.0272,1.0819,.004);box('display','screen',.008,.1472,.088,1.8762,.002,1.0659,.001);
  for(const x of [.28,1.61]){rod('stand:'+x,'metal',[x,.13,.14],[x,.32,.015],.012);rod('rear-stand:'+x,'metal',[x,.13,.14],[x,0,.015],.012);}
  box('status-led','ivory',.945,.149,.082,.003,.001,.002,0,false);
 }else if(kind==='floor-speaker'){
  box('plinth','dark',0,0,0,.3,.34,.035,.012);box('cabinet','walnut',.02,.02,.035,.26,.3,.965,.014);
  for(const [i,z,r]of [[0,.27,.087],[1,.53,.087],[2,.81,.03]]){rod('driver-rim:'+i,'metal',[.15,.322,z],[.15,.334,z],r);rod('driver-cone:'+i,'rubber',[.15,.334,z],[.15,.34,z],r*.84);rod('driver-dome:'+i,'dark',[.15,.34,z],[.15,.35,z],r*.3);}
  rod('bass-port','dark',[.15,.322,.1],[.15,.334,.1],.023);
 }else if(kind==='functional-trainer'){
  // An open cable machine: do not replace the working space with one solid collision box.
  for(const x of [.05,1.65]){
   box('foot:'+x,'metal',x,0,0,.1,.9,.07,.015);box('upright:'+x,'metal',x,.33,.07,.075,.075,2.13,.012);
   for(let i=0;i<18;i++)box(`weight:${x}:${i}`,'dark',x-.01,.04,.12+i*.033,.16,.23,.027,.004);
   for(const y of [.07,.24])rod(`guide:${x}:${y}`,'aluminium',[x+.07,y,.13],[x+.07,y,2.1],.009);
   rod('cable:'+x,'rubber',[x+.1,.4,.18],[x+.1,.4,2.09],.003);
   for(const z of [.15,1.1,2.07])rod(`pulley:${x}:${z}`,'dark',[x+.02,.4,z],[x+.12,.4,z],.045);
   box('carriage:'+x,'aluminium',x-.01,.31,1.04,.14,.14,.12,.009);
   rod('handle-cable:'+x,'rubber',[x+.07,.45,1.1],[x+.07,.64,.94],.003);rod('handle:'+x,'rubber',[x-.02,.65,.94],[x+.16,.65,.94],.014);
   for(let i=0;i<20;i++)box(`adjustment-hole:${x}:${i}`,'dark',x+.025,.407,.3+i*.082,.012,.002,.012,.002,false);
  }
  box('header','metal',.08,.33,2.17,1.67,.08,.09,.018);
  for(const x of [.13,1.69])rod('pullup-bracket:'+x,'metal',[x,.37,2.20],[x,.70,2.16],.025);
  rod('pullup','metal',[.13,.70,2.16],[1.69,.70,2.16],.016);
  for(const x of [.25,1.35])rod('pullup-grip:'+x,'rubber',[x,.70,2.16],[x+.22,.70,2.16],.019);
  for(const x of [.65,1.17])rod('neutral-grip:'+x,'rubber',[x,.60,2.16],[x,.87,2.16],.017);
box('rear-brace','metal',.08,.05,.08,1.67,.06,.06,.01);
 }else if(kind==='breakfast-bar'){
  const {width:w=2,depth:d=.8,height:h=.925,overhang=.3,endClearance=.08}=recipe.parameters;
  if(![w,d,h,overhang,endClearance].every(Number.isFinite)||w<1.2||d<.6||h<.7||h>1.2||overhang<.2||overhang>d-.3||endClearance<.08||endClearance>w-.8)throw Error('Invalid breakfast peninsula dimensions');
  box('base','walnut',.08,.04,0,w-.08-endClearance,d-overhang-.04,h-.035,.012);
  box('top','stone',0,0,h-.035,w,d,.035,.006);
  const W=(w-.11-endClearance)/2;for(let i=0;i<2;i++){box('panel:'+i,'walnut',.08+i*(W+.03),.02,.1,W,.018,h-.17,.005);box('handle:'+i,'brass',.08+i*(W+.03)+W-.13,-.005,h-.23,.08,.02,.012,.003);}
 }else if(kind==='bar-stool'){
  legs('leg',.02,.02,.44,.44,0,.63);cushion('seat',0,0,.63,.48,.48,.055);
  for(const [a,b]of [[[.08,.08,.25],[.4,.08,.25]],[[.08,.4,.25],[.4,.4,.25]],[[.08,.08,.25],[.08,.4,.25]],[[.4,.08,.25],[.4,.4,.25]]])rod('footrest:'+parts.length,'metal',a,b,.012);
  box('back','walnut',.015,0,.68,.45,.045,.22,.01);
 }else if(kind==='sectional-sofa'){
  for(const [i,x,y]of [[0,.1,.1],[1,2.65,.1],[2,.1,1.75],[3,.85,1.75],[4,2.65,.82]])box('foot:'+i,'walnut',x,y,0,.07,.07,.14,.01);
  box('main-frame','cloth',0,0,.12,2.8,.95,.24,.06);box('chaise-frame','cloth',0,.7,.12,1,1.2,.24,.06);
  box('back','cloth',0,0,.3,2.8,.18,.55,.06);for(const x of [0,2.64])box('arm:'+x,'cloth',x,.15,.29,.16,.79,.33,.045);
  cushion('chaise-seat',.16,.2,.36,.82,1.65,.16);
  for(let i=0;i<2;i++)cushion('seat:'+i,1.0+i*.82,.2,.36,.8,.71,.16);
  for(let i=0;i<3;i++){cushion('back-cushion:'+i,.18+i*.82,.17,.52,.79,.16,.35);}
  parts.push({...drapedTextile({id:'throw',x:.24,y:1.12,z:.55,width:.6,flatLength:.66,drop:.24,radius:.09}),softSupport:'overlay'});
 }else throw Error('Unknown studio furniture family');
 for(const p of parts)if(!recipe.materials[p.materialId])throw Error('Missing studio material '+p.materialId);
 return {parts};
}
