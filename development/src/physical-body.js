import {sweepSolidBox} from './convex-solid.js';
// Kinematic box translation with contact sliding. Gravity/steps are caller policy.
export function movePhysicalBody(solids,position,delta,halfExtents){
 let point=[...position],remaining=[...delta];const contacts=[];
 for(let iteration=0;iteration<6&&Math.hypot(...remaining)>1e-9;iteration++){
  const end=point.map((v,i)=>v+remaining[i]);let first=null;
  for(const solid of (Array.isArray(solids)?solids:solids.query(point,end,halfExtents))){const hit=sweepSolidBox(solid,point,end,halfExtents);if(hit&&(!first||hit.enter<first.enter))first=hit;}
  if(!first){point=end;remaining=[0,0,0];break;}
  contacts.push(first);if(!first.normal)break; // Existing penetration needs explicit recovery.
  const travel=Math.max(0,first.enter-1e-6/Math.hypot(...remaining));point=point.map((v,i)=>v+remaining[i]*travel);
  remaining=remaining.map(v=>v*(1-travel));const into=remaining.reduce((s,v,i)=>s+v*first.normal[i],0);if(into<0)remaining=remaining.map((v,i)=>v-first.normal[i]*into);else break;
 }
 return {position:point,contacts,blocked:contacts.length>0};
}
// Bounded substeps make gravity stable across ordinary browser frame durations.
// State uses body centre; z velocity is metres/second. Stair climbing is separate.
export function stepPhysicalBody(solids,state,velocity,dt,halfExtents,{gravity=9.81,stepHeight=.22}={}){
 if(!Number.isFinite(dt)||dt<=0||dt>1||!Array.isArray(velocity)||velocity.length!==2||!velocity.every(Number.isFinite)||!Number.isFinite(state.verticalVelocity)||!Number.isFinite(gravity)||gravity<0||!Number.isFinite(stepHeight)||stepHeight<0||stepHeight>1)throw Error('Invalid physical body step');
 let position=[...state.position],verticalVelocity=state.verticalVelocity,grounded=!!state.grounded,blocked=false;const steps=Math.ceil(dt*60),h=dt/steps;
 for(let i=0;i<steps;i++){
  let horizontal=movePhysicalBody(solids,position,[velocity[0]*h,velocity[1]*h,0],halfExtents);
  if(grounded&&horizontal.blocked&&stepHeight>0&&Math.hypot(...velocity)>0){
   const raised=movePhysicalBody(solids,position,[0,0,stepHeight],halfExtents);
   if(!raised.blocked){const across=movePhysicalBody(solids,raised.position,[velocity[0]*h,velocity[1]*h,0],halfExtents),land=movePhysicalBody(solids,across.position,[0,0,-stepHeight-.002],halfExtents),progress=p=>Math.hypot(p[0]-position[0],p[1]-position[1]);
    if(land.contacts.some(c=>c.normal?.[2]>.5)&&progress(land.position)>progress(horizontal.position)+1e-7&&land.position[2]>=position[2]-1e-5){horizontal={...across,position:land.position};verticalVelocity=0;}
   }
  }
  position=horizontal.position;blocked ||= horizontal.blocked;
  verticalVelocity-=gravity*h;const vertical=movePhysicalBody(solids,position,[0,0,verticalVelocity*h],halfExtents);position=vertical.position;
  grounded=verticalVelocity<=0&&vertical.contacts.some(c=>c.normal?.[2]>.5);
  const ceiling=verticalVelocity>0&&vertical.contacts.some(c=>c.normal?.[2]<-.5);
  if(grounded||ceiling)verticalVelocity=0;
 }
 return {position,verticalVelocity,grounded,blocked};
}
