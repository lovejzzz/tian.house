import * as THREE from 'three';
// Damped foam approximation in real seconds, deliberately independent of game-time acceleration.
export function advanceFoam(state,loaded,dt){
 const target=loaded?1:0,h=Math.min(.1,Math.max(0,dt));
 const omega=loaded?9:5,decay=Math.exp(-omega*h),a=state.value-target,b=state.velocity+omega*a;
 return {value:target+(a+b*h)*decay,velocity:(state.velocity-omega*b*h)*decay};
}
export function foamDisplacement(point,bounds,contact,amount){
 const [min,max]=bounds,height=max[2]-min[2],top=Math.max(0,Math.min(1,(point[2]-min[2])/height));
 const dx=(point[0]-contact[0])/.32,dy=(point[1]-contact[1])/.38,r=dx*dx+dy*dy;
 const compression=Math.min(.075,height*.32)*amount;
 return -compression*Math.exp(-r*1.5)*top*top + compression*.1*Math.exp(-Math.pow(Math.sqrt(r)-1.2,2)*5)*top*top;
}
export function supportContact(bounds,rest,forward,bed=false){
 const p=bounds[0].map((v,i)=>(v+bounds[1][i])/2);let facing=rest?.forward||forward||[0,1,0];
 if(bed&&!rest?.sleeping){const origin=rest?.origin||p;const delta=[origin[0]-p[0],origin[1]-p[1]];const axis=Math.abs(delta[0]/(bounds[1][0]-bounds[0][0]))>Math.abs(delta[1]/(bounds[1][1]-bounds[0][1]))?0:1,sign=Math.sign(delta[axis])||1;p[axis]=(sign>0?bounds[1][axis]:bounds[0][axis])-sign*.14;facing=axis===0?[sign,0,0]:[0,sign,0];}
 if(!bed&&!rest?.sleeping){const axis=Math.abs(facing[0])>Math.abs(facing[1])?0:1,sign=Math.sign(facing[axis])||1;p[axis]=(sign>0?bounds[1][axis]:bounds[0][axis])-sign*Math.min(.16,(bounds[1][axis]-bounds[0][axis])*.25);}
 return {point:p,forward:facing};
}
function smoothSoftNormals(e){
 const g=e.mesh.geometry;g.computeVertexNormals();const n=g.attributes.normal;
 for(const ids of e.normalGroups){let x=0,y=0,z=0;for(const i of ids){x+=n.getX(i);y+=n.getY(i);z+=n.getZ(i);}const length=Math.hypot(x,y,z)||1;for(const i of ids)n.setXYZ(i,x/length,y/length,z/length);}n.needsUpdate=true;
}
function bindOverlay(e,support){
 const p=support.mesh.geometry.attributes.position,index=support.mesh.geometry.index?.array,origin=support.mesh.position,bindings=[],triangles=[];
 for(let t=0;t<(index?.length||p.count);t+=3){const ids=[0,1,2].map(k=>index?index[t+k]:t+k),points=ids.map(i=>[support.base[i*3]+origin.x,support.base[i*3+1]+origin.y,support.base[i*3+2]+origin.z]),[a,b,c]=points,det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(det)<1e-10)continue;triangles.push({ids,a,b,c,det,minX:Math.min(a[0],b[0],c[0]),maxX:Math.max(a[0],b[0],c[0]),minY:Math.min(a[1],b[1],c[1]),maxY:Math.max(a[1],b[1],c[1])});}
 const cache=new Map();
 for(let v=0;v<e.base.length/3;v++){const x=e.base[v*3]+e.mesh.position.x,y=e.base[v*3+1]+e.mesh.position.y,z=e.base[v*3+2]+e.mesh.position.z,key=[x,y,z].join(',');if(cache.has(key)){bindings.push(cache.get(key));continue;}let highest=-Infinity,binding=null;
  for(const t of triangles){if(x<t.minX-1e-6||x>t.maxX+1e-6||y<t.minY-1e-6||y>t.maxY+1e-6)continue;const {a,b,c,det,ids}=t,u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/det,w=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det,q=1-u-w,h=u*a[2]+w*b[2]+q*c[2];if(Math.min(u,w,q)>=-1e-6&&h>highest&&z>=h-.01){highest=h;binding={ids,weights:[u,w,q]};}}
  cache.set(key,binding);bindings.push(binding);
 }return bindings;
}

