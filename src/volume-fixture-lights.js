import * as THREE from 'three';
// Allocate all useful source samples without exceeding the shared sampler budget.
// Larger emitter extents benefit first; diminishing returns prevent one fixture
// consuming every spare sample. Stable IDs make ties independent of scene order.
export function fixtureSampleCounts(fixtures,budget){
 if(!Number.isInteger(budget)||budget<0||fixtures.length>budget)throw Error('Invalid fixture sample budget');
 const entries=fixtures.map((v,index)=>{
  const samples=v.light.samples?.length?v.light.samples:[[0,0,0]];
  const extent=Math.max(0,...samples.flatMap(a=>samples.map(b=>Math.hypot(...a.map((x,i)=>x-b[i])))));
  return {index,id:String(v.sourceId??v.objectId??index),max:samples.length,extent,count:1};
 });
 let spare=budget-entries.length;
 while(spare>0){
  const next=entries.filter(e=>e.count<e.max&&e.extent>0).sort((a,b)=>b.extent/(b.count*(b.count+1))-a.extent/(a.count*(a.count+1))||a.id.localeCompare(b.id))[0];
  if(!next)break;next.count++;spare--;
 }
 return entries.map(e=>e.count);
}
// Keep light/shadow shader topology stable when switching off: zero energy, no shadow updates.
// Preview-only switch; mesh emission and actual illumination always change together.
// Sphere {center,radius} against a spotlight's cone and range (conservative).
export function spotTouches(light,{center,radius}){
 const p=light.position,t=light.target.position,dx=center[0]-p.x,dy=center[1]-p.y,dz=center[2]-p.z,d=Math.hypot(dx,dy,dz);
 if(d<=radius)return true;if(light.distance>0&&d-radius>light.distance)return false;
 const ax=t.x-p.x,ay=t.y-p.y,az=t.z-p.z,a=Math.hypot(ax,ay,az)||1,cos=(dx*ax+dy*ay+dz*az)/(d*a);
 return Math.acos(Math.max(-1,Math.min(1,cos)))<=light.angle+Math.asin(Math.min(1,radius/d));
}
export function createVolumeFixtureLights(scene,{shadowBudget=12,shadows=true}={}){
 let lights=[],materials=[],enabled=true,soft=true,dirtyAll=true,frame=0;
 const clear=()=>{for(const light of lights){scene.remove(light,light.target);light.shadow.map?.dispose();light.shadow.mapPass?.dispose();}lights=[];materials=[];};
 return {
  rebuild(volumes,levelId){
   clear();dirtyAll=true;const fixtures=volumes.filter(v=>v.levelId===levelId).flatMap(v=>[...(v.light?[{...v,sourceId:v.objectId}]:[]),...(v.additionalLights||[]).map((light,i)=>({...v,light,sourceId:`${v.objectId}:lobe:${i}`}))]);
   // One shadowed light per lamp first; spare budget becomes extra soft-light
   // samples. Lamps beyond the budget still light the room, without shadows.
   const shadowed=Math.min(fixtures.length,shadowBudget),counts=[...fixtureSampleCounts(fixtures.slice(0,shadowed),shadowBudget),...fixtures.slice(shadowed).map(()=>1)];
   for(const [fixtureIndex,volume] of fixtures.entries()){const p=volume.light;
    // Keep a reviewed offset when reducing samples: the center can be inside a lamp stem.
    const candidates=p.samples?.length?p.samples:[[0,0,0]];
    // Retain the full source extent when reducing the sample budget.
    const count=counts[fixtureIndex];
    const samples=Array.from({length:count},(_,i)=>candidates[count===1?0:Math.round(i*(candidates.length-1)/(count-1))]);
    for(const offset of samples){
     const light=new THREE.SpotLight(p.color,p.intensity/samples.length,p.distance,p.angle,p.penumbra,p.decay);
     light.position.set(...p.position).add(new THREE.Vector3(...offset));light.target.position.set(...p.target).add(new THREE.Vector3(...offset));light.userData.onIntensity=p.intensity/samples.length;light.intensity=enabled?light.userData.onIntensity:0;light.castShadow=shadows&&fixtureIndex<shadowed;light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;light.shadow.mapSize.set(512,512);light.shadow.radius=soft?6:2.5;light.shadow.bias=-.0002;light.shadow.normalBias=.015;light.shadow.camera.near=.1;light.userData.objectId=volume.objectId;scene.add(light,light.target);light.target.updateMatrixWorld();lights.push(light);
    }
   }
  },
  setSoftShadows(value){soft=Boolean(value);for(const light of lights)light.shadow.radius=soft?6:2.5;},
  // Lit fabric glows through its own weave: the colour map modulates the emission.
  bindMaterial(material,{color,intensity}){material.emissive.set(color);if(material.map&&!material.emissiveMap){material.emissiveMap=material.map;material.needsUpdate=true;}material.emissiveIntensity=enabled?intensity:0;materials.push({material,intensity});},
  setEnabled(value){enabled=Boolean(value);for(const light of lights){light.intensity=enabled?light.userData.onIntensity:0;light.shadow.autoUpdate=false;}dirtyAll=enabled;for(const {material,intensity} of materials)material.emissiveIntensity=enabled?intensity:0;},
  // Shadow scheduling: the room is static, so a fixture's shadow map is re-rendered
  // only when a moving caster (a character) is inside its cone, for one frame after
  // it leaves, or after anything else changed (rebuild, lamps, animated doors).
  invalidateShadows(){dirtyAll=true;},
  // Character-driven refreshes are budgeted (round-robin, least recently refreshed
  // first): each touched light still updates every few frames, but a walking
  // resident never re-renders every nearby shadow map in the same frame.
  scheduleShadows(movers=[],{budget=2}={}){
   if(!enabled)return 0;frame++;
   if(dirtyAll){for(const light of lights){light.shadow.needsUpdate=true;light.userData.shadowFrame=frame;light.userData.shadowTouched=movers.some(m=>spotTouches(light,m));}dirtyAll=false;return lights.length;}
   const due=[];
   for(const light of lights){const touched=movers.some(m=>spotTouches(light,m));if(touched||light.userData.shadowTouched)due.push(light);if(touched)light.userData.shadowTouched=true;}
   due.sort((a,b)=>(a.userData.shadowFrame??-1)-(b.userData.shadowFrame??-1));
   const chosen=due.slice(0,budget);
   for(const light of chosen){light.shadow.needsUpdate=true;light.userData.shadowFrame=frame;
    // A light the caster has left is refreshed once more, then released.
    if(!movers.some(m=>spotTouches(light,m)))light.userData.shadowTouched=false;}
   return chosen.length;
  },
  dispose:clear
 };
}
