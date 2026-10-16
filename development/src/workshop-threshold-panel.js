import {WorkshopCommandGateway} from './workshop-command-gateway.js';
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function openThresholdPanel(workshop){
 if(workshop.model.pending){workshop.status('Finish the current edit first');return;}
 const scene=workshop.model.scene,doors=scene?.openings.filter(o=>o.kind==='door')||[];if(!doors.length){workshop.status('Place a door first');return;}
 const gateway=new WorkshopCommandGateway(workshop.model,workshop.byId,workshop.houseLibrary,workshop.persistence),dialog=el('dialog');dialog.className='house-library-dialog threshold-dialog';dialog.setAttribute('aria-label','Door thresholds');
 const title=el('h2','Door thresholds'),note=el('p','A walkable step that stays attached to its door. Both sides need a floor.'),door=el('select');door.setAttribute('aria-label','Door');
 for(const o of doors){const w=scene.walls.find(w=>w.id===o.hostWallId),option=el('option',`${workshop.world.props(o.tile).CustomName||'Door'} · ${w.x}, ${w.y} · ${w.axis}`);option.value=o.id;door.append(option);}
 const select=(label,options)=>{const s=el('select');s.setAttribute('aria-label',label);for(const [value,text]of options){const o=el('option',text);o.value=value;s.append(o);}return s;};
 const height=select('Step height',[[4,'Low'],[8,'Medium'],[12,'High'],[16,'Extra high']]),depth=select('Step depth',[[.25,'Short'],[.4,'Standard'],[.6,'Deep'],[1,'Landing']]),color=el('input');color.type='color';color.setAttribute('aria-label','Step color');
 const status=el('p');status.setAttribute('role','status');const apply=el('button','Apply threshold'),remove=el('button','Remove threshold'),close=el('button','Cancel');close.onclick=()=>dialog.close();
 const load=()=>{const t=doors.find(o=>o.id===door.value).threshold||{height:8,depth:.4,color:'#444744'};for(const [input,value]of [[height,t.height],[depth,t.depth]]){if(![...input.options].some(o=>Number(o.value)===value)){const o=el('option','Custom');o.value=value;input.append(o);}input.value=value;}color.value=t.color;remove.disabled=!doors.find(o=>o.id===door.value).threshold;};
 const commit=async threshold=>{const controls=[door,height,depth,color,apply,remove,close];controls.forEach(e=>e.disabled=true);status.textContent='Saving…';workshop.saveStatus.textContent='Saving…';
  try{const result=await gateway.commitAndSave({requestId:crypto.randomUUID(),baseRevision:workshop.model.revision,operations:[{type:'opening.threshold',id:door.value,threshold}]});if(!result.ok)throw Error(result.error);workshop.updateHistory();workshop.saveStatus.textContent='Saved';workshop.status(threshold?'Door threshold added · Undo to restore':'Door threshold removed');dialog.close();}catch(e){status.textContent=e.message;workshop.saveStatus.textContent=workshop.persistence.error?'Not saved':'Saved';controls.forEach(e=>e.disabled=false);remove.disabled=!doors.find(o=>o.id===door.value).threshold;}
 };
 door.onchange=load;apply.onclick=()=>commit({height:Number(height.value),depth:Number(depth.value),color:color.value});remove.onclick=()=>commit(null);
 dialog.append(title,note);for(const [label,input]of [['Door',door],['Height',height],['Depth',depth],['Finish',color]]){const row=el('label',label);row.append(input);dialog.append(row);}dialog.append(status,apply,remove,close);dialog.addEventListener('close',()=>{dialog.remove();workshop.canvas.focus();});workshop.element.append(dialog);load();dialog.showModal();
}
