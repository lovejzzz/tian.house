import {fixedGlazing} from './fixed-glazing.js';
import {doorOpening,windowOpening} from './wall-joins.js';
import {windowProfile,doorProfile,windowAperture} from './window-profile.js';

export function diagonalOpening(wall,opening,properties){
 if(!opening)return null;
 if(!['door','window'].includes(opening.kind))throw Error('Choose a door or window');
 const props=properties[opening.tile]||{},axis=wall.materialAxis;
 if(opening.kind==='window'&&fixedGlazing(props,axis))return {id:opening.id,kind:'window',fixed:true,tile:opening.tile,frame:null,width:Math.SQRT2,stateTile:'scene-opening:'+opening.id,translucent:true};
 if(!(opening.kind+axis in props)||'GarageDoor'in props||props.CustomName==='Toilet')throw Error('Choose a single opening matching the wall material direction');
 const profile=opening.kind==='window'?windowProfile(props):doorProfile(props);
 const frame=profile?null:(opening.kind==='door'?doorOpening:windowOpening)(wall.tile,axis,properties);if(!profile&&!frame)throw Error('Wall material has no matching '+opening.kind+' opening');
 return {id:opening.id,kind:opening.kind,tile:opening.tile,frame,...(opening.threshold?{threshold:structuredClone(opening.threshold)}:{}),width:profile?profile[2]-profile[0]:1,...(profile?{profile}:{}),stateTile:'scene-opening:'+opening.id,...(props.TianDoorHinge==='end'?{hinge:'end'}:{}),properties:Object.fromEntries(['OpenTileOffset','SmashedTileOffset','GlassRemovedOffset'].filter(k=>k in props).map(k=>[k,props[k]])),translucent:opening.kind==='window'||'doorTrans'in props};
}

// Keep a source-cell-wide leaf centred on the physically longer diagonal wall.
// The remaining wall sections are real jambs, shared by collision and drawing.
export function openingSpan(wall){
 const dx=wall.b[0]-wall.a[0],dy=wall.b[1]-wall.a[1],length=Math.hypot(dx,dy),width=wall.opening?.width??1,profile=wall.opening?.profile&&windowAperture(wall.opening.profile,length),t0=profile?profile.t0:(1-width/length)/2,t1=profile?profile.t1:1-t0;
 const at=t=>[wall.a[0]+dx*t,wall.a[1]+dy*t];
 return {a:at(t0),b:at(t1),t0,t1,length,width,normal:[-dy/length,dx/length]};
}
export function openingJambs(wall){const s=openingSpan(wall);return [{...wall,b:s.a},{...wall,a:s.b}].filter(w=>Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])>1e-9);}

// Two continuous standing positions, on the normal through the opening centre.
// .45 clears the .18 square actor footprint even at a 45-degree wall.
export function diagonalWindowSides(wall,actor){
 if(actor.z!==undefined&&actor.z!==wall.z)return null;
 const span=openingSpan(wall),middle=span.a.map((v,i)=>(v+span.b[i])/2),dx=actor.x-middle[0],dy=actor.y-middle[1],distance=dx*span.normal[0]+dy*span.normal[1];
 if(Math.hypot(dx,dy)>1.7||Math.abs(distance)<1e-8)return null;
 const side=Math.sign(distance),point=s=>({x:middle[0]+span.normal[0]*.45*s,y:middle[1]+span.normal[1]*.45*s,z:wall.z});
 return {side,from:point(side),to:point(-side)};
}
