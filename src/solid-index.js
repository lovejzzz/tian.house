// Static broad phase. Rebuild when geometry changes; narrow-phase SAT stays authoritative.
// Oversized solids and queries fall back without allocating an unbounded cell grid.
export function createSolidIndex(solids,{cellSize=2,maxCells=512}={}){
 if(!Number.isFinite(cellSize)||cellSize<=0||!Number.isSafeInteger(maxCells)||maxCells<1)throw Error('Invalid collision index settings');
 const entries=[...solids],cells=new Map(),global=[];
 const range=b=>({lo:b.min.map(v=>Math.floor(v/cellSize)),hi:b.max.map(v=>Math.floor(v/cellSize))});
 const count=r=>[...r.lo,...r.hi].every(Number.isSafeInteger)?r.lo.reduce((n,v,i)=>n*(r.hi[i]-v+1),1):Infinity;
 const visit=(r,fn)=>{for(let x=r.lo[0];x<=r.hi[0];x++)for(let y=r.lo[1];y<=r.hi[1];y++)for(let z=r.lo[2];z<=r.hi[2];z++)fn(`${x},${y},${z}`);};
 entries.forEach((s,i)=>{if(!s.bounds){global.push(i);return;}const r=range(s.bounds);if(count(r)>maxCells){global.push(i);return;}visit(r,key=>{if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);});});
 return {query(start,end,half){
  if(![start,end,half].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))||half.some(v=>v<=0))throw Error('Invalid collision query');
  const bounds={min:start.map((v,i)=>Math.min(v,end[i])-half[i]-1e-8),max:start.map((v,i)=>Math.max(v,end[i])+half[i]+1e-8)},r=range(bounds);
  let ids;if(count(r)>maxCells)ids=entries.map((_,i)=>i);else{const found=new Set(global);visit(r,key=>{for(const id of cells.get(key)||[])found.add(id);});ids=[...found].sort((a,b)=>a-b);}
  // Preserve source order for simultaneous contacts, including the fallback path.
  return ids.filter(i=>!entries[i].bounds||entries[i].bounds.min.every((v,j)=>v<=bounds.max[j]&&entries[i].bounds.max[j]>=bounds.min[j])).map(i=>entries[i]);
 }};
}
