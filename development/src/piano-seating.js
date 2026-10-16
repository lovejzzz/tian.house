// All anchors come from the compiled furniture transform, including rotation,
// fine placement and floor elevation. No house-specific IDs or coordinates.
export function pianoSeatCandidate(keyboard,seats,position){
 if(!keyboard)return null;
 const n=Math.hypot(...keyboard.forward.slice(0,2));if(n<1e-8)return null;
 const forward=keyboard.forward.map(v=>v/n);
 return seats.map(seat=>{
  const delta=seat.point.map((v,i)=>v-keyboard.point[i]);
  const front=delta[0]*forward[0]+delta[1]*forward[1];
  const side=Math.abs(delta[0]*forward[1]-delta[1]*forward[0]);
  const reach=Math.hypot(position[0]-seat.point[0],position[1]-seat.point[1]);
  return {...seat,forward:forward.map(v=>-v),front,side,reach};
 }).filter(s=>s.levelId===keyboard.levelId&&s.front>=.18&&s.front<=1.05&&s.side<=.5&&s.reach<=1.0&&Math.abs(s.point[2]-keyboard.point[2])<=.5)
 .sort((a,b)=>a.side-b.side||a.front-b.front||a.objectId.localeCompare(b.objectId))[0]||null;
}
