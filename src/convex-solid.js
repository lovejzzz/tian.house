const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
// Local plane equations retain precision for houses far from world origin.
export function convexSolid({vertices,indices}){
 if(!Array.isArray(vertices)||vertices.length<4||!vertices.every(point)||!Array.isArray(indices)||indices.length%3)throw Error('Invalid convex mesh');
 const origin=[...vertices[0]],local=vertices.map(v=>sub(v,origin)),planes=[];
 for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map(j=>local[j]);if(!a||!b||!c)throw Error('Invalid convex mesh indices');const u=sub(b,a),v=sub(c,a),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);if(length<1e-12)continue;const normal=n.map(v=>v/length),distance=dot(normal,a);
  if(local.some(p=>dot(normal,p)>distance+1e-7))throw Error('Mesh must be convex with outward faces');
  if(!planes.some(p=>Math.abs(p.distance-distance)<1e-8&&p.normal.every((v,i)=>Math.abs(v-normal[i])<1e-8)))planes.push({normal,distance});
 }
 if(planes.length<4)throw Error('Solid needs enclosing planes');const axes=[];const addAxis=n=>{const length=Math.hypot(...n);if(length<1e-10)return;const axis=n.map(v=>v/length);if(axes.some(a=>Math.abs(dot(a.axis,axis))>1-1e-10))return;const values=local.map(v=>dot(axis,v));axes.push({axis,min:Math.min(...values),max:Math.max(...values)});};
 for(const p of planes)addAxis(p.normal);for(const n of [[1,0,0],[0,1,0],[0,0,1]])addAxis(n);
 for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){const edge=sub(local[indices[i+(j+1)%3]],local[indices[i+j]]);addAxis([0,edge[2],-edge[1]]);addAxis([-edge[2],0,edge[0]]);addAxis([edge[1],-edge[0],0]);}
 const bounds={min:[0,1,2].map(i=>Math.min(...vertices.map(v=>v[i]))),max:[0,1,2].map(i=>Math.max(...vertices.map(v=>v[i])))};
 return {kind:'convex',origin,planes,boxAxes:axes,bounds};
}
// Exact point/segment clipping, not a character-radius or swept-capsule substitute.
export function segmentSolidInterval(solid,start,end){
 if(!point(start)||!point(end))throw Error('Use finite segment endpoints');
 const a=sub(start,solid.origin),delta=sub(end,start);let enter=0,exit=1,normal=null;
 for(const plane of solid.planes){const distance=dot(plane.normal,a)-plane.distance,speed=dot(plane.normal,delta);
  if(Math.abs(speed)<1e-12){if(distance>1e-8)return null;continue;}
  const t=-distance/speed;if(speed<0){if(t>enter){enter=t;normal=plane.normal;}}else exit=Math.min(exit,t);if(enter>exit+1e-10)return null;
 }
 if(exit<0||enter>1)return null;return {enter:Math.max(0,enter),exit:Math.min(1,exit),normal};
}

// Continuous SAT for a translating axis-aligned box. Includes edge cross axes,
// so a slanted corner is not inflated into an enclosing rectangular obstacle.
export function sweepSolidBox(solid,start,end,halfExtents){
 if(!point(start)||!point(end)||!point(halfExtents)||halfExtents.some(v=>v<=0))throw Error('Use finite box dimensions and endpoints');
 const a=sub(start,solid.origin),delta=sub(end,start);let enter=0,exit=1,normal=null;
 for(const {axis,min,max} of solid.boxAxes){
  const radius=axis.reduce((s,v,i)=>s+Math.abs(v)*halfExtents[i],0),position=dot(axis,a),speed=dot(axis,delta),lo=min-radius,hi=max+radius;
  if(Math.abs(speed)<1e-12){if(position<=lo+1e-9||position>=hi-1e-9)return null;continue;}
  let near=(lo-position)/speed,far=(hi-position)/speed;const sign=speed>0?-1:1;if(near>far)[near,far]=[far,near];
  if(near>=enter){enter=near;normal=axis.map(v=>v*sign);}exit=Math.min(exit,far);if(enter>=exit-1e-10)return null;
 }
 if(exit<=1e-10||enter>1)return null;return {enter:Math.max(0,enter),exit:Math.min(1,exit),normal};
}
