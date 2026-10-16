import {appendSlabPolygon} from './scene-slab-volumes.js';import {convexSolid} from './convex-solid.js';
// Shared assembly vocabulary; each source object remains independently editable and supported.
export function interiorDetailsVolume(recipe){
 const parts=[],kind=recipe.parameters.kind;
 const prism=(id,mat,polygon,z,Z,collision=true)=>{const m={id,role:'furniture',materialId:mat,vertices:[],indices:[],collision:[]};appendSlabPolygon(m,polygon,z,Z);m.collision=collision?[convexSolid(m)]:[];parts.push(m);};
 const box=(id,mat,x,y,z,w,d,h,collision=true)=>prism(id,mat,[[x,y],[x+w,y],[x+w,y+d],[x,y+d]],z,z+h,collision);
 const disk=(id,mat,x,y,r,z,h)=>prism(id,mat,Array.from({length:16},(_,i)=>[x+r*Math.cos(i*Math.PI/8),y+r*Math.sin(i*Math.PI/8)]),z,z+h);
 const cup=(id,x,y,z)=>{disk(id+':base','ceramic',x,y,.045,z,.012);for(let i=0;i<16;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8,p=(r,t)=>[x+r*Math.cos(t),y+r*Math.sin(t)];prism(id+':rim:'+i,'ceramic',[p(.045,a),p(.045,b),p(.035,b),p(.035,a)],z+.012,z+.09);}disk(id+':drink','coffee',x,y,.034,z+.068,.002);box(id+':handle','ceramic',x+.04,y-.012,z+.025,.03,.024,.04);};
 const book=(id,x,y,z,w=.3,d=.23)=>{box(id+':cover','book',x,y,z,w,d,.008);box(id+':paper','paper',x+.008,y+.003,z+.008,w-.016,d-.008,.025);box(id+':top','book',x,y,z+.033,w,d,.007);};
 if(kind==='tea'){
  box('tray','wood',.12,.22,0,.7,.5,.025);for(const y of [.22,.7])box('tray-edge:'+y,'wood',.12,y,.025,.7,.02,.035);
  disk('teapot','ceramic',.47,.42,.09,.025,.12);disk('lid','ceramic',.47,.42,.095,.145,.015);disk('knob','wood',.47,.42,.02,.16,.025);box('spout','ceramic',.54,.405,.085,.13,.03,.035);cup('cup-a',.25,.59,.025);cup('cup-b',.7,.59,.025);
 }else if(kind==='books'||kind==='desk'||kind==='radio'){
  book('book-a',.17,.22,0);book('book-b',.19,.24,.04,.28,.21);
  if(kind==='desk'){cup('coffee',.74,.62,0);box('pencil','wood',.24,.65,.005,.32,.009,.009);}
  if(kind==='radio'){box('radio','metal',.58,.44,0,.28,.2,.22);box('dial','paper',.6,.641,.12,.17,.006,.055);box('antenna','metal',.61,.5,.22,.009,.009,.35);for(let i=0;i<7;i++)box('grille:'+i,'coffee',.6+i*.028,.643,.025,.012,.004,.06);}
 }else if(kind==='kitchen'){
  box('board','wood',.12,.12,0,.75,.65,.025);disk('bowl','ceramic',.53,.4,.15,.025,.06);for(let i=0;i<5;i++)disk('produce:'+i,i%2?'green':'terracotta',.44+(i%3)*.07,.36+Math.floor(i/3)*.08,.042,.085,.065);box('knife-blade','metal',.23,.38,.03,.025,.23,.006);box('knife-handle','wood',.227,.61,.03,.031,.11,.025);
 }else if(kind==='wash'){
  for(let i=0;i<3;i++)box('towel:'+i,i%2?'linen':'paper',.15+i*.01,.2+i*.01,i*.055,.48,.35,.05);
  box('soap','ceramic',.74,.4,0,.1,.1,.14);box('pump','metal',.78,.44,.14,.015,.015,.045);box('nozzle','metal',.78,.44,.18,.065,.015,.012);
 }else if(kind==='bath-mirror'){
  box('cabinet-back','wood',.16,0,1.35,.68,.025,.8);
  for(const x of [.16,.815])box('cabinet-side:'+x,'wood',x,0,1.35,.025,.16,.8);
  for(const z of [1.35,1.72,2.125])box('cabinet-shelf:'+z,'wood',.16,0,z,.68,.16,.025);
  box('door','wood',.185,.15,1.375,.63,.02,.75);
  box('mirror','mirror',.2,.171,1.39,.6,.004,.72);
  box('pull','metal',.76,.18,1.4,.015,.025,.12);
 }else if(kind==='bath-towel'){
  for(const x of [.16,.8])box('rail-bracket:'+x,'metal',x,0,1.25,.035,.16,.035);
  box('rail','metal',.16,.135,1.25,.675,.025,.025);
  box('towel-back','linen',.28,.12,.72,.44,.018,.53,false);
  box('towel-front','linen',.28,.165,.7,.44,.022,.55,false);
  box('towel-fold','linen',.28,.12,1.24,.44,.067,.025,false);
  box('woven-border','green',.29,.188,.75,.42,.003,.025,false);
 }else if(kind==='art'){
  box('back','wood',.13,0,1.2,.74,.035,.8);box('paper','paper',.17,.035,1.24,.66,.004,.72);
  box('composition-a','terracotta',.23,.04,1.31,.2,.006,.48);box('composition-b','green',.47,.04,1.55,.26,.006,.31);box('composition-c','wood',.48,.04,1.34,.19,.006,.12);
 }else if(kind==='curtain'){
  box('rail','metal',0,.07,2.82,1,.025,.025);
  for(const start of [0,.72])for(let i=0;i<7;i++)box(`fold:${start}:${i}`,'linen',start+i*.04,.05+(i%2)*.025,.12,.045,.035,2.65,false);
 }else if(kind==='wardrobe'){
  box('plinth','wood',.08,.06,0,1.64,.5,.1);box('back','paper',0,0,.1,1.8,.035,2.05);for(const x of [0,1.76])box('side:'+x,'paper',x,0,.1,.04,.6,2.05);box('top','paper',0,0,2.15,1.8,.6,.045);
  for(let i=0;i<2;i++){box('door:'+i,'paper',.025+i*.88,.57,.12,.855,.035,2.02);box('inset:'+i,'linen',.08+i*.88,.606,.25,.74,.01,1.73);box('handle:'+i,'metal',.83+i*.1,.617,1.02,.018,.035,.17);}
 }else throw Error('Unknown interior detail family');
 return {parts};
}
