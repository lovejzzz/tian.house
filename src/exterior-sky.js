import * as THREE from 'three';
import {Sky} from '../node_modules/three/examples/jsm/objects/Sky.js';
import {LightProbeGenerator} from '../node_modules/three/examples/jsm/lights/LightProbeGenerator.js';
// Physical sky (Preetham scattering + drifting clouds) for the Z-up house world,
// a star dome at night, horizon-matched aerial fog, and an image-based environment
// captured from the same sky so outdoor surfaces reflect and are lit by it.
// Interiors keep their room-probe lighting: the bounce study removes sky IBL from
// fragments inside rooms. Artistic daylight cycle, not an ephemeris.

// Sky irradiance as order-2 SH, shared by every material's outdoor fragments. The
// house walls carry their own room reflection capture (envMap), so they cannot use
// scene.environment; without this their outer faces saw only the room capture.
// The visible dome is shown darker than the radiance it lights the world with,
// so after the AgX transform it reads blue rather than near-white (photographic
// skies sit about a stop under their measured luminance next to sunlit walls).
export const SKY_DISPLAY_GAIN=.5;
export const SKY_SH={value:Array.from({length:9},()=>new THREE.Vector3())};

// World is Z-up; the Sky shader is Y-up. World (x,y,z) -> sky (x,z,-y).
export const toSkySpace=([x,y,z])=>[x,z,-y];
export function skySunVector(minutes){
 const hour=((minutes%1440)+1440)%1440/60,phase=(hour-6)*Math.PI/12;
 return [-Math.cos(phase),-.5,Math.sin(phase)*1.4];
}
// Horizon/fog colour by sun elevation (radians-ish proxy: normalised z).
export function horizonColor(sunZ){
 const day=new THREE.Color(0xbfd0de),dusk=new THREE.Color(0xd9a77e),night=new THREE.Color(0x0e1622);
 if(sunZ>=.35)return day;
 if(sunZ>=0)return dusk.clone().lerp(day,sunZ/.35);
 return dusk.clone().lerp(night,Math.min(1,-sunZ/.25));
}
function patchZUp(sky){
 const m=sky.material;
 const target='vec3 direction = normalize( vWorldPosition - cameraPosition );';
 if(!m.fragmentShader.includes(target))throw Error('Review the sky direction hook for this Three version');
 m.fragmentShader=m.fragmentShader.replace(target,'vec3 tianSkyD = vWorldPosition - cameraPosition;\n\t\t\tvec3 direction = normalize( vec3( tianSkyD.x, tianSkyD.z, -tianSkyD.y ) );');
 // Night: Preetham falls to black below the horizon; keep a moonlit deep-blue dome,
 // brighter toward the horizon (airglow/light pollution), so silhouettes still read.
 const end='gl_FragColor = vec4( texColor, 1.0 );';
 if(!m.fragmentShader.includes(end))throw Error('Review the sky output hook for this Three version');
 m.fragmentShader=m.fragmentShader.replace('uniform float time;','uniform float time;\n\t\tuniform float tianNight;\n\t\tuniform float tianSkyGain;').replace(end,'texColor *= tianSkyGain;\n\t\t\ttexColor = max( texColor, tianNight * mix( vec3( 0.016, 0.024, 0.045 ), vec3( 0.0035, 0.006, 0.016 ), clamp( direction.y * 2.5, 0.0, 1.0 ) ) );\n\t\t\t'+end);
 m.uniforms.tianNight={value:0};m.uniforms.tianSkyGain={value:1};
 m.needsUpdate=true;
}
function starDome(count=2600,seed=7){
 let s=seed;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
 const pos=new Float32Array(count*3),col=new Float32Array(count*3);
 for(let i=0;i<count;i++){const z=rnd()*.98+.02,a=rnd()*Math.PI*2,r=Math.sqrt(1-z*z),b=.35+.65*rnd()**3;
  pos.set([r*Math.cos(a)*900,r*Math.sin(a)*900,z*900],i*3);const warm=rnd();col.set([b*(.85+.15*warm),b*.9,b*(1-.15*warm)],i*3);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
 const m=new THREE.PointsMaterial({size:1.6,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:0,depthWrite:false,fog:false});
 const p=new THREE.Points(g,m);p.frustumCulled=false;p.renderOrder=-1;p.userData.indirectCaptureExclude=true;return p;
}

export function createExteriorSky(scene,renderer,{environment=typeof renderer?.getRenderTarget==='function'}={}){
 const sky=new Sky();sky.scale.setScalar(1800);sky.frustumCulled=false;patchZUp(sky);
 Object.assign(sky.material.uniforms.turbidity,{value:4.5});sky.material.uniforms.rayleigh.value=1.4;sky.material.uniforms.mieCoefficient.value=.004;sky.material.uniforms.mieDirectionalG.value=.82;
 sky.material.uniforms.cloudCoverage.value=.38;sky.material.uniforms.cloudDensity.value=.45;sky.material.uniforms.cloudScale.value=.00022;
 const stars=starDome();let starVeil=1; // heavy cloud hides the stars
 const root=new THREE.Group();root.name='exterior-sky';root.add(sky,stars);scene.add(root);
 // Linear aerial haze from 90 m: the tree line keeps its colour, the hills recede.
 const fog=new THREE.Fog(0xbfd0de,90,1100);scene.fog=fog;
 // Environment capture uses its own scene so only the sky is baked into IBL.
 const envScene=new THREE.Scene(),envSky=new Sky();envSky.scale.setScalar(1800);patchZUp(envSky);// Shares every sky uniform except the display gain: lighting sees full radiance.
 envSky.material.uniforms={...sky.material.uniforms,tianSkyGain:{value:1}};sky.material.uniforms.tianSkyGain.value=SKY_DISPLAY_GAIN;envScene.add(envSky);
 const pmrem=environment?new THREE.PMREMGenerator(renderer):null;let envTarget=null,lastSun=null,clock=0;
 const state={sun:[0,0,1],night:0};
 const cubeTarget=environment?new THREE.WebGLCubeRenderTarget(16,{type:THREE.HalfFloatType}):null,cubeCamera=environment?new THREE.CubeCamera(.1,2000,cubeTarget):null;
 let sh=null,shGeneration=0;
 const publishSH=()=>{const k=scene.environmentIntensity;for(let i=0;i<9;i++)SKY_SH.value[i].copy(sh?sh.coefficients[i]:new THREE.Vector3()).multiplyScalar(k);};
 function capture(){
  if(!environment)return;
  const next=pmrem.fromScene(envScene,0,.1,2000);envTarget?.dispose();envTarget=next;scene.environment=envTarget.texture;
  cubeCamera.update(renderer,envScene);const generation=++shGeneration;
  LightProbeGenerator.fromCubeRenderTarget(renderer,cubeTarget).then(probe=>{if(generation!==shGeneration)return;sh=probe.sh;publishSH();}).catch(()=>{});
 }
 return {
  root,
  setSun(sunWorld){
   const len=Math.hypot(...sunWorld)||1,u=sunWorld.map(v=>v/len);state.sun=u;
   sky.material.uniforms.sunPosition.value.fromArray(toSkySpace(u)).multiplyScalar(450000);
   sky.material.uniforms.showSunDisc.value=u[2]>-.02?1:0;
   state.night=Math.min(1,Math.max(0,(-u[2]+.02)/.22));
   stars.material.opacity=state.night*.95*starVeil;sky.material.uniforms.tianNight.value=state.night;
   fog.color.copy(horizonColor(u[2]));fog.far=1100-650*state.night;
   // Night sky: Preetham goes black below the horizon; keep a moonlit deep blue.
   // Preetham radiance is unscaled (the stock example runs at exposure .5): scale the
   // captured sky to sit beside the 3.2 sun; night keeps a faint moonlit fill.
   scene.environmentIntensity=.16+.19*(1-state.night);
   publishSH();
   if(!lastSun||Math.acos(Math.min(1,lastSun[0]*u[0]+lastSun[1]*u[1]+lastSun[2]*u[2]))>.035){lastSun=u;capture();}
  },
  // Weather: cloud cover on the visible dome and in the captured environment.
  setCover(c){sky.material.uniforms.cloudCoverage.value=c;starVeil=1-THREE.MathUtils.smoothstep(c,.5,.92);stars.material.opacity=state.night*.95*starVeil;sky.material.uniforms.cloudDensity.value=.45+.5*Math.max(0,c-.4);
   // Heavy cover: a duller, greyer dome and thicker haze (rain cuts visibility).
   const heavy=Math.max(0,(c-.5)/.45);sky.material.uniforms.tianSkyGain.value=SKY_DISPLAY_GAIN*(1-.45*heavy);sky.material.uniforms.turbidity.value=4.5+6*heavy;fog.far=(1100-650*state.night)*(1-.6*heavy);},
  // Keep the dome centred on the camera so it is always "at infinity"; drift clouds.
  update(camera,dt=0){root.position.copy(camera.position);clock+=dt;sky.material.uniforms.time.value=clock;},
  state:()=>({...state,environment:!!scene.environment,skySH:SKY_SH.value[0].toArray().map(v=>+v.toFixed(3))}),
  dispose(){scene.remove(root);scene.fog=null;scene.environment=null;envTarget?.dispose();pmrem?.dispose();cubeTarget?.dispose();shGeneration++;for(const v of SKY_SH.value)v.set(0,0,0);sky.geometry.dispose();sky.material.dispose();stars.geometry.dispose();stars.material.dispose();}
 };
}
