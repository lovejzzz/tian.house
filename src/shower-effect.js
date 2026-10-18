import * as THREE from 'three';
// Emit from the transformed authoritative shower-head geometry, not player position.
export function createShowerEffect(scene){
 const count=96,positions=new Float32Array(count*6),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const material=new THREE.LineBasicMaterial({color:0xb9d9d8,transparent:true,opacity:.42,depthWrite:false}),spray=new THREE.LineSegments(geometry,material);spray.visible=false;spray.frustumCulled=false;spray.userData.indirectCaptureExclude=true;scene.add(spray);const dropletsGeometry=new THREE.BufferGeometry(),dropletsPositions=new Float32Array(count*3);dropletsGeometry.setAttribute('position',new THREE.BufferAttribute(dropletsPositions,3));
 const dropletsMaterial=new THREE.PointsMaterial({color:0xc7dce1,size:.025,transparent:true,opacity:.6,depthWrite:false});
 dropletsMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat dropRadius=length(gl_PointCoord-vec2(0.5)); diffuseColor.a*=1.0-smoothstep(0.25,0.5,dropRadius);');};
 dropletsMaterial.customProgramCacheKey=()=> 'tian-water-droplets-v1';
 const droplets=new THREE.Points(dropletsGeometry,dropletsMaterial);droplets.visible=false;droplets.frustumCulled=false;droplets.userData.indirectCaptureExclude=true;scene.add(droplets);
 let emitters=[],time=0;
 return {
  rebuild(volumes,source){emitters=volumes.filter(v=>v.id.endsWith(':shower-head')||v.id.endsWith(':tap-spout')).map(v=>({kind:v.id.endsWith(':tap-spout')?'sink':'shower',object:source.objects.find(o=>o.id===v.objectId),level:source.levels.find(l=>l.id===source.objects.find(o=>o.id===v.objectId)?.levelId)?.index,point:v.id.endsWith(':tap-spout')?tapOutlet(v.vertices,volumes.find(r=>r.objectId===v.objectId&&r.id.endsWith(':tap-riser'))?.vertices):center(v.vertices)}));},
  update(action,dt){const rinsing=!!action?.handRinse,object=action?.shower?.object||action?.handRinse?.object,entry=object&&emitters.find(e=>e.kind===(rinsing?'sink':'shower')&&e.level===object.z&&e.object?.x===object.x&&e.object?.y===object.y&&e.object.parts.some(p=>p.tile===object.tile));spray.visible=!!entry;droplets.visible=!!entry;if(!entry)return;time+=Math.min(.1,Math.max(0,dt));
   for(let i=0;i<count;i++){const phase=(time*1.5+i*.61803398875)%1,angle=i*2.39996,r=rinsing?.006:.075+phase*.15,x=entry.point[0]+Math.cos(angle)*r,y=entry.point[1]+Math.sin(angle)*r,z=entry.point[2]-phase*(rinsing?.22:1.85);positions.set([x,y,z,x,y,z-(rinsing?.012:.055)],i*6);dropletsPositions.set([x,y,z],i*3);}geometry.attributes.position.needsUpdate=true;dropletsGeometry.attributes.position.needsUpdate=true;
  },
  stop(){spray.visible=false;droplets.visible=false;},dispose(){scene.remove(spray,droplets);geometry.dispose();material.dispose();dropletsGeometry.dispose();dropletsMaterial.dispose();}
 };
}

const center=vertices=>[0,1,2].map(i=>vertices.reduce((sum,p)=>sum+p[i],0)/vertices.length);
export function tapOutlet(vertices,riser){
 const c=center(vertices);if(!riser?.length)return c;
 const base=center(riser),d=[c[0]-base[0],c[1]-base[1]],length=Math.hypot(...d);
 if(length<1e-8)return c;
 const projection=p=>(p[0]-c[0])*d[0]/length+(p[1]-c[1])*d[1]/length;
 const end=Math.max(...vertices.map(projection)),tip=center(vertices.filter(p=>end-projection(p)<1e-6));
 tip[2]=Math.min(...vertices.map(p=>p[2]));return tip;
}
