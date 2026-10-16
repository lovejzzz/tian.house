import {finishFurnitureEdges} from './furniture-edge-finish.js';
import {upholsteryVolume} from './upholstery-volume.js';
import {upholsteryTrim,drapedTextile} from './textile-detail-volume.js';
import {appendSlabPolygon} from './scene-slab-volumes.js';
import {convexSolid} from './convex-solid.js';
// Original dimensional studies. Source IDs map topology, not exact recovered artwork.
export function domesticFurnitureVolume(recipe){
 const {width:w,depth:d,height:h}=recipe.parameters,kind=recipe.semantics.kind,parts=[];
 if(![w,d,h].every(v=>Number.isFinite(v)&&v>.3))throw Error('Invalid domestic dimensions');
 const box=(id,materialId,x,y,z,W,D,H,cut=0)=>{
  if(![x,y,z,W,D,H,cut].every(Number.isFinite)||Math.min(W,D,H)<=0||cut<0||cut*2>=Math.min(W,D))throw Error('Invalid domestic part');
  const polygon=cut?[[x+cut,y],[x+W-cut,y],[x+W,y+cut],[x+W,y+D-cut],[x+W-cut,y+D],[x+cut,y+D],[x,y+D-cut],[x,y+cut]]:[[x,y],[x+W,y],[x+W,y+D],[x,y+D]];
  const mesh={id,role:'furniture',materialId,vertices:[],indices:[],collision:[]};appendSlabPolygon(mesh,polygon,z,z+H);mesh.collision=[convexSolid(mesh)];parts.push(mesh);
 };
 const padded=(id,materialId,x,y,z,W,D,H)=>{const p={id,materialId,creaseDepth:recipe.parameters.creaseDepth??0,origin:[x,y,z],size:[W,D,H]};parts.push(upholsteryVolume(p),upholsteryTrim({...p,id:id+':piping'}));};
 if(kind==='sofa'||kind==='bed'){
  const bed=kind==='bed',base=bed ? .28 : .26;
  for(const [i,x]of [.1,w-.16].entries())for(const [j,y]of [.1,d-.16].entries())box(`foot:${i}:${j}`,'timber',x,y,0,.06,.06,.18);
  box('frame','timber',.04,.04,.14,w-.08,d-.08,base,.015);
  if(bed){
   box('headboard','timber',0,0,.12,w,.09,h-.12,.018);
   box('foot-rail','timber',0,d-.06,.14,w,.06,base,.015);
   padded('mattress','linen',.06,.1,.14+base,w-.12,d-.16,.22);
   const duvet=drapedTextile({id:'duvet',materialId:'cloth',x:.055,y:.63,z:.14+base+.26,width:w-.11,flatLength:d-.73,drop:.16,radius:.06});duvet.softSupport='cover';parts.push(duvet);
   for(let i=0;i<2;i++)padded(`pillow:${i}`,'linen',.13+i*(w-.26)/2,.16,.14+base+.22,(w-.34)/2,.36,.12);
   const throwCloth=drapedTextile({id:'folded-throw',materialId:'accent',x:.06,y:d-.42,z:.14+base+.275,width:w-.12,flatLength:.34,drop:.19,radius:.06});throwCloth.softSupport='cover';parts.push(throwCloth);
  }else{
   box('back','linen',0,0,.3,w,.18,h-.3,.03);
   for(const [i,x]of [0,w-.16].entries())box(`arm:${i}`,'linen',x,.15,.29,.16,d-.15,.36,.025);
   for(let i=0;i<2;i++){
    const W=(w-.36)/2;padded(`seat-cushion:${i}`,'linen',.17+i*(W+.02),.2,.4,W,d-.23,.13125);
    padded(`back-cushion:${i}`,'linen',.17+i*(W+.02),.15,.55,W,.16,h-.58);
   }
  }
 }else if(kind==='oven'||kind==='fridge'){
  box('plinth','dark',.06,.06,0,w-.12,d-.12,.08);
  // Cabinet stops beneath the separate steel hob; coplanar top faces flicker.
  if(kind==='oven')box('cabinet','enamel',0,0,.08,w,d-.075,h-.115,.018);
  if(kind==='fridge'){
   // Insulated shell, rather than a solid block behind the door.
   box('back','enamel',0,0,.08,w,.065,h-.08);
   for(const [id,x]of [['left',0],['right',w-.045]])box(id+'-side','enamel',x,.065,.08,.045,d-.14,h-.08);
   for(const [id,z]of [['base',.08],['top',h-.045],['divider',h*.66-.025]])box(id+'-liner','enamel',.045,.065,z,w-.09,d-.14,.045);
   for(const [i,z]of [.34,.65,.96].entries())if(z<h*.66-.08){box('shelf:'+i,'glass',.055,.08,z,w-.11,d-.19,.012);box('shelf-edge:'+i,'enamel',.055,d-.12,z-.004,w-.11,.025,.02);}

   for(const [id,z,H]of [['lower',.1,h*.66-.11],['freezer',h*.66,h*.34-.015]]){
    box(id+'-seal','dark',.025,d-.08,z,w-.05,.065,H);
    box(id+'-door','enamel',.015,d-.04,z+.01,w-.03,.04,H-.02,.008);
    box(id+'-handle','steel',.07,d,z+.1,.035,.035,Math.min(.32,H-.15),.005);
   }
  }else{
   box('cooktop','steel',0,0,h-.035,w,d,.035,.015);
   for(let i=0;i<2;i++)for(let j=0;j<2;j++)box(`burner:${i}:${j}`,'dark',.12+i*(w-.36),.12+j*(d-.36),h,.16,.16,.015,.055);
   box('oven-door','dark',.05,d-.06,.12,w-.1,.06,h-.34,.015);
   box('oven-glass','glass',.11,d+.002,.23,w-.22,.008,h-.55,.002);
   box('handle','steel',.09,d+.01,h-.28,w-.18,.045,.035,.01);
   for(let i=0;i<4;i++)box(`control:${i}`,'dark',.08+i*(w-.2)/3,d-.01,h-.15,.04,.035,.04,.008);
  }
 }else throw Error('Unknown domestic family');
 return {parts:finishFurnitureEdges(parts,recipe.materials)};
}
