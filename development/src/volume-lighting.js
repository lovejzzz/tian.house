import * as THREE from 'three';
import {daylightCycle} from './daylight-cycle.js';

// Temporary environment study. Local fixture lights will be compiled from scene
// objects; this rig never invents interior lamps or mutates the saved time of day.
export function createVolumeLighting(scene,renderer){
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=.95;
 const sky=new THREE.HemisphereLight(0xc5d6e1,0x3b3026,.65);sky.position.set(0,0,1);
 const sun=new THREE.DirectionalLight(0xffe5bd,3.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.015;sun.shadow.bias=-.00005;
 scene.add(sky,sun,sun.target);
 let soft=true;
 // Constant world-space filter footprint, independent of lot bounds or map resolution.
 // A bounded overcast/finite-source approximation, not contact-hardening area shadows.
 const updateShadowFilter=()=>{const camera=sun.shadow.camera;sun.shadow.radius=soft?Math.max(1,Math.min(12,.09*sun.shadow.mapSize.x/(camera.right-camera.left))):1;};
 let center=new THREE.Vector3(),radius=3,direction=new THREE.Vector3(-.55,-.7,1).normalize();
 const positionSource=()=>{sun.target.position.copy(center);sun.position.copy(center).addScaledVector(direction,radius*2);sun.target.updateMatrixWorld();sun.shadow.needsUpdate=true;};
 return {
  setSoftShadows(value){soft=Boolean(value);updateShadowFilter();},
  setTime(minutes){
   const s=daylightCycle(minutes);sky.color.copy(new THREE.Color(0x7999c1).lerp(new THREE.Color(0xc5d6e1),s.skyMix));sky.groundColor.copy(new THREE.Color(0x202b31).lerp(new THREE.Color(0x3b3026),s.skyMix));sky.intensity=s.skyIntensity;
   sun.color.set(s.isDay?0xffe5bd:0xa8c1e7);if(s.isDay)sun.color.lerp(new THREE.Color(0xffa259),s.warmth);sun.intensity=s.intensity;
   direction.fromArray(s.direction).normalize();positionSource();renderer.setClearColor(new THREE.Color(0x0d171e).lerp(new THREE.Color(0x18251f),s.skyMix));return s;
  },
  setMode(mode){
   if(!['day','night'].includes(mode))throw Error('Unknown lighting study');
   const night=mode==='night';sky.color.set(night?0x7999c1:0xc5d6e1);sky.groundColor.set(night?0x202b31:0x3b3026);sky.intensity=night?.45:.65;
   sun.color.set(night?0xa8c1e7:0xffe5bd);sun.intensity=night?.8:3.2;
   renderer.setClearColor(night?0x0d171e:0x18251f);
   direction.set(-.55,-.7,1).normalize();positionSource();
  },
  fit(bounds){
   if(bounds.isEmpty())return;
   center=bounds.getCenter(new THREE.Vector3());radius=Math.max(3,bounds.getSize(new THREE.Vector3()).length()/2+1);positionSource();
   const c=sun.shadow.camera;Object.assign(c,{left:-radius,right:radius,bottom:-radius,top:radius,near:.1,far:radius*4});c.up.set(0,0,1);c.updateProjectionMatrix();updateShadowFilter();sun.target.updateMatrixWorld();sun.shadow.needsUpdate=true;
  },
  dispose(){scene.remove(sky,sun,sun.target);sun.shadow.map?.dispose();sun.shadow.mapPass?.dispose();}
 };
}
