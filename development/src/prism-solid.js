import {convexSolid} from './convex-solid.js';
import {polygonSignedArea} from './polygon-footprint.js';
export function prismSolid({polygon,minZ,maxZ}){
 if(!Number.isFinite(minZ)||!Number.isFinite(maxZ)||maxZ<=minZ)throw Error('Invalid prism height');
 const p=polygon.map(v=>[...v]);if(polygonSignedArea(p)<0)p.reverse();const n=p.length,vertices=[...p.map(v=>[...v,minZ]),...p.map(v=>[...v,maxZ])],indices=[];
 for(let i=1;i<n-1;i++)indices.push(0,i+1,i,n,n+i,n+i+1);
 for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,j,n+j,i,n+j,n+i);}
 return convexSolid({vertices,indices});
}
