import {appendSlabPolygon} from './scene-slab-volumes.js?v=1d7ffb1877ce';import {convexSolid} from './convex-solid.js?v=1d7ffb1877ce';
import {roundedBox,lathe,rod,sphere,extrudeZ,checkDetailPart} from './detail-geometry.js?v=1d7ffb1877ce';
// Shared assembly vocabulary; each source object remains independently editable and supported.
// Small objects are turned or filleted like the real thing: cups have walls, a
// lip and a looped handle; books have rounded spines and inset page blocks;
// curtains hang as continuous pleated panels from a rod with finials.
export function interiorDetailsVolume(recipe){
 const parts=[],kind=recipe.parameters.kind;
 const prism=(id,mat,polygon,z,Z,collision=true)=>{const m={id,role:'furniture',materialId:mat,vertices:[],indices:[],collision:[]};appendSlabPolygon(m,polygon,z,Z);m.collision=collision?[convexSolid(m)]:[];parts.push(m);};
 // Every visible box gets a small true fillet scaled to its thinnest dimension.
 const box=(id,mat,x,y,z,w,d,h,collision=true)=>{const r=Math.min(.006,Math.min(w,d,h)*.3);if(r<.0006){prism(id,mat,[[x,y],[x+w,y],[x+w,y+d],[x,y+d]],z,z+h,collision);return;}parts.push(roundedBox(id,mat,[x,y,z],[w,d,h],r,{collision}));};
 const disk=(id,mat,x,y,r,z,h,collision=true)=>parts.push(lathe(id,mat,[x,y],[[r*.96,z],[r,z+h*.15],[r,z+h*.85],[r*.96,z+h],[0,z+h]],{segments:28,collision}));
 const arcHandle=(id,mat,center,radius,thickness,from,to,plane)=>{let prev=null;for(let k=0;k<=8;k++){const t=from+(to-from)*k/8,pt=plane(Math.cos(t)*radius,Math.sin(t)*radius).map((v,i)=>v+center[i]);if(prev)parts.push(rod(`${id}:${k}`,mat,prev,pt,thickness,{segments:10,collision:false}));prev=pt;}};
 const cup=(id,x,y,z)=>{
  parts.push(lathe(id+':body','ceramic',[x,y],[[.028,z],[.034,z+.004],[.04,z+.03],[.045,z+.085],[.046,z+.09],[.042,z+.09],[.038,z+.03],[.03,z+.012],[0,z+.012]],{segments:32,capTop:false}));
  parts.push(lathe(id+':drink','coffee',[x,y],[[.0405,z+.068],[0,z+.068]],{segments:28,capBottom:false,capTop:false,collision:false}));
  arcHandle(id+':handle','ceramic',[x+.05,y,z+.05],.022,.0055,-Math.PI/2,Math.PI/2,(a,b)=>[a,0,b]);
 };
 const book=(id,x,y,z,w=.3,d=.23)=>{box(id+':cover','book',x,y,z,w,d,.008);box(id+':paper','paper',x+.008,y+.003,z+.008,w-.016,d-.008,.025);box(id+':top','book',x,y,z+.033,w,d,.007);parts.push(roundedBox(id+':spine','book',[x-.004,y,z],[.012,d,.04],.006,{collision:false}));};
 if(kind==='tea'){
  box('tray','wood',.12,.22,0,.7,.5,.012);for(const y of [.22,.7])box('tray-edge:'+y,'wood',.12,y,.012,.7,.02,.035);
  for(const x of [.12,.8])box('tray-end:'+x,'wood',x,.24,.012,.02,.46,.035);
  parts.push(lathe('teapot','ceramic',[.47,.42],[[.06,.012],[.075,.02],[.095,.06],[.098,.09],[.088,.125],[.07,.14],[0,.14]],{segments:36}));
  parts.push(lathe('lid','ceramic',[.47,.42],[[.072,.138],[.074,.142],[.06,.155],[.03,.16],[0,.16]],{segments:32,collision:false}));
  parts.push(sphere('knob','wood',[.47,.42,.168],.014,{collision:false}));
  // Spout: tapering curve; handle: loop on the opposite side.
  let prev=[.555,.42,.06];for(let k=1;k<=5;k++){const t=k/5,pt=[.555+.075*t,.42,.06+.065*t*t+.02*t];parts.push(rod('spout:'+k,'ceramic',prev,pt,.016-.008*t,{segments:12,collision:false}));prev=pt;}
  arcHandle('handle','ceramic',[.375,.42,.085],.04,.008,Math.PI/2,Math.PI*1.5,(a,b)=>[a,0,b]);
  cup('cup-a',.25,.59,.012);cup('cup-b',.7,.59,.012);
 }else if(kind==='books'||kind==='desk'||kind==='radio'){
  book('book-a',.17,.22,0);book('book-b',.19,.24,.04,.28,.21);
  if(kind==='desk'){cup('coffee',.74,.62,0);parts.push(rod('pencil','wood',[.24,.655,.0045],[.55,.655,.0045],.0045,{segments:6,collision:false}));parts.push(rod('pencil-tip','paper',[.55,.655,.0045],[.565,.655,.0045],.002,{segments:6,collision:false}));}
  if(kind==='radio'){box('radio','metal',.58,.44,0,.28,.2,.22);box('dial','paper',.6,.641,.12,.17,.006,.055);parts.push(rod('antenna','metal',[.615,.505,.22],[.62,.51,.57],.004,{segments:8,collision:false}));for(let i=0;i<7;i++)box('grille:'+i,'coffee',.6+i*.028,.643,.025,.012,.004,.06);for(const [i,x]of [.79,.83].entries())parts.push(lathe('tuner:'+i,'coffee',[x,.645],[[.012,.13],[.012,.15],[0,.15]],{segments:16,collision:false}));}
 }else if(kind==='kitchen'){
  // End-grain board with a juice groove, a fruit bowl, and a chef's knife
  // lying separately on the board (blade, bolster, riveted handle).
  box('board','wood',.12,.12,0,.75,.65,.025);
  parts.push(roundedBox('board-groove','coffee',[.15,.15,.0245],[.69,.008,.001],.0004,{collision:false}));
  parts.push(lathe('bowl','ceramic',[.53,.4],[[.06,.025],[.09,.03],[.135,.06],[.15,.085],[.142,.088],[.125,.06],[.08,.038],[0,.036]],{segments:40,capTop:false}));
  for(let i=0;i<5;i++)parts.push(sphere('produce:'+i,i%2?'green':'terracotta',[.47+(i%3)*.06,.36+Math.floor(i/3)*.075,.072+(i===4?.04:0)],.038+(i%2)*.004,{collision:false}));
  parts.push(extrudeZ('knife-blade','metal',[[.23,.38],[.255,.38],[.255,.6],[.245,.6],[.23,.42]],.026,.029,{collision:false}));
  parts.push(roundedBox('knife-bolster','metal',[.228,.6,.025],[.029,.014,.012],.004,{collision:false}));
  parts.push(roundedBox('knife-handle','wood',[.229,.614,.025],[.027,.11,.016],.007,{collision:false}));
  for(const y of [.635,.665,.695])parts.push(lathe('knife-rivet:'+y,'metal',[.2425,y],[[.003,.0405],[0,.0412]],{segments:8,capBottom:false,capTop:false,collision:false}));
 }else if(kind==='wash'){
  for(let i=0;i<3;i++)box('towel:'+i,i%2?'linen':'paper',.15+i*.01,.2+i*.01,i*.055,.48,.35,.05);
  parts.push(lathe('soap','ceramic',[.79,.45],[[.045,0],[.05,.01],[.05,.12],[.035,.14],[.016,.145],[0,.145]],{segments:28}));
  parts.push(lathe('pump','metal',[.79,.45],[[.014,.145],[.014,.17],[.011,.18],[0,.181]],{segments:16,collision:false}));
  parts.push(rod('nozzle','metal',[.79,.45,.176],[.845,.45,.172],.006,{segments:10,collision:false}));
 }else if(kind==='bath-mirror'){
  box('cabinet-back','wood',.16,0,1.35,.68,.025,.8);
  for(const x of [.16,.815])box('cabinet-side:'+x,'wood',x,0,1.35,.025,.16,.8);
  for(const z of [1.35,1.72,2.125])box('cabinet-shelf:'+z,'wood',.16,0,z,.68,.16,.025);
  box('door','wood',.185,.15,1.375,.63,.02,.75);
  parts.push(roundedBox('mirror','mirror',[.205,.17,1.395],[.59,.004,.71],.0015,{collision:false}));
  parts.push(roundedBox('pull','metal',[.762,.172,1.4],[.012,.022,.12],.005,{collision:false}));
 }else if(kind==='bath-towel'){
  for(const x of [.16,.8])parts.push(roundedBox('rail-bracket:'+x,'metal',[x,0,1.24],[.035,.012,.045],.006),rod('rail-post:'+x,'metal',[x+.0175,0,1.2625],[x+.0175,.148,1.2625],.009,{segments:12}));
  parts.push(rod('rail','metal',[.16,.148,1.2625],[.835,.148,1.2625],.011,{segments:14}));
  // Towel drapes over the bar: thick back and front panels joined by a rounded fold.
  parts.push(roundedBox('towel-back','linen',[.28,.12,.72],[.44,.018,.53],.008,{collision:false}));
  parts.push(roundedBox('towel-front','linen',[.28,.165,.7],[.44,.022,.55],.01,{collision:false}));
  parts.push(roundedBox('towel-fold','linen',[.28,.12,1.24],[.44,.067,.035],.016,{collision:false}));
  box('woven-border','green',.29,.188,.75,.42,.003,.025,false);
 }else if(kind==='art'){
  // Moulded frame members around a mat and print, not one painted slab.
  box('back','wood',.13,0,1.2,.74,.02,.8);
  for(const [id,x,z,w,h]of [['frame-left',.13,1.2,.035,.8],['frame-right',.835,1.2,.035,.8],['frame-bottom',.165,1.2,.67,.035],['frame-top',.165,1.965,.67,.035]])parts.push(roundedBox(id,'wood',[x,0,z],[w,.04,h],.008,{collision:false}));
  box('paper','paper',.165,.02,1.235,.67,.006,.73);
  box('composition-a','terracotta',.23,.026,1.31,.2,.004,.48);box('composition-b','green',.47,.026,1.55,.26,.004,.31);box('composition-c','wood',.48,.026,1.34,.19,.004,.12);
 }else if(kind==='curtain'){
  // Rod with finials and rings; two pleated panels as continuous wave surfaces.
  parts.push(rod('rail','metal',[-.02,.08,2.83],[1.02,.08,2.83],.011,{segments:14}));
  for(const x of [-.035,1.035])parts.push(sphere('finial:'+x,'metal',[x,.08,2.83],.02,{collision:false}));
  for(const [p,start]of [[0,0],[1,.72]]){
   const front=[],back=[],n=24,W=.3;
   for(let i=0;i<=n;i++){const x=start+W*i/n,phase=i/n*Math.PI*7,y=.075+.018*Math.sin(phase);front.push([x,y+.005]);back.push([x,y-.005]);}
   parts.push(extrudeZ('panel:'+p,'linen',[...back,...front.reverse()],.12,2.78,{collision:false,crease:1.2}));
   for(let k=0;k<7;k++){const x=start+.02+k*(W-.04)/6;parts.push(lathe(`ring:${p}:${k}`,'metal',[x,.08],[[.016,2.81],[.016,2.818],[0,2.818]],{segments:12,capBottom:false,capTop:false,collision:false}));}
  }
 }else if(kind==='wardrobe'){
  box('plinth','wood',.08,.06,0,1.64,.5,.1);box('back','paper',0,0,.1,1.8,.035,2.05);for(const x of [0,1.76])box('side:'+x,'paper',x,0,.1,.04,.6,2.05);box('top','paper',0,0,2.15,1.8,.6,.045);
  for(let i=0;i<2;i++){box('door:'+i,'paper',.025+i*.88,.57,.12,.855,.035,2.02);box('inset:'+i,'linen',.08+i*.88,.606,.25,.74,.01,1.73);parts.push(rod('handle:'+i,'metal',[.839+i*.1,.635,1.02],[.839+i*.1,.635,1.19],.008,{segments:12,collision:false}));}
 }else throw Error('Unknown interior detail family');
 return {parts:parts.map(checkDetailPart)};
}