export function createSoftFurniture(group){
 let entries=[],current=null,last=null;
 return {
  rebuild(){entries=group.children.filter(m=>m.userData.softSupport).map(mesh=>{const base=mesh.geometry.attributes.position.array.slice(),box=new THREE.Box3().setFromObject(mesh);const groups=new Map();for(let i=0;i<base.length/3;i++){const key=[base[i*3],base[i*3+1],base[i*3+2]].join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}return {mesh,base,normalGroups:[...groups.values()],baseNormals:mesh.geometry.attributes.normal?.array.slice(),bounds:[box.min.toArray(),box.max.toArray()],state:{value:0,velocity:0}};});for(const e of entries.filter(e=>e.mesh.userData.softSupport!=='seat')){e.support=entries.filter(m=>m.mesh.userData.objectId===e.mesh.userData.objectId&&m.mesh.userData.softSupport==='seat').sort((a,b)=>{const d=m=>Math.hypot(...[0,1].map(i=>(m.bounds[0][i]+m.bounds[1][i]-e.bounds[0][i]-e.bounds[1][i])/2));return d(a)-d(b);})[0];if(e.support)e.bindings=bindOverlay(e,e.support);}current=null;last=null;},
  reset(){for(const e of entries){e.mesh.geometry.attributes.position.array.set(e.base);e.mesh.geometry.attributes.position.needsUpdate=true;if(e.baseNormals){e.mesh.geometry.attributes.normal.array.set(e.baseNormals);e.mesh.geometry.attributes.normal.needsUpdate=true;}e.mesh.geometry.computeBoundingSphere();e.state={value:0,velocity:0};}last=null;current=null;},
  update(rest,dt){
   const candidates=entries.filter(e=>e.mesh.userData.objectId===rest?.objectId&&e.mesh.userData.softSupport==='seat');
   const chosen=candidates.sort((a,b)=>{const distance=e=>Math.hypot((e.bounds[0][0]+e.bounds[1][0])/2-(rest?.origin?.[0]||0),(e.bounds[0][1]+e.bounds[1][1])/2-(rest?.origin?.[1]||0));return distance(a)-distance(b);})[0];
   if(chosen){last=chosen;chosen.rest=rest;}current=null;
   for(const e of entries){const support=e.mesh.userData.softSupport!=='seat'?entries.filter(m=>m.mesh.userData.objectId===e.mesh.userData.objectId&&m.mesh.userData.softSupport==='seat').sort((a,b)=>{const distance=m=>Math.hypot(...[0,1].map(i=>(m.bounds[0][i]+m.bounds[1][i]-e.bounds[0][i]-e.bounds[1][i])/2));return distance(a)-distance(b);})[0]:e;const active=support===chosen,old=e.state.value;e.state=advanceFoam(e.state,active,dt);if(!active&&e.state.value<1e-5&&old<1e-5)continue;
    const bounds=support?.bounds||e.bounds,bed=entries.some(m=>m.mesh.userData.objectId===e.mesh.userData.objectId&&m.mesh.userData.softSupport==='cover'),attachment=supportContact(bounds,support?.rest,e.mesh.userData.softForward,bed),contact=attachment.point,p=e.mesh.geometry.attributes.position,origin=e.mesh.position;
    for(let i=0;i<p.count;i++){const point=[e.base[i*3]+origin.x,e.base[i*3+1]+origin.y,e.base[i*3+2]+origin.z];const binding=e.bindings?.[i],delta=binding?binding.ids.reduce((sum,j,k)=>sum+binding.weights[k]*(support.mesh.geometry.attributes.position.getZ(j)-support.base[j*3+2]),0):foamDisplacement(point,bounds,contact,e.state.value);p.setXYZ(i,e.base[i*3],e.base[i*3+1],e.base[i*3+2]+delta);}
    p.needsUpdate=true;smoothSoftNormals(e);e.mesh.geometry.computeBoundingSphere();
    if(e.mesh.userData.softSupport==='seat'&&(active||e===last)&&e.state.value>1e-4)current={point:[contact[0],contact[1],e.bounds[1][2]+(entries.some(m=>m.mesh.userData.objectId===e.mesh.userData.objectId&&m.mesh.userData.softSupport==='cover')?.04:0)+foamDisplacement([contact[0],contact[1],e.bounds[1][2]],e.bounds,contact,e.state.value)],sleeping:e.rest.sleeping,amount:e.state.value,forward:attachment.forward,bounds:e.bounds};
   }
   return current;
  }
 };
}
