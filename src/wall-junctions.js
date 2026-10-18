// Partition each endpoint by angular bisectors of incident wall centre lines.
// Separate positive/negative thickness halves preserve T and cross junctions.
export function wallJunctions(walls){
 const nodes=new Map(),result=new Map();
 for(const wall of walls){const dx=wall.b[0]-wall.a[0],dy=wall.b[1]-wall.a[1],length=Math.hypot(dx,dy);if(length<1e-8)throw Error('Zero-length junction wall');const t=[dx/length,dy/length],n=[-t[1],t[0]];result.set(wall.id,{start:[0,0],end:[0,0]});for(const [end,p,sign]of [['start',wall.a,1],['end',wall.b,-1]]){const key=[wall.levelId,...p].join(':');if(!nodes.has(key))nodes.set(key,[]);nodes.get(key).push({id:wall.id,end,t,n,r:t.map(v=>v*sign),sign});}}
 for(const rays of nodes.values())for(const ray of rays){
  if(rays.length===1)continue;
  const others=rays.filter(v=>v!==ray).map(q=>{const cross=ray.r[0]*q.r[1]-ray.r[1]*q.r[0],dot=ray.r[0]*q.r[0]+ray.r[1]*q.r[1];if(dot>1-1e-8)throw Error('Overlapping wall rays at junction');return {q,angle:(Math.atan2(cross,dot)+Math.PI*2)%(Math.PI*2)};}).sort((a,b)=>a.angle-b.angle);
  result.get(ray.id)[ray.end]=[-1,1].map(side=>{const q=(side*ray.sign>0?others[0]:others.at(-1)).q,normal=ray.r.map((v,i)=>v-q.r[i]),den=normal[0]*ray.t[0]+normal[1]*ray.t[1];return -(normal[0]*ray.n[0]+normal[1]*ray.n[1])/den;});
 }
 return result;
}
