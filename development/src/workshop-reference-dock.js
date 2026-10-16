import {viewReferencePhoto} from './reference-photo-viewer.js';
import {calibrationChanged} from './scene-calibration.js';
import {referenceEntity,focusReferenceEntity} from './workshop-reference-annotations.js';
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function pinReference(workshop,id){
 if(!workshop.referenceDock){
  const panel=el('aside');panel.className='workshop-reference-dock';panel.setAttribute('aria-label','Pinned reference');
  const header=el('header'),title=el('h3','Reference'),close=el('button','×');close.setAttribute('aria-label','Hide reference / show catalog');header.append(title,close);
  const select=el('select');select.setAttribute('aria-label','Pinned photo');const image=el('img');image.alt='';const linkedImage=el('div'),overlay=el('div');linkedImage.className='reference-linked-image';overlay.className='reference-linked-overlay';linkedImage.append(image,overlay);
  const description=el('p'),notes=el('p'),source=el('p'),dimensions=el('p'),empty=el('p','No reference photos in this house. Import one from Reference photos.'),manage=el('button','Edit reference details');
  const enlarge=el('button','Enlarge photo');enlarge.onclick=()=>{const r=workshop.model.scene.references.find(r=>r.id===workshop.referenceDock.selected);if(r)viewReferencePhoto(workshop,r);};const annotations=el('div');panel.append(header,select,linkedImage,enlarge,description,notes,source,dimensions,annotations,empty,manage);
  close.onclick=()=>{panel.remove();workshop.element.classList.remove('with-reference');workshop.referenceDock=null;workshop.refreshReferenceDock=null;workshop.canvas.focus();};
  select.onchange=()=>{workshop.referenceDock.selected=select.value;workshop.refreshReferenceDock();workshop.canvas.focus();};
  manage.onclick=()=>workshop.openReferenceManager();
  // Keep native select/button keys from rotating or erasing scene objects.
  panel.addEventListener('keydown',event=>event.stopPropagation());
  workshop.referenceDock={panel,selected:id};
  workshop.refreshReferenceDock=()=>{
   const refs=workshop.model.scene?.references||[],state=workshop.referenceDock;if(!state)return;
   if(!refs.some(r=>r.id===state.selected))state.selected=refs[0]?.id;
   select.replaceChildren();for(const group of new Set(refs.map(r=>r.group||'Ungrouped'))){const options=el('optgroup');options.label=group;for(const r of refs.filter(r=>(r.group||'Ungrouped')===group)){const option=el('option',r.name);option.value=r.id;options.append(option);}select.append(options);}select.value=state.selected||'';
   const r=refs.find(r=>r.id===state.selected);empty.hidden=!!r;for(const e of [select,linkedImage,enlarge,description,notes,source,dimensions,manage])e.hidden=!r;
   annotations.replaceChildren();overlay.replaceChildren();if(!r){image.removeAttribute('src');return;}
   for(const a of r.annotations||[]){const b=el('button',`${a.label} · ${a.evidence}`);b.setAttribute('aria-label',`Show linked entity: ${a.label}`);b.disabled=!a.entityId||!referenceEntity(workshop.model.scene,a.entityId);b.setAttribute('aria-pressed',String(workshop.referenceFocusId===a.entityId||(workshop.tool==='reshape'?workshop.selectedRoomId===a.entityId:workshop.tool==='multiselect'&&workshop.objectSelection?.includes(a.entityId)||false)));b.title=a.notes;b.onclick=()=>focusReferenceEntity(workshop,a.entityId);annotations.append(b);const region=el('button',a.label);region.setAttribute('aria-label',`Locate photo region: ${a.label}`);region.disabled=b.disabled;region.setAttribute('aria-pressed',b.getAttribute('aria-pressed'));region.title=a.notes;region.onclick=b.onclick;Object.assign(region.style,{left:a.rect[0]*100+'%',top:a.rect[1]*100+'%',width:(a.rect[2]-a.rect[0])*100+'%',height:(a.rect[3]-a.rect[1])*100+'%'});overlay.append(region);}
   if(image.getAttribute('src')!==r.image)image.src=r.image;image.alt=r.name;
   description.textContent=`${r.group||'Ungrouped'} · ${r.evidence[0].toUpperCase()+r.evidence.slice(1)}`;
   notes.textContent=r.notes||'No observation notes yet.';source.textContent=r.source?'Source: '+r.source:'Source not recorded';
   const units=workshop.model.scene.units;dimensions.textContent=units.metresPerCell===null?'Scene scale not calibrated':`1 cell ≈ ${units.metresPerCell.toFixed(3)} m${calibrationChanged(workshop.model.scene)?' · Evidence changed; check calibration':''}`;
  };
  workshop.element.append(panel);workshop.element.classList.add('with-reference');
 }
 workshop.pinnedReferenceId=id;workshop.referenceDock.selected=id;workshop.refreshReferenceDock();workshop.canvas.focus();
}
