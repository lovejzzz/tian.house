import {viewReferencePhoto} from './reference-photo-viewer.js';
import {calibrationChanged} from './scene-calibration.js';
import {annotationEditor} from './workshop-reference-annotations.js';
import {pinReference} from './workshop-reference-dock.js';
import {WorkshopCommands} from './workshop-commands.js';
import {importReferencePhoto} from './reference-photo-import.js';
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function openReferencePanel(workshop){
 if(workshop.referenceDialog)return;
 if(workshop.model.pending){workshop.status('Finish or cancel the current edit first');return;}
 const dialog=el('dialog');dialog.className='workshop-reference-dialog';dialog.setAttribute('aria-label','Reference photos');workshop.referenceDialog=dialog;
 const header=el('header'),title=el('h2','Reference photos'),close=el('button','Close');close.setAttribute('aria-label','Close reference photos');header.append(title,close);
 const info=el('p','Photos stay on this device and travel with your house export. Up to 8 photos · Import up to 20 MiB each; large photos get local working copies · 4 MiB stored total. Automatic building is not connected yet.');
 const upload=el('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp';upload.setAttribute('aria-label','Import reference photo');
 const list=el('div'),detail=el('section'),status=el('p');status.setAttribute('role','status');status.setAttribute('aria-label','Reference status');
 let selected=null,busy=false;const commands=new WorkshopCommands(workshop.model,workshop.byId);
 const run=async operation=>{if(busy)return false;busy=true;for(const e of dialog.querySelectorAll('input,textarea,select,button'))e.disabled=true;status.textContent='Saving reference…';workshop.saveStatus.textContent='Saving…';
  try{const result=await commands.commitAndSave({requestId:crypto.randomUUID(),baseRevision:workshop.model.revision,operations:[operation]},workshop.persistence);if(!result.ok)throw Error(result.error);workshop.updateHistory();workshop.refreshRoomSelection();workshop.saveStatus.textContent='Saved';status.textContent='Saved on this device';return true;}
  catch(error){status.textContent=error.message;workshop.saveStatus.textContent=workshop.persistence.error?'Not saved':'Saved';return false;}
  finally{busy=false;for(const e of dialog.querySelectorAll('input,textarea,select,button'))e.disabled=false;}
 };
 const field=(label,value,tag='input')=>{const wrap=el('label',label),input=el(tag);input.setAttribute('aria-label',label);input.value=value??'';wrap.append(input);detail.append(wrap);return input;};
 const render=()=>{
  list.replaceChildren();detail.replaceChildren();const refs=workshop.model.scene?.references||[];if(!refs.some(r=>r.id===selected))selected=refs[0]?.id;
  list.className='reference-photo-groups';for(const group of new Set(refs.map(r=>r.group||'Ungrouped'))){const section=el('section'),heading=el('h3',group),grid=el('div');grid.className='reference-photo-thumbnails';section.append(heading,grid);for(const r of refs.filter(r=>(r.group||'Ungrouped')===group)){const b=el('button'),thumb=el('img');thumb.src=r.image;thumb.alt='';thumb.loading='lazy';b.append(thumb,el('span',r.name));b.setAttribute('aria-label','Select reference: '+r.name);b.setAttribute('aria-pressed',String(r.id===selected));b.onclick=()=>{selected=r.id;render();};grid.append(b);}list.append(section);}
  const r=refs.find(r=>r.id===selected);if(!r){detail.append(el('p','Import a photo to start collecting building references.'));return;}
  const enlarge=el('button','Enlarge photo');enlarge.onclick=()=>viewReferencePhoto(workshop,r);detail.append(enlarge);const image=el('img');image.src=r.image;image.alt=r.name;detail.append(annotationEditor({workshop,reference:r,image,run,render,isBusy:()=>busy}),el('p',`${r.width} × ${r.height} · ${r.importInfo?.optimized?`Working copy · Original ${r.importInfo.originalWidth} × ${r.importInfo.originalHeight}`:'Original image'}`));
  const name=field('Photo name',r.name),group=field('Room or group',r.group),source=field('Source / credit',r.source),evidence=field('Evidence type',r.evidence,'select');
  for(const [value,label]of [['observed','Observed'],['inferred','Inferred'],['approximate','Approximate']]){const option=el('option',label);option.value=value;evidence.append(option);}evidence.value=r.evidence;
  const notes=field('What this photo shows / assumptions',r.notes,'textarea'),metres=field('Known length (metres)',r.knownLength?.metres),lengthDescription=field('What was measured',r.knownLength?.description);metres.type='number';metres.min='0';metres.step='any';
  detail.append(el('p','Known lengths are evidence only. They do not automatically calibrate the scene grid.'));
  const save=el('button','Save reference details');save.onclick=async()=>{const patch={name:name.value.trim(),group:group.value,source:source.value,evidence:evidence.value,notes:notes.value,knownLength:metres.value?{metres:Number(metres.value),description:lengthDescription.value}:null};if(await run({type:'reference.update',id:r.id,patch}))render();};
  const remove=el('button','Remove reference');remove.onclick=async()=>{if(await run({type:'reference.remove',id:r.id}))render();};const pin=el('button','Pin beside scene');pin.onclick=()=>{dialog.close();pinReference(workshop,r.id);};detail.append(pin,save,remove);
  const calibration=el('fieldset'),legend=el('legend','Scene scale'),scale=workshop.model.scene.units.metresPerCell,summary=el('p',scale===null?'Scene grid is not calibrated.':`1 cell ≈ ${scale.toFixed(3)} m${calibrationChanged(workshop.model.scene)?' · Evidence changed; check calibration.':''}`);calibration.append(legend,summary,el('p','Explicitly match the saved known length to an entire bound room span. This changes measurement labels, not geometry or sprite sizes.'));
  const span=el('select');span.setAttribute('aria-label','Calibration room span');
  for(const a of r.annotations||[]){const room=workshop.model.scene.rooms.find(v=>v.id===a.entityId);if(!room)continue;for(const axis of ['x','y']){const i=axis==='x'?0:1,option=el('option',`${a.label} · ${axis.toUpperCase()} span · ${room.rect[i+2]-room.rect[i]} cells`);option.value=JSON.stringify({annotationId:a.id,axis});span.append(option);}}
  const apply=el('button','Apply scene scale'),clear=el('button','Clear scene scale');apply.disabled=!r.knownLength||!span.options.length;clear.disabled=scale===null;
  apply.onclick=async()=>{if(!span.value)return;if(await run({type:'scene.calibrate',referenceId:r.id,...JSON.parse(span.value)}))render();};clear.onclick=async()=>{if(await run({type:'scene.clearCalibration'}))render();};calibration.append(span,apply,clear);detail.append(calibration);

 };
 upload.onchange=async()=>{const file=upload.files?.[0];if(!file||busy)return;busy=true;for(const e of dialog.querySelectorAll('input,textarea,select,button'))e.disabled=true;status.textContent='Reading photo…';try{
  const photo=await importReferencePhoto(file);const reference={id:crypto.randomUUID(),name:file.name.slice(0,100),group:'',source:'',evidence:'observed',notes:'',knownLength:null,...photo};
  busy=false;if(await run({type:'reference.add',reference})){selected=reference.id;render();}
 }catch(error){status.textContent=error.message;}finally{busy=false;upload.value='';for(const e of dialog.querySelectorAll('input,textarea,select,button'))e.disabled=false;}};
 close.onclick=()=>{if(!busy)dialog.close();};dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.addEventListener('keydown',e=>e.stopPropagation());dialog.onclose=()=>{dialog.remove();workshop.referenceDialog=null;workshop.canvas.focus();};
 dialog.append(header,info,upload,list,detail,status);workshop.element.append(dialog);render();dialog.showModal();
}
