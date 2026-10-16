import {referenceSceneEntities,referenceSceneEntity} from './reference-scene-entities.js';
import {wallFacePolygon} from './workshop-placement.js';
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function referenceEntity(scene,id){return referenceSceneEntity(scene,id)?.entity;}
export function focusReferenceEntity(workshop,id){
 const target=referenceSceneEntity(workshop.model.scene,id);if(!target){workshop.status('The linked entity is no longer in this scene');return;}
 if(workshop.model.pending){workshop.status('Finish or cancel the current edit first');return;}
 workshop.setLevel(target.z);const entity=target.entity;
 if(target.kind==='Room'){workshop.setTool('reshape');workshop.selectedRoomId=entity.id;workshop.refreshRoomSelection();}
 else if(target.kind==='Object'){workshop.setTool('multiselect');workshop.selectObjects(entity,false);}
 else workshop.setTool('select');
 workshop.referenceFocusId=id;workshop.center={x:(target.rect[0]+target.rect[2])/2,y:(target.rect[1]+target.rect[3])/2};workshop.hover=null;
 workshop.status(`${target.kind} linked to photo · Floor ${target.z}`);workshop.refreshReferenceDock?.();workshop.canvas.focus();
}
export function drawReferenceFocus(workshop){
 if(!workshop.referenceFocusId)return;if(workshop.referenceFocusCache?.scene!==workshop.model.scene||workshop.referenceFocusCache?.id!==workshop.referenceFocusId)workshop.referenceFocusCache={scene:workshop.model.scene,id:workshop.referenceFocusId,target:referenceSceneEntity(workshop.model.scene,workshop.referenceFocusId)};const target=workshop.referenceFocusCache.target;if(!target||target.z!==workshop.z)return;
 const r=workshop.render,c=r.ctx,[x0,y0,x1,y1]=target.rect;
 const points=target.wall?wallFacePolygon((x,y,z)=>r.project(x,y,z),target.wall.x,target.wall.y,target.z,target.wall.axis):[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([x,y])=>r.project(x,y,target.z));
 c.save();c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle='#dfc98022';c.strokeStyle='#efdb95';c.lineWidth=3/r.zoom;c.fill();c.stroke();c.restore();
}
export function annotationEditor({workshop,reference,image,run,render,isBusy}){
 const section=el('section'),frame=el('div');frame.className='reference-annotation-frame';frame.style.width=`min(100%, ${330*reference.width/reference.height}px)`;frame.style.aspectRatio=String(reference.width/reference.height);frame.setAttribute('aria-label','Reference annotation canvas');frame.append(image);
 const selection=el('div');selection.className='reference-annotation-box draft';selection.hidden=true;frame.append(selection);
 const caption=el('p','Drag a box on the photo, then describe it. Coordinates stay relative to the original image.'),fields=el('div');fields.className='reference-annotation-fields';
 const label=el('input');label.placeholder='Window, room, furniture…';label.setAttribute('aria-label','Annotation label');
 const evidence=el('select');evidence.setAttribute('aria-label','Annotation evidence');for(const value of ['observed','inferred','approximate']){const option=el('option',value[0].toUpperCase()+value.slice(1));option.value=value;evidence.append(option);}
 const entity=el('select');entity.setAttribute('aria-label','Linked scene entity');const none=el('option','No scene binding');none.value='';entity.append(none);
 const targets=referenceSceneEntities(workshop.model.scene);for(const kind of ['Room','Window','Door','Wall','Object','Staircase','Roof','Floor opening']){const group=el('optgroup');group.label=kind;for(const t of targets.filter(t=>t.kind===kind)){const e=t.entity,option=el('option',`${kind} · ${e.name||e.assetId||e.id} · Floor ${t.z}`);option.value=e.id;group.append(option);}if(group.children.length)entity.append(group);}for(const a of reference.annotations||[])if(a.entityId&&!targets.some(t=>t.id===a.entityId)&&!Array.from(entity.options).some(o=>o.value===a.entityId)){const option=el('option','Missing component · '+a.entityId);option.value=a.entityId;entity.append(option);}
 const notes=el('textarea');notes.setAttribute('aria-label','Annotation notes');notes.placeholder='Visible facts or assumptions';const save=el('button','Save annotation'),cancel=el('button','Cancel annotation'),message=el('p');message.setAttribute('role','status');message.setAttribute('aria-label','Annotation status');
 let rect=null,start=null,editing=null;
 const draw=()=>{frame.classList.toggle('editing',!!editing);selection.hidden=!rect;if(rect)Object.assign(selection.style,{left:rect[0]*100+'%',top:rect[1]*100+'%',width:(rect[2]-rect[0])*100+'%',height:(rect[3]-rect[1])*100+'%'});};
 const reset=()=>{rect=null;start=null;editing=null;save.textContent='Save annotation';message.textContent='';label.value=notes.value=entity.value='';evidence.value='observed';draw();};
 cancel.onclick=reset;
 const point=event=>{const b=frame.getBoundingClientRect();return [Math.max(0,Math.min(1,(event.clientX-b.left)/b.width)),Math.max(0,Math.min(1,(event.clientY-b.top)/b.height))];};
 frame.onpointerdown=event=>{if(isBusy()||event.button!==0)return;event.preventDefault();start=point(event);rect=null;frame.setPointerCapture(event.pointerId);};
 frame.onpointermove=event=>{if(!start)return;const p=point(event);rect=[Math.min(start[0],p[0]),Math.min(start[1],p[1]),Math.max(start[0],p[0]),Math.max(start[1],p[1])];draw();};
 frame.onpointerup=event=>{if(!start)return;start=null;if(frame.hasPointerCapture(event.pointerId))frame.releasePointerCapture(event.pointerId);if(!rect||rect[2]-rect[0]<.005||rect[3]-rect[1]<.005){rect=null;draw();message.textContent='Drag a larger region';return;}message.textContent='Region selected · Add a label and save';};
 frame.onpointercancel=()=>{start=null;rect=null;draw();};
 save.onclick=async()=>{if(!rect){message.textContent='Draw a region on the photo first';return;}const annotation={id:editing||crypto.randomUUID(),rect,label:label.value.trim(),notes:notes.value,evidence:evidence.value,entityId:entity.value||null};if(await run({type:'reference.annotate',id:reference.id,annotation}))render();};
 fields.append(label,evidence,entity,notes,save,cancel,message);
 const saved=el('div');for(const a of reference.annotations||[]){const box=el('div',a.label);box.className='reference-annotation-box';Object.assign(box.style,{left:a.rect[0]*100+'%',top:a.rect[1]*100+'%',width:(a.rect[2]-a.rect[0])*100+'%',height:(a.rect[3]-a.rect[1])*100+'%'});frame.append(box);
  const row=el('div'),edit=el('button',`Edit annotation: ${a.label}`),remove=el('button',`Remove annotation: ${a.label}`);edit.onclick=()=>{
   if(isBusy())return;
   editing=a.id;rect=[...a.rect];label.value=a.label;notes.value=a.notes;evidence.value=a.evidence;entity.value=a.entityId||'';draw();
   save.textContent='Update annotation';message.textContent=`Editing ${a.label}`;
   // Keep the photo and fields together when editing an item far down the list.
   // Focus enables keyboard editing without letting it scroll the photo away.
   label.focus({preventScroll:true});frame.scrollIntoView({block:'start',behavior:'instant'});
  };remove.onclick=async()=>{if(await run({type:'reference.unannotate',id:reference.id,annotationId:a.id}))render();};row.append(edit,remove,el('p',`${a.evidence} · ${a.entityId?(referenceEntity(workshop.model.scene,a.entityId)?'Linked to scene':'Linked entity missing'):'Unbound'} · ${a.notes}`));saved.append(row);
 }
 section.append(frame,caption,fields,saved);return section;
}
