import {normalizeFootprintPolygon,triangulateFootprint,polygonSignedArea} from './polygon-footprint.js';
const EPS=1e-9;
// World XY use current grid units; profile/base elevations share one explicit
// caller-selected unit. No implicit storey/pixel conversion belongs in geometry.
export function validateRoofProfile(profile){
 if(!profile||!['X','Y'].includes(profile.axis)||!Array.isArray(profile.knots)||profile.knots.length<2||profile.knots.length>16||profile.knots.some((p,i,a)=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||i&&p[0]<=a[i-1][0]))throw Error('Use an ordered roof profile with 2–16 finite height points');
 return profile;
}
export function roofProfileHeight(profile,crossCoordinate){
 validateRoofProfile(profile);const knots=profile.knots;
 if(!Number.isFinite(crossCoordinate)||crossCoordinate<knots[0][0]-EPS||crossCoordinate>knots.at(-1)[0]+EPS)throw Error('Roof profile does not cover this point');
 const i=knots.findIndex((p,i)=>i&&crossCoordinate<=p[0]+EPS),a=knots[i-1],b=knots[i];
 return a[1]+(b[1]-a[1])*(crossCoordinate-a[0])/(b[0]-a[0]);
}
function clip(points,dim,bound,greater){
 const out=[],inside=p=>greater?p[dim]>=bound:p[dim]<=bound;
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],aa=inside(a),bb=inside(b);if(aa)out.push(a);if(aa!==bb){const t=(bound-a[dim])/(b[dim]-a[dim]),p=a.map((v,j)=>v+(b[j]-v)*t);p[dim]=bound;out.push(p);}}
 return out.filter((p,i)=>!out.slice(0,i).some(q=>Math.abs(p[0]-q[0])<EPS&&Math.abs(p[1]-q[1])<EPS));
}
export function profiledRoofGeometry({vertices,profile,baseElevation}){
 validateRoofProfile(profile);const boundary=normalizeFootprintPolygon(vertices),dim=profile.axis==='X'?1:0,knots=profile.knots;
 if(!Number.isFinite(baseElevation)||knots.some(p=>p[1]<baseElevation))throw Error('Roof profile must stay above its closure base');
 for(const p of boundary)roofProfileHeight(profile,p[dim]);
 const lift=p=>[p[0],p[1],roofProfileHeight(profile,p[dim])],slopes=[],closures=[];
 // Clip triangles separately: cutting a concave polygon directly can bridge
 // disconnected lobes, inventing a roof across a courtyard.
 for(const triangle of triangulateFootprint(boundary))for(let i=1;i<knots.length;i++){
  const polygon=clip(clip(triangle,dim,knots[i-1][0],true),dim,knots[i][0],false);
  if(polygon.length>=3&&Math.abs(polygonSignedArea(polygon))>EPS)slopes.push({segment:i-1,vertices:polygon.map(lift)});
 }
 // Every exposed outline edge receives infill, including raised concave eaves,
 // not just the two ends perpendicular to a ridge. Split at each profile kink.
 for(let i=0;i<boundary.length;i++){
  const a=boundary[i],b=boundary[(i+1)%boundary.length],delta=b[dim]-a[dim],cuts=[0,1];
  if(Math.abs(delta)>EPS)for(const [coordinate]of knots){const t=(coordinate-a[dim])/delta;if(t>EPS&&t<1-EPS)cuts.push(t);}
  cuts.sort((a,b)=>a-b);
  for(let j=1;j<cuts.length;j++){
   const at=t=>a.map((v,k)=>v+(b[k]-v)*t),u=at(cuts[j-1]),v=at(cuts[j]),topU=lift(u),topV=lift(v);
   if(topU[2]<=baseElevation+EPS&&topV[2]<=baseElevation+EPS)continue;
   closures.push({edge:i,vertices:[[...u,baseElevation],[...v,baseElevation],topV,topU]});
  }
 }
 return {slopes,closures,footprintArea:Math.abs(polygonSignedArea(boundary))};
}
