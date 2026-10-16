import {chamferRectangle} from './polygon-footprint.js';
export function openCornerCut(workshop){
 const room=workshop.model.scene?.rooms.find(r=>r.id===workshop.selectedRoomId);if(!room){workshop.status('Click a room first');return;}
 const dialog=document.createElement('dialog');dialog.className='house-library-dialog';dialog.setAttribute('aria-label','Corner cut');
 const title=document.createElement('h2');title.textContent='Corner cut';
 const corner=document.createElement('select');corner.setAttribute('aria-label','Room corner');for(const name of ['NW','NE','SE','SW']){const o=document.createElement('option');o.value=name;o.textContent=name;corner.append(o);}
 const distance=document.createElement('input');distance.type='number';distance.min='1';distance.max=String(Math.min(room.rect[2]-room.rect[0],room.rect[3]-room.rect[1])-1);distance.value='1';distance.setAttribute('aria-label','Cut distance in cells');
 const status=document.createElement('p'),note=document.createElement('p');note.textContent=room.polygon?'Replaces the outline with one corner cut.':'Choose a corner and distance in grid cells.';
 const apply=document.createElement('button');apply.textContent='Apply corner cut';const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.onclick=()=>dialog.close();
 let operation;const preview=()=>{try{operation={type:'room.outline',roomId:room.id,vertices:chamferRectangle(room.rect,corner.value,Number(distance.value))};const result=workshop.model.previewStructure(operation);apply.disabled=!result.ok;status.textContent=result.ok?'Ready · Doors and furnishings are protected':result.reason;}catch(e){apply.disabled=true;status.textContent=e.message;}};
 corner.onchange=distance.oninput=preview;apply.onclick=()=>{workshop.model.begin('Corner cut');const result=workshop.model.structure(operation);if(!result.ok){workshop.model.cancel();status.textContent=result.reason;return;}if(!workshop.model.commit()){status.textContent=workshop.model.lastError||'No change';return;}workshop.refreshRoomSelection();workshop.save();workshop.status('Corner cut applied · Undo restores the previous outline');dialog.close();};
 dialog.append(title,note,corner,distance,status,apply,cancel);dialog.addEventListener('close',()=>dialog.remove());workshop.element.append(dialog);preview();dialog.showModal();
}
