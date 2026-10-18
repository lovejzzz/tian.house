// Rigid fixtures share the seated skeleton solver without deforming ceramic.
export function fixtureSeatContact(action){
 const seat=action?.toilet?.kind==='useToilet'&&action.toilet.seat;
 if(!seat)return null;
 const t=Math.max(0,Math.min(1,(action.duration-action.left)/.5));
 return {...seat,amount:t*t*(3-2*t),sleeping:false};
}
