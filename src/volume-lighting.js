import * as THREE from 'three';
import {daylightCycle} from './daylight-cycle.js?v=1d7ffb1877ce';
import {createExteriorSky,skySunVector} from './exterior-sky.js?v=1d7ffb1877ce';
import {createWeather,ATMOSPHERE} from './atmosphere-effects.js?v=1d7ffb1877ce';
export const EXTERIOR_EXPOSURE=.72,INTERIOR_EXPOSURE_COMPENSATION=.95/EXTERIOR_EXPOSURE;

// Temporary environment study. Local fixture lights will be compiled from scene
// objects; this rig never invents interior lamps or mutates the saved time of day.
export function createVolumeLighting(scene,renderer){
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 // Camera exposure is set for the sunlit exterior (a shaded white render reads light
 // grey, not paper white); rooms keep their established brightness through
 // INTERIOR_EXPOSURE_COMPENSATION applied with the interior gain.
 renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=EXTERIOR_EXPOSURE;
 const sky=new THREE.HemisphereLight(0xc5d6e1,0x3b3026,.65);sky.position.set(0,0,1);
 const sun=new THREE.DirectionalLight(0xffe5bd,3.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.015;sun.shadow.bias=-.00005;
 scene.add(sky,sun,sun.target);
 // Physical sky + image-based environment; the hemisphere stays as a weak ground-bounce tint.
 const exterior=createExteriorSky(scene,renderer);const HEMI_WITH_SKY=.4;
 // Weather modulates the sun and sky cover; cloud shadows and wetness follow it.
 const weather=createWeather(scene);let sunBase=3.2;const GROUND_ALBEDO=new THREE.Color(.09,.12,.05);
 let soft=true;
 // Constant world-space filter footprint, independent of lot bounds or map resolution.
 // A bounded overcast/finite-source approximation, not contact-hardening area shadows.
 const updateShadowFilter=()=>{const camera=sun.shadow.camera;sun.shadow.radius=soft?Math.max(1,Math.min(12,.09*sun.shadow.mapSize.x/(camera.right-camera.left))):1;};
 let center=new THREE.Vector3(),radius=3,direction=new THREE.Vector3(-.55,-.7,1).normalize();
 const positionSource=()=>{sun.target.position.copy(center);sun.position.copy(center).addScaledVector(direction,radius*2);sun.target.updateMatrixWorld();sun.shadow.needsUpdate=true;};
 return {
  setSoftShadows(value){soft=Boolean(value);updateShadowFilter();},
  setTime(minutes){
   const s=daylightCycle(minutes);sky.color.copy(new THREE.Color(0x7999c1).lerp(new THREE.Color(0xc5d6e1),s.skyMix));sky.groundColor.copy(new THREE.Color(0x202b31).lerp(new THREE.Color(0x3b3026),s.skyMix));sky.intensity=s.skyIntensity*HEMI_WITH_SKY;exterior.setSun(skySunVector(minutes));
   sun.color.set(s.isDay?0xffe5bd:0xa8c1e7);if(s.isDay)sun.color.lerp(new THREE.Color(0xffa259),s.warmth);sun.intensity=sunBase=s.intensity;weather.setTime(minutes);
   direction.fromArray(s.direction).normalize();positionSource();renderer.setClearColor(new THREE.Color(0x0d171e).lerp(new THREE.Color(0x18251f),s.skyMix));return s;
  },
  setMode(mode){
   if(!['day','night'].includes(mode))throw Error('Unknown lighting study');
   const night=mode==='night';sky.color.set(night?0x7999c1:0xc5d6e1);sky.groundColor.set(night?0x202b31:0x3b3026);sky.intensity=(night?.45:.65)*HEMI_WITH_SKY;exterior.setSun(night?[-.55,-.7,-.45]:[-.55,-.7,1]);
   sun.color.set(night?0xa8c1e7:0xffe5bd);sun.intensity=sunBase=night?1.4:3.2;
   renderer.setClearColor(night?0x0d171e:0x18251f);
   direction.set(-.55,-.7,1).normalize();positionSource();
  },
  fit(bounds){
   if(bounds.isEmpty())return;
   center=bounds.getCenter(new THREE.Vector3());radius=Math.max(3,bounds.getSize(new THREE.Vector3()).length()/2+1);positionSource();
   const c=sun.shadow.camera;Object.assign(c,{left:-radius,right:radius,bottom:-radius,top:radius,near:.1,far:radius*4});c.up.set(0,0,1);c.updateProjectionMatrix();updateShadowFilter();sun.target.updateMatrixWorld();sun.shadow.needsUpdate=true;
  },
  update(camera,dt){exterior.update(camera,dt);ATMOSPHERE.time.value+=dt;
   const sunZ=exterior.state().sun[2],day=Math.max(0,Math.min(1,sunZ*3)),w=weather.update(camera,dt,day);
   sun.intensity=sunBase*(day>0?w.sun:1);exterior.setCover(w.cover);ATMOSPHERE.cloudShadow.value=w.cloud*day;
   // Sunlit ground re-lights walls and undersides from below (outdoor fragments only).
   ATMOSPHERE.groundBounce.value.set(sun.color.r,sun.color.g,sun.color.b).multiplyScalar(sun.intensity*Math.max(0,sunZ)*.5).multiply(new THREE.Vector3(GROUND_ALBEDO.r,GROUND_ALBEDO.g,GROUND_ALBEDO.b));
   return w;},
  sky:exterior,weather,
  dispose(){weather.dispose();exterior.dispose();scene.remove(sky,sun,sun.target);sun.shadow.map?.dispose();sun.shadow.mapPass?.dispose();}
 };
}
