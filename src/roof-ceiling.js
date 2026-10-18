// A profiled roof over a storey also forms that storey's ceiling (its interior
// closures render as ceiling surfaces), so ceiling fixtures may hang from it.
// A cell is supported when its centre lies under a roof slope whose lowest
// elevation is at the next storey (z+1, in storeys), not a roof far above.
const inside=([px,py],[a,b,c])=>{const s=(p,q,r)=>(p[0]-r[0])*(q[1]-r[1])-(q[0]-r[0])*(p[1]-r[1]);const d1=s([px,py],a,b),d2=s([px,py],b,c),d3=s([px,py],c,a);return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0));};
export function roofCeilingCovers(roofGeometry,x,y,z){
 for(const roof of roofGeometry||[]){
  const slopes=roof.slopes||[];if(!slopes.length)continue;
  const low=Math.min(...slopes.flatMap(s=>s.vertices.map(v=>v[2])));
  if(low<z+1-.05||low>z+1.5)continue;
  if(slopes.some(s=>s.vertices.length===3&&inside([x+.5,y+.5],s.vertices)))return true;
 }
 return false;
}
