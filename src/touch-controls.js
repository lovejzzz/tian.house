// Touch input for the living home: a thumb stick that drives the resident like WASD,
// and the two-finger view gesture (pinch to zoom, drag to orbit). Shown by CSS only
// on touch screens at phone widths; on a desktop the stick stays in the DOM, hidden.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
// Stick offset in pixels -> screen-axis vector (y positive down, like S), magnitude 0..1.
export function stickVector(dx,dy,radius,dead=.18){
 const d=Math.hypot(dx,dy),n=Math.min(1,d/radius);if(!d||n<dead)return null;
 const m=(n-dead)/(1-dead);return [dx/d*m,dy/d*m];
}
// Two fingers: spread/pinch scales the camera distance, the midpoint drags the orbit
// with the same rates as a one-finger or mouse drag.
export function twoFingerView(start,a,b,{minRadius=2,maxRadius=200,minPitch=.1,maxPitch=1.45}={}){
 const d0=Math.hypot(start.a.x-start.b.x,start.a.y-start.b.y)||1,d1=Math.hypot(a.x-b.x,a.y-b.y)||1;
 const mx=(a.x+b.x-start.a.x-start.b.x)/2,my=(a.y+b.y-start.a.y-start.b.y)/2;
 return {radius:clamp(start.radius*d0/d1,minRadius,maxRadius),yaw:start.yaw-mx*.007,pitch:clamp(start.pitch+my*.005,minPitch,maxPitch)};
}
// A short press: pointer down/up under the slop (4 px for a mouse, a little more for a finger).
export function isTap(down,up,pointerType='mouse'){return Math.hypot(up.x-down.x,up.y-down.y)<(pointerType==='touch'?10:4);}
export function mountTouchStick({parent,canvas,onMove,radius=44}){
 const base=document.createElement('div');base.className='touch-stick';base.setAttribute('aria-hidden','true');
 const knob=document.createElement('div');knob.className='touch-stick-knob';base.append(knob);parent.append(base);
 let id=null,origin=null;
 const move=e=>{let dx=e.clientX-origin.x,dy=e.clientY-origin.y;const d=Math.hypot(dx,dy);if(d>radius){dx*=radius/d;dy*=radius/d;}
  knob.style.transform=`translate(${dx}px,${dy}px)`;onMove(stickVector(dx,dy,radius));};
 const release=e=>{if(e&&e.pointerId!==id)return;id=null;origin=null;knob.style.transform='';base.classList.remove('touch-stick-active');onMove(null);};
 // preventDefault keeps focus on the scene (no compatibility mousedown), so the resident keeps walking.
 const down=e=>{e.preventDefault();if(id!==null)return;id=e.pointerId;try{base.setPointerCapture?.(id);}catch{}const r=base.getBoundingClientRect();origin={x:r.left+r.width/2,y:r.top+r.height/2};base.classList.add('touch-stick-active');canvas.focus?.();move(e);};
 const drag=e=>{if(e.pointerId===id){e.preventDefault();move(e);}};
 base.addEventListener('pointerdown',down);base.addEventListener('pointermove',drag);base.addEventListener('pointerup',release);base.addEventListener('pointercancel',release);base.addEventListener('lostpointercapture',release);
 return {element:base,release:()=>{if(id!==null)release({pointerId:id});},dispose(){base.remove();}};
}
