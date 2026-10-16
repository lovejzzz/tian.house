import {finishFurnitureEdges} from './furniture-edge-finish.js';
import {appendSlabPolygon} from './scene-slab-volumes.js';import {convexSolid} from './convex-solid.js';
// Editable source objects retain plumbing/storage behavior; this generates their solid form.
export function wetFurnitureVolume(recipe){
 const {width:w,depth:d,height:h}=recipe.parameters,parts=[];
 if(![w,d,h].every(v=>Number.isFinite(v)&&v>.4))throw Error('Invalid wet furniture dimensions');
 const prism=(id,materialId,polygon,z,Z)=>{const m={id,role:'furniture',materialId,vertices:[],indices:[],collision:[]};appendSlabPolygon(m,polygon,z,Z);m.collision=[convexSolid(m)];parts.push(m);};
 const box=(id,mat,x,y,z,W,D,H)=>prism(id,mat,[[x,y],[x+W,y],[x+W,y+D],[x,y+D]],z,z+H);
 const ellipse=(id,mat,cx,cy,rx,ry,z,Z)=>prism(id,mat,Array.from({length:20},(_,i)=>{const a=i*Math.PI/10;return [cx+rx*Math.cos(a),cy+ry*Math.sin(a)];}),z,Z);
 const rim=(id,mat,cx,cy,rx,ry,thickness,z,Z)=>{if(thickness>=Math.min(rx,ry))throw Error('Invalid basin rim');for(let i=0;i<20;i++){const a=i*Math.PI/10,b=(i+1)*Math.PI/10,p=(r,s,t)=>[cx+r*Math.cos(t),cy+s*Math.sin(t)];prism(`${id}:${i}`,mat,[p(rx,ry,a),p(rx,ry,b),p(rx-thickness,ry-thickness,b),p(rx-thickness,ry-thickness,a)],z,Z);}};
 const kind=recipe.semantics.kind;
 if(kind==='counter'){
  box('kick','dark',.07,.06,0,w-.14,d-.12,.12);box('carcass','timber',.015,0,.12,w-.03,d-.04,h-.17);
  box('worktop','stone',0,0,h-.05,w,d,.05);
  for(let i=0;i<2;i++){const W=(w-.055)/2;box(`door:${i}`,'enamel',.02+i*(W+.015),d-.04,.15,W,.025,h-.23);box(`pull:${i}`,'steel',.09+i*(W+.015),d-.015,h-.22,W-.14,.025,.018);}
 }else if(kind==='kitchen-sink'){
  // A cabinet shell supports a genuinely open inset basin, not a solid worktop painted dark.
  box('kick','dark',.07,.06,0,w-.14,d-.12,.12);
  box('cabinet-bottom','timber',.02,.02,.12,w-.04,d-.06,.035);
  for(const [i,x]of [0,w-.025].entries())box(`cabinet-side:${i}`,'timber',x,0,.12,.025,d-.04,h-.17);
  box('cabinet-back','timber',.025,0,.12,w-.05,.025,h-.17);
  for(let i=0;i<2;i++){const W=(w-.055)/2;box(`door:${i}`,'enamel',.02+i*(W+.015),d-.04,.15,W,.025,h-.23);box(`pull:${i}`,'steel',.09+i*(W+.015),d-.015,h-.22,W-.14,.025,.018);}
  const x=w*.18,y=d*.24,W=w*.64,D=d*.55,t=.018,z=h-.20;
  box('top-left','stone',0,0,h-.05,x,d,.05);box('top-right','stone',x+W,0,h-.05,w-x-W,d,.05);
  box('top-back','stone',x,0,h-.05,W,y,.05);box('top-front','stone',x,y+D,h-.05,W,d-y-D,.05);
  box('bowl-bottom','steel',x,y,z,W,D,t);
  for(const [i,X]of [x,x+W-t].entries())box(`bowl-side:${i}`,'steel',X,y,z,t,D,h-z+.005);
  for(const [i,Y]of [y,y+D-t].entries())box(`bowl-end:${i}`,'steel',x,Y,z,W,t,h-z+.005);
  ellipse('drain','dark',w/2,y+D/2,.025,.025,z+t,z+t+.002);
  box('tap-riser','steel',w/2-.018,y-.08,h,.036,.04,.25);
  box('tap-spout','steel',w/2-.018,y-.08,h+.22,.036,D*.55,.03);
  box('tap-lever','steel',w/2+.018,y-.07,h+.08,.065,.018,.018);
 }else if(kind==='sink'){
  ellipse('pedestal','ceramic',w/2,d*.38,w*.14,d*.18,0,h-.2);
  ellipse('basin-bottom','ceramic',w/2,d*.53,w*.38,d*.36,h-.18,h-.14);
  rim('basin','ceramic',w/2,d*.53,w*.46,d*.44,.045,h-.14,h);
  box('tap-riser','steel',w/2-.018,.025,h-.13,.036,.04,.3);box('tap-spout','steel',w/2-.018,.025,h+.13,.036,d*.3,.035);
  ellipse('drain','steel',w/2,d*.53,.025,.025,h-.139,h-.135);
 }else if(kind==='toilet'){
  ellipse('base','ceramic',w/2,d*.57,w*.3,d*.27,0,.13);
  ellipse('pedestal','ceramic',w/2,d*.55,w*.22,d*.22,.1,.32);
  ellipse('bowl-bottom','ceramic',w/2,d*.58,w*.38,d*.3,.3,.34);
  rim('bowl','ceramic',w/2,d*.58,w*.46,d*.35,.055,.34,.45);
  rim('seat','enamel',w/2,d*.58,w*.47,d*.36,.055,.45,.475);
  box('cistern','ceramic',.035,0,.35,w-.07,d*.2,h-.35);box('lid','ceramic',.02,0,h,w-.04,d*.22,.025);
  box('flush','steel',w*.65,d*.21,h-.13,.08,.025,.025);
 }else if(kind==='shower'){
  // Flush finish over the supporting floor, open front, fixed rear/side panels: physical access is not a solid box.
  box('tray','ceramic',0,0,0,w,d,.001);parts.at(-1).collision=[];
  box('back-panel','glass',0,0,0,w,.012,h);
  for(const [i,x]of [0,w-.012].entries())box(`side-panel:${i}`,'glass',x,0,0,.012,d,h);
  for(const [i,x]of [0,w-.025].entries())for(const [j,y]of [0,d-.025].entries())box(`post:${i}:${j}`,'steel',x,y,0,.025,.025,h);
  box('back-rail','steel',0,0,h-.025,w,.025,.025);
  for(const [i,x]of [0,w-.025].entries())box(`side-rail:${i}`,'steel',x,0,h-.025,.025,d,.025);
  box('riser','steel',w/2-.015,.035,.85,.03,.03,h-.95);
  box('shower-arm','steel',w/2-.015,.035,h-.12,.03,d*.35,.025);
  ellipse('shower-head','steel',w/2,d*.35,.095,.095,h-.15,h-.125);
  box('mixer','steel',w/2-.12,.035,1.05,.24,.05,.035);
  ellipse('drain','steel',w/2,d*.5,.04,.04,.001,.002);parts.at(-1).collision=[];
 }else throw Error('Unknown wet furniture family');
 return {parts:finishFurnitureEdges(parts,recipe.materials)};
}
