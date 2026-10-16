import {WorkshopCommands} from './workshop-commands.js';
import {pinReference} from './workshop-reference-dock.js';
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function captureWorkshopView(w,{id=crypto.randomUUID(),name,referenceId=null}){
 return {id,name:name.trim(),referenceId,z:w.z,center:{...w.center},zoom:w.render.zoom,cutaway:!!w.cutaway,ghost:!!w.ghost,grid:!!w.grid,wholeBuilding:!!w.wholeBuilding,showRoofs:w.showRoofs!==false,viewport:{width:w.canvas.clientWidth,height:w.canvas.clientHeight}};
}
export function restoreWorkshopView(w,v){
 if(w.model.pending||w.model.writeLocked){w.status('Finish the current edit or save before restoring a view');return false;}
 const linked=v.referenceId&&w.model.scene?.references.find(r=>r.id===v.referenceId);if(linked)pinReference(w,v.referenceId);
 w.setTool('select');w.setLevel(v.z);if(v.wholeBuilding)w.setBuildingPreview(true);w.center={...v.center};w.render.zoom=v.zoom;w.cutaway=v.cutaway;w.ghost=v.ghost;w.grid=v.grid;w.showRoofs=v.showRoofs!==false;
 for(const [key,button]of [['cutaway','wallView'],['ghost','ghostButton'],['grid','gridButton'],['showRoofs','roofViewButton']])w[button]?.setAttribute('aria-pressed',String(w[key]));
 const mismatch=w.canvas.clientWidth!==v.viewport.width||w.canvas.clientHeight!==v.viewport.height;
 w.status(`${v.name} restored${v.referenceId&&!linked?' · Linked photo is missing':''}${mismatch?' · Viewport differs from saved framing':''}`);w.canvas.focus();return true;
}
export function openSavedViews(w){
 if(w.savedViewsDialog)return;if(w.model.pending){w.status('Finish the current edit first');return;}
 const dialog=el('dialog');dialog.className='workshop-reference-dialog';dialog.setAttribute('aria-label','Saved views');w.savedViewsDialog=dialog;
 const header=el('header'),title=el('h2','Saved views'),close=el('button','Close');close.setAttribute('aria-label','Close saved views');header.append(title,close);
 const name=el('input');name.setAttribute('aria-label','View name');name.placeholder='Entrance, counter, upper floor…';name.maxLength=100;
 const reference=el('select');reference.setAttribute('aria-label','View reference photo');const none=el('option','No linked photo');none.value='';reference.append(none);
 for(const r of w.model.scene?.references||[]){const o=el('option',r.name);o.value=r.id;reference.append(o);}reference.value=w.referenceDock?.selected||'';
 const save=el('button','Save current view'),list=el('div'),status=el('p');status.setAttribute('role','status');status.setAttribute('aria-label','Saved view status');let busy=false;
 const run=async op=>{if(busy)return;busy=true;for(const e of dialog.querySelectorAll('button,input,select'))e.disabled=true;status.textContent='Saving view…';try{const result=await new WorkshopCommands(w.model,w.byId).commitAndSave({requestId:crypto.randomUUID(),baseRevision:w.model.revision,operations:[op]},w.persistence);if(!result.ok)throw Error(result.error);w.updateHistory();w.saveStatus.textContent='Saved';status.textContent='Saved on this device';render();}catch(e){status.textContent=e.message;}finally{busy=false;for(const e of dialog.querySelectorAll('button,input,select'))e.disabled=false;}};
 const render=()=>{list.replaceChildren();for(const v of w.model.scene?.views||[]){const row=el('div');row.className='saved-view-row';const load=el('button',v.name),replace=el('button','Update'),remove=el('button','Remove');load.setAttribute('aria-label','Restore view: '+v.name);replace.setAttribute('aria-label','Update view: '+v.name);remove.setAttribute('aria-label','Remove view: '+v.name);load.onclick=()=>{if(restoreWorkshopView(w,v))dialog.close();};replace.onclick=()=>run({type:'view.save',view:captureWorkshopView(w,{id:v.id,name:v.name,referenceId:reference.value||null})});remove.onclick=()=>run({type:'view.remove',id:v.id});row.append(load,el('small',`Floor ${v.z} · ${v.wholeBuilding?'Whole building':v.cutaway?'Cutaway':'Full walls'} · ${v.viewport.width} × ${v.viewport.height}`),replace,remove);list.append(row);}if(!list.children.length)list.append(el('p','No views saved yet. Frame a useful angle, then give it a name.'));};
 save.onclick=()=>run({type:'view.save',view:captureWorkshopView(w,{name:name.value,referenceId:reference.value||null})});close.onclick=()=>{if(!busy)dialog.close();};dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.onclose=()=>{dialog.remove();w.savedViewsDialog=null;w.canvas.focus();};dialog.addEventListener('keydown',e=>e.stopPropagation());dialog.append(header,el('p','Save the camera, floor, wall and roof display for repeatable comparisons. Views travel with your house and can be undone.'),name,reference,save,list,status);w.element.append(dialog);render();dialog.showModal();name.focus();
}
