// One immutable snapshot drives both download and copy. Keep the download URL
// alive while its dialog is open: embedded browsers may defer starting a save.
export function openResidentExport(parent,serialize){
 const snapshot=serialize();JSON.parse(snapshot);
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const dialog=el('dialog');dialog.className='house-library-dialog';dialog.setAttribute('aria-label','Export resident save');
 const title=el('h2','Export save'),note=el('p','Includes your resident, house and inventory. Keep this file as a backup.'),download=el('a','Download JSON'),copy=el('button','Copy save'),close=el('button','Done'),status=el('p'),details=el('details'),summary=el('summary','View save data'),data=el('textarea');
 data.readOnly=true;data.value=snapshot;data.setAttribute('aria-label','Resident save JSON');data.spellcheck=false;data.style.cssText='box-sizing:border-box;width:100%;min-height:180px;font:12px monospace';
 const url=URL.createObjectURL(new Blob([snapshot],{type:'application/json'}));download.href=url;download.download='tian-house-save.json';download.className='workshop-primary';
 status.setAttribute('role','status');status.textContent=(new TextEncoder().encode(snapshot).length/1024).toFixed(1)+' KB · Snapshot ready';
 download.onclick=()=>{status.textContent='Download requested. If no file appears, use Copy save or View save data.';};
 copy.onclick=async()=>{copy.disabled=true;try{await navigator.clipboard.writeText(snapshot);status.textContent='Save copied to clipboard';}catch{details.open=true;data.focus();data.select();status.textContent='Copy is unavailable here. The save is selected; press Command/Ctrl+C.';}finally{copy.disabled=false;}};
 details.append(summary,data);const actions=el('div');actions.style.cssText='display:flex;gap:16px;align-items:center;flex-wrap:wrap';actions.append(download,copy,close);dialog.append(title,note,actions,status,details);parent.append(dialog);
 close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{URL.revokeObjectURL(url);dialog.remove();});dialog.showModal();return dialog;
}
