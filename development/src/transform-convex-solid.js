// Reuse a validated local hull under the workshop's axis-aligned facing/scale
// transform. Arbitrary rotations/shears need different SAT axes and are rejected.
export function transformConvexSolid(solid,transform,vector){
 if(solid.kind!=='convex')throw Error('Expected convex collision');
 const basis=[[1,0,0],[0,1,0],[0,0,1]].map(vector),used=new Set();
 for(const column of basis){
  const active=column.map((v,i)=>Math.abs(v)>1e-12?i:-1).filter(i=>i>=0);
  if(!column.every(Number.isFinite)||active.length!==1||used.has(active[0]))throw Error('Collision transform must be an axis permutation with nonzero scale');
  used.add(active[0]);
 }
 const covector=n=>{
  const v=[0,0,0];for(let k=0;k<3;k++){const scale2=basis[k].reduce((s,x)=>s+x*x,0);for(let j=0;j<3;j++)v[j]+=basis[k][j]*n[k]/scale2;}
  const length=Math.hypot(...v);return {axis:v.map(x=>x/length),length};
 };
 const corners=[];for(const x of [solid.bounds.min[0],solid.bounds.max[0]])for(const y of [solid.bounds.min[1],solid.bounds.max[1]])for(const z of [solid.bounds.min[2],solid.bounds.max[2]])corners.push(transform([x,y,z]));
 return {kind:'convex',origin:transform(solid.origin),
  planes:solid.planes.map(p=>{const n=covector(p.normal);return {normal:n.axis,distance:p.distance/n.length};}),
  boxAxes:solid.boxAxes.map(p=>{const n=covector(p.axis);return {axis:n.axis,min:p.min/n.length,max:p.max/n.length};}),
  bounds:{min:[0,1,2].map(i=>Math.min(...corners.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...corners.map(p=>p[i])))}};
}
