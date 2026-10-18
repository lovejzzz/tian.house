import {domesticFurnitureVolume} from './domestic-furniture-volume.js?v=a890ced93fdd';
import {pianoKeys} from './piano.js?v=a890ced93fdd';
import {upholsteryTrim,drapedTextile} from './textile-detail-volume.js?v=a890ced93fdd';
import {upholsteryVolume} from './upholstery-volume.js?v=a890ced93fdd';
import {appendSlabPolygon} from './scene-slab-volumes.js?v=a890ced93fdd';
import {convexSolid} from './convex-solid.js?v=a890ced93fdd';
import {roundedBox,rod as smoothRod,lathe,knob,sphere,rotatePart} from './detail-geometry.js?v=a890ced93fdd';
// Original dimensional models. These are not reconstructed PZ meshes or final source textures.
export function studioFurnitureVolume(recipe){
 const parts=[],kind=recipe.parameters.kind;
 const prism=(id,materialId,polygon,z,h,collision=true)=>{if(!(h>0)||!Number.isFinite(z))throw Error('Invalid studio height');const m={id,role:'furniture',materialId,vertices:[],indices:[],collision:[]};appendSlabPolygon(m,polygon,z,z+h);m.collision=collision?[convexSolid(m)]:[];parts.push(m);};
 // Edge radius c is a true fillet with exact normals (was an octagonal chamfer).
 const box=(id,mat,x,y,z,w,d,h,c=.0,collision=true)=>{if(![x,y,z,w,d,h,c].every(Number.isFinite)||Math.min(w,d,h)<=0||c<0)throw Error('Invalid studio part');if(!c){prism(id,mat,[[x,y],[x+w,y],[x+w,y+d],[x,y+d]],z,h,collision);return;}
  const r=Math.min(c,Math.min(w,d)*.24,h*.45),m=roundedBox(id,mat,[x,y,z],[w,d,h],r,{collision});if(['cloth','linen'].includes(mat))m.smoothNormals=true;parts.push(m);
 };
 const cushion=(id,x,y,z,w,d,h,fine=true)=>{const p={id,creaseDepth:recipe.parameters.creaseDepth??0,origin:[x,y,z],size:[w,d,h],fine};parts.push(upholsteryVolume(p),upholsteryTrim({...p,id:id+':piping'}));};
 const rod=(id,mat,a,b,r)=>{if(r<=0||Math.hypot(...b.map((v,i)=>v-a[i]))<1e-8)throw Error('Invalid studio rod');parts.push(smoothRod(id,mat,a,b,r,{segments:r>.02?20:12}));};
 // Tapered round legs with a small foot glide, instead of square bar stock.
 const legs=(id,x,y,w,d,z,h)=>{for(const [i,X]of [x+.06,x+w-.1].entries())for(const [j,Y]of [y+.06,y+d-.1].entries()){const cx=X+.02,cy=Y+.02;parts.push(lathe(`${id}:${i}:${j}`,'metal',[cx,cy],[[.014,z],[.016,z+.006],[.0175,z+h*.35],[.02,z+h-.004],[.018,z+h]],{segments:16}));}};
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
   for(let c=0;c<3;c++){const from=parts.length;cushion('folded-clothes:'+i+':'+c,1.15,y+.06,.205+c*.047,.42,.32,.045,false);for(const part of parts.slice(from)){part.materialId=c%2?'linen':'cloth';part.clothingSlot=i*3+c;delete part.softSupport;part.collision=[];}}
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
  rod('drawer-handle','brass',[.4,.85,.36],[.6,.85,.36],.0065);for(const x of [.4,.6])rod('drawer-handle-post:'+x,'brass',[x,.825,.36],[x,.85,.36],.005);
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
  for(let i=0;i<3;i++){box('pedal:'+i,'brass',.65+i*.08,.42,.055,.04,.16,.012,.006);box('pedal-tip:'+i,'brass',.65+i*.08,.56,.05,.04,.03,.02,.008);}
  box('pedal-box','walnut',.58,.37,.03,.38,.06,.05,.008);
  box('key-slip','walnut',.06,.6,.7,1.41,.02,.075,.004);box('fallboard','walnut',.08,.37,.86,1.37,.022,.15,.006);
  for(const x of [.02,1.45])box('toe-block:'+x,'walnut',x,.52,0,.06,.12,.08,.01);
  for(const x of [.12,1.36])parts.push(lathe('castor:'+x,'brass',[x,.2],[[.018,0],[.02,.01],[.016,.02],[.012,.1],[0,.1]],{segments:14,collision:false}));
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
  for(let i=0;i<5;i++){const t=i*Math.PI*2/5,a=[.5,.5,.14],b=[.5+.30*Math.cos(t),.5+.30*Math.sin(t),.09];rod('base-spoke:'+i,'metal',a,b,.023);const tx=-Math.sin(t),ty=Math.cos(t);rod('caster:'+i,'rubber',[b[0]-tx*.022,b[1]-ty*.022,.03],[b[0]+tx*.022,b[1]+ty*.022,.03],.03);rod('caster-fork:'+i,'metal',[b[0],b[1],.09],[b[0],b[1],.05],.009);}
  cushion('seat',.23,.25,.43,.54,.52,.075);
  box('back-spine','metal',.47,.23,.48,.06,.04,.48,.01);
  cushion('back-pad',.24,.21,.55,.52,.09,.50);
  for(const x of [.18,.78]){rod('arm-post:'+x,'metal',[x,.39,.46],[x,.39,.66],.018);box('arm-pad:'+x,'rubber',x-.04,.30,.66,.08,.31,.035,.015);}

 }else if(kind==='workstation'){
  legs('leg',0,0,1.8,.75,0,.72);box('desk-top','walnut',0,0,.72,1.8,.75,.045,.022);
  box('monitor-base','metal',.9,.18,.765,.32,.22,.018,.025);rod('monitor-post','metal',[1.06,.25,.78],[1.06,.25,1.02],.018);
  box('monitor-body','dark',.72,.23,.97,.68,.035,.40,.008);box('monitor-housing','dark',.8,.205,1.0,.52,.03,.32,.03,false);box('monitor-screen','screen',.734,.265,.984,.652,.003,.369,.001);
  box('macbook-base','aluminium',.13,.38,.765,.355,.25,.013,.009);box('keyboard-inset','dark',.15,.395,.779,.31,.115,.001,.001);
  for(let row=0;row<4;row++)for(let col=0;col<12;col++)box(`laptop-key:${row}:${col}`,'metal',.154+col*.025,.399+row*.027,.78,.021,.022,.002,.001,false);
  box('trackpad','metal',.25,.53,.779,.12,.075,.001,.003,false);
  // Slightly tilted display, rather than a second vertical box touching the laptop.
  const start=parts.length;box('laptop-lid','aluminium',.13,.365,.778,.355,.009,.235,.003);box('laptop-screen','screen',.141,.374,.79,.333,.002,.21,.001);
  for(const m of parts.slice(start)){for(const v of m.vertices)v[1]-=(v[2]-.778)*.22;// Rounded parts keep their small box proxy; flat prisms are re-derived.
   if(m.normals)m.normals=m.normals.map(([x,y,z])=>{const n=[x,y,z+.22*y],l=Math.hypot(...n);return n.map(t=>t/l);});else m.collision=[convexSolid(m)];}
  box('external-keyboard','ivory',.77,.48,.765,.44,.14,.014,.006);for(let row=0;row<5;row++)for(let col=0;col<(row===4?6:15);col++){const w=row===4&&col===2?.135:.024;box(`ext-key:${row}:${col}`,'metal',.785+col*.0275+(row===4&&col>2?.11:0),.488+row*.026,.779,w,.021,.006,.002,false);}box('mouse-mat','cloth',1.3,.46,.766,.28,.24,.002,.015,false);parts.push(sphere('mouse','ivory',[1.43,.575,.768],.03,{scale:[1,1.8],rings:6,collision:false}));
  box('cable-tray','metal',.3,.12,.64,1.2,.14,.04,.01);rod('monitor-cable','rubber',[1.08,.23,.98],[1.08,.23,.68],.003);
 }else if(kind==='media-console'){
  legs('leg',0,0,2.2,.45,0,.14);box('carcass','walnut',0,0,.12,2.2,.45,.32,.012);box('top','walnut',-.015,-.01,.44,2.23,.47,.035,.012);
  for(let i=0;i<3;i++){box('door:'+i,'walnut',.02+i*.725,.451,.15,.705,.02,.26,.005);for(let s=0;s<15;s++)box(`flute:${i}:${s}`,'edge',.038+i*.725+s*.045,.472,.16,.016,.009,.24,.002,false);}
 }else if(kind==='television-85'){
  // Manufacturer outer dimensions; stand is our separate approximate original design.
  box('bezel','dark',0,.12,.08,1.8922,.0272,1.0819,.004);box('display','screen',.008,.1472,.088,1.8762,.002,1.0659,.001);
  box('rear-chassis','dark',.18,.06,.2,1.53,.065,.62,.03,false);box('rear-port-panel','metal',1.2,.055,.32,.4,.006,.16,.004,false);
  for(const x of [.28,1.61]){const start=parts.length;box('stand:'+x,'metal',x-.012,0,0,.024,.34,.018,.008);box('stand-riser:'+x,'metal',x-.012,.12,.012,.024,.035,.14,.008);for(const m of parts.slice(start))m.collision=m.collision||[];}
  box('status-led','ivory',.945,.149,.082,.003,.001,.002,0,false);
 }else if(kind==='floor-speaker'){
  box('plinth','dark',0,0,0,.3,.34,.035,.012);box('cabinet','walnut',.02,.02,.035,.26,.3,.965,.014);
  // Lathe profiles are authored along +z then rotated to face +y (the front baffle at y=.32).
    const driver=(i,z,r,tweeter)=>{const y0=.32,base=[.15,y0];
   const frame=lathe('driver-rim:'+i,'metal',[.15,z],[[r,y0],[r,y0+.006],[r*.94,y0+.008],[r*.92,y0+.004]],{segments:40,capBottom:false,capTop:false,collision:false});
   const cone=tweeter?lathe('driver-cone:'+i,'metal',[.15,z],[[r*.9,y0+.004],[r*.7,y0+.006],[r*.45,y0+.012],[r*.2,y0+.016],[0,y0+.017]],{segments:32,capBottom:false,capTop:false,collision:false})
    :lathe('driver-cone:'+i,'rubber',[.15,z],[[r*.92,y0+.004],[r*.86,y0+.012],[r*.8,y0+.006],[r*.55,y0-.012],[r*.32,y0-.02],[r*.3,y0-.02]],{segments:40,capBottom:false,capTop:false,collision:false});
   const cap=lathe('driver-dome:'+i,'dark',[.15,z],[[r*.31,y0-.02],[r*.25,y0-.008],[r*.12,y0-.002],[0,y0]],{segments:24,capBottom:false,capTop:false,collision:false});
   for(const m of [frame,cone,cap]){m.vertices=m.vertices.map(([x,yy,zz])=>[x,zz,yy]);m.normals=m.normals.map(([x,yy,zz])=>[x,zz,yy]);for(let k=0;k<m.indices.length;k+=3){const t=m.indices[k+1];m.indices[k+1]=m.indices[k+2];m.indices[k+2]=t;}parts.push(m);}
  };
  // lathe axis is z; swap (y,z) so the axis points along +y at height z.
  for(const [i,z,r]of [[0,.27,.087],[1,.53,.087],[2,.81,.03]])driver(i,z,r,i===2);
  {const port=lathe('bass-port','dark',[.15,.1],[[.03,.326],[.024,.32],[.023,.27],[0,.27]],{segments:28,capBottom:false,capTop:false,collision:false});port.vertices=port.vertices.map(([x,yy,zz])=>[x,zz,yy]);port.normals=port.normals.map(([x,yy,zz])=>[x,zz,yy]);for(let k=0;k<port.indices.length;k+=3){const t=port.indices[k+1];port.indices[k+1]=port.indices[k+2];port.indices[k+2]=t;}parts.push(port);}
  for(const [x,y]of [[.04,.04],[.26,.04],[.04,.3],[.26,.3]])parts.push(lathe(`spike:${x}:${y}`,'metal',[x,y],[[0,-.0001],[.004,.004],[.012,.012],[.012,.018],[0,.018]],{segments:12,collision:false}));
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
  box('back','walnut',.015,0,.78,.45,.04,.12,.015);for(const x of [.06,.39])rod('back-post:'+x,'metal',[x+.02,.02,.68],[x+.02,.02,.8],.011);
 }else if(kind==='sectional-sofa'){
  // Turned, tapered walnut feet with a brass ferrule.
  for(const [i,x,y]of [[0,.1,.1],[1,2.65,.1],[2,.1,1.75],[3,.85,1.75],[4,2.65,.82]]){const cx=x+.035,cy=y+.035;parts.push(lathe('foot:'+i,'walnut',[cx,cy],[[.016,0],[.018,.012],[.021,.05],[.027,.125],[.03,.14],[0,.14]],{segments:20}));parts.push(lathe('foot-ferrule:'+i,'brass',[cx,cy],[[.0165,0],[.0175,.012],[.0175,.014],[0,.014]],{segments:20,collision:false}));}
  // Upholstered base, back and track arms: padded envelopes with sewn piping, not boxes.
  const shell=(id,origin,size,exponent,trim=true)=>{const p={id,materialId:'cloth',origin,size,exponent,creaseDepth:0};const m=upholsteryVolume(p);delete m.softSupport;parts.push(m);if(trim)parts.push(upholsteryTrim({...p,id:id+':piping'}));};
  shell('main-frame',[0,0,.12],[2.8,.95,.24],.32,false);shell('chaise-frame',[0,.7,.12],[1,1.2,.24],.32,false);
  shell('back',[0,0,.3],[2.8,.18,.56],.38);for(const x of [0,2.64])shell('arm:'+x,[x,.15,.29],[.16,.79,.34],.42);
  cushion('chaise-seat',.16,.2,.36,.82,1.65,.16);
  for(let i=0;i<2;i++)cushion('seat:'+i,1.0+i*.82,.2,.36,.8,.71,.16);
  for(let i=0;i<3;i++){cushion('back-cushion:'+i,.18+i*.82,.17,.52,.79,.16,.35);}
  parts.push({...drapedTextile({id:'throw',x:.24,y:1.12,z:.55,width:.6,flatLength:.66,drop:.24,radius:.09}),softSupport:'overlay'});
 }else if(kind==='pedal-bin'){
  // Kitchen pedal bin: brushed shell, plastic base, liner folded over the rim,
  // shallow open cavity under a hinged lid that lifts when the bin is inspected.
  const x=.34,y=.33,W=.32,D=.34,H=.6;
  parts.push(roundedBox('base-ring','dark',[x-.006,y-.006,0],[W+.012,D+.012,.035],.012));
  parts.push(roundedBox('body','steel',[x,y,.03],[W,D,H-.09],.035));
  for(const [i,[X,Y,WW,DD]]of [[x,y,W,.012],[x,y+D-.012,W,.012],[x,y,.012,D],[x+W-.012,y,.012,D]].entries())parts.push(roundedBox('rim-wall:'+i,'steel',[X,Y,H-.075],[WW,DD,.065],.005));
  parts.push(roundedBox('liner','liner',[x+.012,y+.012,H-.07],[W-.024,D-.024,.004],.002,{collision:false}));
  parts.push(roundedBox('liner-fold','liner',[x-.003,y-.003,H-.028],[W+.006,D+.006,.018],.006,{collision:false}));
  const start=parts.length;
  parts.push(roundedBox('lid','steel',[x-.004,y-.004,H-.012],[W+.008,D+.008,.022],.011));
  parts.push(roundedBox('lid-crown','steel',[x+.03,y+.03,H+.006],[W-.06,D-.06,.008],.004,{collision:false}));
  for(const part of parts.slice(start))part.lidHinge={point:[.5,y-.004,H-.012],axis:[1,0,0],angle:1.25};
  parts.push(roundedBox('hinge-cover','dark',[x+W/2-.07,y-.02,H-.03],[.14,.022,.03],.008,{collision:false}));
  parts.push(roundedBox('pedal','dark',[x+W/2-.06,y+D-.004,.012],[.12,.07,.022],.009,{collision:false}));
 }else if(kind==='wheelie-bin'){
  // Outdoor wheelie bin: tapered moulded body, ribbed lid on a rear hinge,
  // handle bar, axle and two wheels; full bin bags are carried out to it.
  const x=.21,y=.13,W=.58,D=.74,H=1.0,body=roundedBox('body','green-plastic',[x,y,.06],[W,D,H-.1],.04);
  // Taper: the moulding narrows toward the base so bins nest, as real ones do.
  const cx=x+W/2,cy=y+D/2;body.vertices=body.vertices.map(([vx,vy,vz])=>{const k=.86+.14*Math.min(1,Math.max(0,(vz-.06)/(H-.1)));return [cx+(vx-cx)*k,cy+(vy-cy)*k,vz];});parts.push(body);
  parts.push(roundedBox('top-rim','green-plastic',[x-.012,y-.012,H-.06],[W+.024,D+.024,.03],.01));
  const start=parts.length;
  parts.push(roundedBox('lid','green-plastic',[x-.02,y-.03,H-.03],[W+.04,D+.05,.035],.014));
  for(let i=0;i<4;i++)parts.push(roundedBox('lid-rib:'+i,'green-plastic',[x+.06,y+.08+i*(D-.16)/3,H+.004],[W-.12,.02,.008],.004,{collision:false}));
  parts.push(roundedBox('lid-lip','green-plastic',[x+W/2-.12,y+D+.01,H-.045],[.24,.025,.02],.008,{collision:false}));
  for(const part of parts.slice(start))part.lidHinge={point:[.5,y-.03,H-.03],axis:[1,0,0],angle:1.6};
  rod('handle','dark',[x+.02,y-.06,H-.06],[x+W-.02,y-.06,H-.06],.016);
  for(const X of [x+.02,x+W-.02])rod('handle-arm:'+X,'dark',[X,y-.06,H-.06],[X,y+.02,H-.09],.014);
  rod('axle','metal',[x-.03,y+.02,.11],[x+W+.03,y+.02,.11],.012);
  for(const [i,X]of [[0,x-.05],[1,x+W+.005]]){const wheel=smoothRod('wheel:'+i,'rubber',[X,y+.02,.11],[X+.045,y+.02,.11],.11,{segments:24});parts.push(wheel);parts.push(smoothRod('hub:'+i,'dark',[X-.002,y+.02,.11],[X+.047,y+.02,.11],.04,{segments:16,collision:false}));}
 }else if(kind==='pendant-lamp'){
  // Ceiling pendant over a counter: brass canopy at the ceiling, braided cord,
  // spun enamel dome shade (open, double-sided), socket and bulb. Hangs so the
  // shade rim sits ~0.7 m above a 0.925 m worktop, out of head height over the bar.
  const cx=.5,cy=.4,ceiling=recipe.parameters.ceiling??2.95,rim=recipe.parameters.rimHeight??1.62,R=.17;
  parts.push(lathe('canopy','brass',[cx,cy],[[.055,ceiling-.035],[.06,ceiling-.025],[.06,ceiling-.006],[0,ceiling-.006]],{segments:28,collision:false}));
  parts.push(smoothRod('cord','cord',[cx,cy,ceiling-.035],[cx,cy,rim+.23],.0035,{segments:8,collision:false}));
  parts.push(lathe('cord-grip','brass',[cx,cy],[[.012,rim+.215],[.014,rim+.23],[.008,rim+.27],[0,rim+.275]],{segments:16,collision:false}));
  const shade=lathe('shade','enamel',[cx,cy],[[R,rim],[R*.995,rim+.006],[R*.93,rim+.05],[R*.74,rim+.12],[R*.42,rim+.185],[R*.14,rim+.215],[.03,rim+.22]],{segments:48,capBottom:false,capTop:false,collision:false});shade.doubleSided=true;parts.push(shade);
  parts.push(lathe('shade-lip','brass',[cx,cy],[[R+.004,rim-.004],[R+.006,rim+.004],[R*.995,rim+.008],[R*.985,rim]],{segments:48,capBottom:false,capTop:false,collision:false}));
  const socket=lathe('socket','brass',[cx,cy],[[.018,rim+.13],[.02,rim+.14],[.02,rim+.2],[0,rim+.21]],{segments:16,collision:false});socket.castShadow=false;parts.push(socket);
  const bulb=sphere('bulb','bulb',[cx,cy,rim+.1],.035,{collision:false});bulb.castShadow=false;parts.push(bulb);
  const l=recipe.light||{};
  return {parts,light:{type:'spot',position:[cx,cy,rim-.01],target:[cx,cy,0],color:l.color??0xffd9a8,intensity:l.intensity??8,distance:l.distance??3.2,angle:l.angle??.75,penumbra:l.penumbra??.6,decay:2,samples:[[-R*.4,0,0],[R*.4,0,0]]}};
 }else throw Error('Unknown studio furniture family');
 for(const p of parts)if(!recipe.materials[p.materialId])throw Error('Missing studio material '+p.materialId);
 return {parts};
}
