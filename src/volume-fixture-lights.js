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
export function createVolumeFixtureLights(scene,{shadowBudget=12}={}){
 let lights=[],materials=[],enabled=true,soft=true;
 const clear=()=>{for(const light of lights){scene.remove(light,light.target);light.shadow.map?.dispose();light.shadow.mapPass?.dispose();}lights=[];materials=[];};
 return {
  rebuild(volumes,levelId){
   clear();const fixtures=volumes.filter(v=>v.levelId===levelId).flatMap(v=>[...(v.light?[{...v,sourceId:v.objectId}]:[]),...(v.additionalLights||[]).map((light,i)=>({...v,light,sourceId:`${v.objectId}:lobe:${i}`}))]);
   if(fixtures.length>shadowBudget)throw Error(`This floor has ${fixtures.length} lamps; the current shadow budget supports ${shadowBudget}. Lighting virtualization is required.`);
   const counts=fixtureSampleCounts(fixtures,shadowBudget);
   for(const [fixtureIndex,volume] of fixtures.entries()){const p=volume.light;
    // Keep a reviewed offset when reducing samples: the center can be inside a lamp stem.
    const candidates=p.samples?.length?p.samples:[[0,0,0]];
    // Retain the full source extent when reducing the sample budget.
    const count=counts[fixtureIndex];
    const samples=Array.from({length:count},(_,i)=>candidates[count===1?0:Math.round(i*(candidates.length-1)/(count-1))]);
    for(const offset of samples){
     const light=new THREE.SpotLight(p.color,p.intensity/samples.length,p.distance,p.angle,p.penumbra,p.decay);
     light.position.set(...p.position).add(new THREE.Vector3(...offset));light.target.position.set(...p.target).add(new THREE.Vector3(...offset));light.userData.onIntensity=p.intensity/samples.length;light.intensity=enabled?light.userData.onIntensity:0;light.castShadow=true;light.shadow.autoUpdate=enabled;light.shadow.mapSize.set(512,512);light.shadow.radius=soft?6:2.5;light.shadow.bias=-.0002;light.shadow.normalBias=.015;light.shadow.camera.near=.1;light.userData.objectId=volume.objectId;scene.add(light,light.target);light.target.updateMatrixWorld();lights.push(light);
    }
   }
  },
  setSoftShadows(value){soft=Boolean(value);for(const light of lights)light.shadow.radius=soft?6:2.5;},
  bindMaterial(material,{color,intensity}){material.emissive.set(color);material.emissiveIntensity=enabled?intensity:0;materials.push({material,intensity});},
  setEnabled(value){enabled=Boolean(value);for(const light of lights){light.intensity=enabled?light.userData.onIntensity:0;light.shadow.autoUpdate=enabled;if(enabled)light.shadow.needsUpdate=true;}for(const {material,intensity} of materials)material.emissiveIntensity=enabled?intensity:0;},
  dispose:clear
 };
}
