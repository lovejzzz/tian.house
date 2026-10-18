import * as THREE from 'three';
// Deterministic single diffuse bounce. Cache geometric transport, then multiply
// by decoded linear RGB. Material base colour approximates texture-average albedo.
// Glass transmission, specular transport and subsequent bounces are not modelled.
export function televisionDiffuseTransfer(...args){const work=transferSteps(...args);let step;do{step=work.next();}while(!step.done);return step.value;}
export async function prepareTelevisionDiffuseTransfer(patches,regions,meshes,{cancelled=()=>false,yieldFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),...options}={}){
 const work=transferSteps(patches,regions,meshes,options);let cpu=0,maxStep=0;
 while(!cancelled()){const start=performance.now(),step=work.next(),elapsed=performance.now()-start;cpu+=elapsed;maxStep=Math.max(maxStep,elapsed);if(step.done){Object.assign(step.value.stats,{cpuMilliseconds:cpu,maxStepMilliseconds:maxStep});return step.value;}await yieldFrame();}
 work.return();return null;
}
function* transferSteps(patches,regions,meshes,{samples=64}={}){
 if(!Number.isInteger(samples)||samples<8)throw Error('At least eight transport samples required');
 const started=performance.now(),ray=new THREE.Raycaster(),normalMatrix=new THREE.Matrix3(),basis=Array(9).fill(0);
 const opaque=meshes.filter(m=>m.isMesh&&m.material&&!(m.material.opacity<1&&!m.userData.wallCutaway&&!m.userData.furnitureCutaway)&&!m.userData.indirectCaptureExclude);
 for(const mesh of opaque)mesh.updateWorldMatrix(true,false);
 const fields=patches.map(()=>Array.from({length:regions.length*9},()=>new THREE.Vector3()));
 let hits=0,visiblePaths=0;
 const cutoff=r=>Math.pow(Math.max(0,1-Math.pow(r/9,4)),2),smooth=x=>x*x*(3-2*x);
 for(let p=0;p<patches.length;p++){
  const patch=patches[p],origin=new THREE.Vector3(...patch.position),forward=new THREE.Vector3(...patch.normal).normalize();
  const u=new THREE.Vector3().crossVectors(forward,Math.abs(forward.z)<.9?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0)).normalize(),v=new THREE.Vector3().crossVectors(forward,u);
  const cone=Math.cos(Math.PI*.46),omega=2*Math.PI*(1-cone)/samples;
  for(let i=0;i<samples;i++){
   if(i%4===0)yield;
   const cos=1-(i+.5)/samples*(1-cone),sin=Math.sqrt(1-cos*cos),phi=i*Math.PI*(3-Math.sqrt(5));
   const direction=forward.clone().multiplyScalar(cos).addScaledVector(u,sin*Math.cos(phi)).addScaledVector(v,sin*Math.sin(phi));
   ray.set(origin,direction);ray.near=.015;ray.far=9;
   const hit=ray.intersectObjects(opaque,false)[0];if(!hit?.face)continue;
   const n=hit.face.normal.clone().applyMatrix3(normalMatrix.getNormalMatrix(hit.object.matrixWorld)).normalize();
   if(n.dot(direction)>=-.001)continue;
   hits++;const point=hit.point.clone().addScaledVector(n,.015),m=hit.object.material;
   const albedo=new THREE.Color(hit.object.userData.baseColor??m.color.getHex()).multiplyScalar(1-(m.metalness||0));
   const power=(patch.intensity??30)*smooth((cos-cone)/(1-cone))*omega*cutoff(hit.distance)/Math.PI;
   for(let r=0;r<regions.length;r++){
    const probe=new THREE.Vector3(...regions[r].position),toProbe=probe.clone().sub(point),distance=toProbe.length();if(distance<.1)continue;
    toProbe.divideScalar(distance);const facing=n.dot(toProbe);if(facing<=0)continue;
    ray.set(point,toProbe);ray.near=.005;ray.far=distance-.025;if(ray.intersectObjects(opaque,false).length)continue;
    visiblePaths++;THREE.SphericalHarmonics3.getBasisAt(toProbe.clone().negate(),basis);
    const energy=power*facing/Math.max(.25,distance*distance);
    for(let j=0;j<9;j++)fields[p][r*9+j].addScaledVector(new THREE.Vector3(albedo.r,albedo.g,albedo.b),energy*basis[j]);
   }
  }
 }
 return {stats:{samples:patches.length*samples,hits,visiblePaths,milliseconds:performance.now()-started},sample(colours){
  const result=Array.from({length:regions.length*9},()=>new THREE.Vector3());
  for(let p=0;p<fields.length;p++){const rgb=colours[p]||[0,0,0];for(let j=0;j<result.length;j++){const f=fields[p][j];result[j].x+=f.x*rgb[0];result[j].y+=f.y*rgb[1];result[j].z+=f.z*rgb[2];}}
  return result;
 }};
}
