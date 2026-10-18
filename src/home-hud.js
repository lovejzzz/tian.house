// Living-mode HUD for the 3D home. The house is the page: while a visitor lives in
// it the screen shows the scene, the contextual "E · …" prompt and one Workshop
// entry. Everything else (time, wait, inventory, saving, house view switches) sits
// in a menu opened with Esc. The panel's own controls are moved here, never
// rebuilt, so their handlers and state stay where they are.
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
export const WELCOME_KEY='tian-home-welcomed-v1';
function storage(){try{return window.localStorage;}catch{return null;}}
export function mountHomeHud({dialog,canvas,name,resume,pause,menuItems=[],houseView=null,status=[],help=null,onWorkshop,workshopLabel='Workshop',markers=[],now=()=>performance.now()}){
 dialog.classList.add('home-hud');
 // One entry to edit this house.
 const workshop=el('button',workshopLabel,'home-hud-workshop');workshop.type='button';workshop.setAttribute('aria-label','Workshop · edit this house');workshop.onclick=()=>onWorkshop();
 // Shown while the resident is paused (canvas lost focus) and the menu is shut.
 const hint=el('button','Click to continue','home-hud-hint');hint.type='button';hint.hidden=true;hint.onclick=()=>resume();
 // Menu (Esc).
 const sheet=el('section',undefined,'home-hud-menu');sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','Menu');sheet.hidden=true;
 const head=el('header');head.append(el('small','TIAN’S HOUSE'),el('h2',name));const statusBox=el('div',undefined,'home-hud-status');statusBox.append(...status);
 const cont=el('button','Continue','home-hud-continue');cont.type='button';cont.onclick=()=>closeMenu();
 const items=el('div',undefined,'home-hud-items');items.append(...menuItems);
 sheet.append(head,statusBox,cont,items);
 if(houseView){const more=el('details',undefined,'home-hud-house');more.append(el('summary','House view'),houseView);sheet.append(more);}
 sheet.append(el('p','Walk up to the computer on the desk and press E to see my work. Esc opens this menu.','home-hud-about'));
 // World markers (the desk computer): a small label over the object, shown in a
 // middle distance band, where the visitor can see it but the E prompt is not up yet.
 const pins=markers.map(m=>{const b=el('button',m.label,'home-hud-marker');b.type='button';b.hidden=true;b.setAttribute('aria-label',m.ariaLabel||m.label);b.onclick=()=>m.onClick?.();return {m,b};});
 dialog.append(workshop,hint,sheet,...pins.map(p=>p.b));
 // First visit: the movement help fades after a few seconds; later visits never show it.
 let helpUntil=0;if(help){const seen=storage()?.getItem(WELCOME_KEY);if(seen)help.hidden=true;else{helpUntil=now()+9000;help.classList.add('home-hud-help');try{storage()?.setItem(WELCOME_KEY,'1');}catch{}}}
 let open=false;
 // Another window over the house (inventory, the computer) owns Esc and the screen.
 const nestedOpen=()=>!!dialog.querySelector('dialog[open],[role=dialog][aria-modal=true]');
 function openMenu(){if(open)return;open=true;pause();sheet.hidden=false;hint.hidden=true;workshop.hidden=true;cont.focus();}
 function closeMenu(){if(!open)return;open=false;sheet.hidden=true;workshop.hidden=false;resume();}
 function update(){
  if(help&&helpUntil&&now()>helpUntil){help.classList.add('home-hud-faded');helpUntil=0;}
  hint.hidden=open||document.activeElement===canvas||nestedOpen()||document.hidden;
 }
 // Esc is handled on keydown: the site opens without a click, and before any user
 // activation Chrome will not let a dialog's cancel event be prevented, so the first
 // Esc would close the house instead of opening this menu. A nested window (the
 // inventory, the computer) closes itself first.
 const onKey=e=>{if(e.key!=='Escape'||e.defaultPrevented||!dialog.open||nestedOpen())return;e.preventDefault();e.stopPropagation();open?closeMenu():openMenu();};
 window.addEventListener('keydown',onKey,true);
 const timer=setInterval(update,400);update();
 // project(position) -> {x,y,onScreen} in dialog pixels; distance(position) -> metres from the resident.
 // bottomInset keeps edge-held labels clear of on-screen controls (the touch stick).
 function place(project,distance,bottomInset=0){for(const {m,b} of pins){const d=distance(m.position),near=m.near??1.8,far=m.far??10;
  const s=open||d===null||d<near||d>far?null:project(m.position);b.hidden=!s;b.dataset.distance=d===null?'':d.toFixed(1);if(!s)continue;
  // Out of frame: hold the label at the nearest edge with an arrow toward the object.
  const W=dialog.clientWidth,H=dialog.clientHeight,pad=70,x=Math.max(pad,Math.min(W-pad,s.x)),y=Math.max(pad+30,Math.min(H-pad-60-bottomInset,s.y)),edge=!s.onScreen;
  b.classList.toggle('home-hud-marker-edge',edge);b.dataset.side=!edge?'':s.x<pad?'left':s.x>W-pad?'right':s.y<pad+30?'up':'down';
  b.style.left=x+'px';b.style.top=y+'px';b.style.opacity=String(Math.min(1,(far-d)/2.5));}}
 return {get open(){return open;},openMenu,closeMenu,toggleMenu(){open?closeMenu():openMenu();},update,place,elements:{workshop,hint,sheet,markers:pins.map(p=>p.b)},markers:pins.map(p=>p.m),dispose(){clearInterval(timer);window.removeEventListener('keydown',onKey,true);workshop.remove();hint.remove();sheet.remove();for(const p of pins)p.b.remove();dialog.classList.remove('home-hud');}};
}
