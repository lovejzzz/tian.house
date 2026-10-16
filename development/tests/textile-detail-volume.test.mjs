import test from 'node:test';import assert from 'node:assert/strict';
import {upholsteryTrim,drapedTextile} from '../src/textile-detail-volume.js';
test('sewn trim follows thin axis for seat and upright cushion without widening footprint',()=>{
 for(const size of [[.8,.7,.16],[.8,.16,.35]]){
  const origin=[2,3,.4],p=upholsteryTrim({id:'seam',origin,size});assert.equal(p.collision.length,0);
  for(const v of p.vertices)for(let i=0;i<3;i++)assert.ok(Number.isFinite(v[i])&&v[i]>=origin[i]&&v[i]<=origin[i]+size[i]);
  const edges=new Map();for(let i=0;i<p.indices.length;i+=3)for(let k=0;k<3;k++){const a=p.indices[i+k],b=p.indices[i+(k+1)%3],key=[a,b].sort((a,b)=>a-b).join(':');edges.set(key,(edges.get(key)||0)+1);}assert.ok([...edges.values()].every(n=>n===2));
 }
});
test('throw bends continuously over furniture edge, with no blocking collision',()=>{
 const p=drapedTextile({id:'throw',x:.24,y:1.12,z:.535,width:.6,flatLength:.66,drop:.24});assert.equal(p.collision.length,0);assert.equal(p.doubleSided,true);assert.ok(p.vertices.every(v=>v.every(Number.isFinite)));assert.ok(Math.min(...p.vertices.map(v=>v[2]))>.2);assert.ok(Math.max(...p.vertices.map(v=>v[1]))<1.87);
 for(let i=0;i<p.indices.length;i+=3){const [a,b,c]=p.indices.slice(i,i+3).map(n=>p.vertices[n]),u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]);assert.ok(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-10);}
});
