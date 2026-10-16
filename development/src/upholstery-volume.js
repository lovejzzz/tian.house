import {Vector3} from 'three';
import {ConvexHull} from '../node_modules/three/examples/jsm/math/ConvexHull.js';
import {convexSolid} from './convex-solid.js';
// A bounded superellipsoid envelope: visible upholstery and collision share
// the same convex surface. This models padding, not cloth simulation or folds.
export function upholsteryVolume({id,materialId='cloth',origin,size,exponent=.45,creaseDepth=0}){
 if(!Number.isFinite(creaseDepth)||creaseDepth<0||creaseDepth>.015)throw Error('Invalid upholstery crease depth');
 if(origin?.length!==3||size?.length!==3||!origin.every(Number.isFinite)||!size.every(v=>Number.isFinite(v)&&v>0)||!(exponent>=.25&&exponent<=1))throw Error('Invalid upholstery dimensions');
 const latitudes=12,longitudes=24;
 const points=[],power=v=>Math.abs(v)<1e-12?0:Math.sign(v)*Math.abs(v)**exponent;
 for(let j=0;j<=latitudes;j++){
  const latitude=-Math.PI/2+j*Math.PI/latitudes;
  for(let i=0;i<(j===0||j===latitudes?1:longitudes);i++){
   const longitude=i*2*Math.PI/longitudes,c=power(Math.cos(latitude));
   const p=[c*power(Math.cos(longitude)),c*power(Math.sin(longitude)),power(Math.sin(latitude))];
   points.push(new Vector3(...p.map((v,k)=>origin[k]+size[k]*(v+1)/2)));
  }
 }
 const hull=new ConvexHull().setFromPoints(points),vertices=[],indices=[],ids=new Map();
 for(const face of hull.faces){let edge=face.edge;do{const p=edge.head().point;if(!ids.has(p)){ids.set(p,vertices.length);vertices.push(p.toArray());}indices.push(ids.get(p));edge=edge.next;}while(edge!==face.edge);}
 const mesh={id,role:'furniture',materialId,vertices,indices,smoothNormals:true};mesh.collision=[convexSolid(mesh)];
 // Tailored creases pull inward from the sewn perimeter. Retain the conservative
 // undeformed envelope for collision, just as runtime foam compression does.
 if(creaseDepth){
  mesh.collisionMesh={vertices:vertices.map(p=>[...p]),indices:[...indices]};
  // Subdivide render triangles only; do not multiply collision planes/axes.
  const mids=new Map(),midpoint=(a,b)=>{const key=[Math.min(a,b),Math.max(a,b)].join(':');if(mids.has(key))return mids.get(key);const i=vertices.length;vertices.push(vertices[a].map((v,k)=>(v+vertices[b][k])/2));mids.set(key,i);return i;};
  const refined=[];for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3),ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);refined.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}indices.splice(0,indices.length,...refined);
  const thin=size.indexOf(Math.min(...size)),axes=[0,1,2].filter(k=>k!==thin);
  const depth=Math.min(creaseDepth,size[thin]*.08);
  let seed=0;for(const c of id)seed=(seed*31+c.charCodeAt(0))>>>0;
  const phase=(seed%997)/997*Math.PI*2;
  for(const p of vertices){
   const a=(p[axes[0]]-origin[axes[0]])/size[axes[0]]*2-1,b=(p[axes[1]]-origin[axes[1]])/size[axes[1]]*2-1;
   const edge=Math.max(Math.abs(a),Math.abs(b)),radial=(edge-.78)/.18;
   const envelope=Math.exp(-radial*radial)*Math.max(0,1-Math.abs(edge-.86));
   const angle=Math.atan2(b,a),groove=Math.max(0,Math.cos(11*angle+phase+edge*5))**6;
   const mid=origin[thin]+size[thin]/2,side=Math.sign(p[thin]-mid);
   p[thin]-=side*depth*envelope*groove;
  }
  mesh.collisionApproximation='undeformed padded envelope; inward sewn creases';
 }
 if(/^(mattress|seat|chaise-seat|padded-seat)/.test(id)&&size[2]<Math.min(size[0],size[1])*.6)mesh.softSupport='seat';return mesh;
}
