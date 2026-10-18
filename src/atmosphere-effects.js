import * as THREE from 'three';
import {ShaderPass} from '../node_modules/three/examples/jsm/postprocessing/ShaderPass.js';
// Living atmosphere for the exterior (authored look development):
// - ATMOSPHERE uniforms shared by every patched material: time, cloud-shadow
//   strength, wind vector and wetness.
// - installCloudShadow: soft cloud shadows drifting over everything lit by the sun
//   (scales direct light only; ambient and lamps are untouched).
// - installWetness: rain darkens and glosses upward-facing outdoor surfaces, with
//   puddles collecting in low-frequency hollows on hard surfaces.
// - createWeather: clear / overcast / rain states (sky cover, sun dimming, rain
//   streaks round the camera, wetness that soaks in and dries out over time).
// - createBirds and createFallingLeaves: a small flock wheeling over the plot and
//   leaves drifting down from the garden trees.
// - ShaftsShader: screen-space sun shafts (radial blur of bright sky toward the sun).
export const ATMOSPHERE={time:{value:0},cloudShadow:{value:0},wind:{value:new THREE.Vector2(1,.35)},wetness:{value:0},gust:{value:1},groundBounce:{value:new THREE.Vector3()}};

const NOISE=`
float tatHash(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
float tatNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(tatHash(i),tatHash(i+vec2(1,0)),f.x),mix(tatHash(i+vec2(0,1)),tatHash(i+vec2(1,1)),f.x),f.y);}
float tatFbm(vec2 p){return .55*tatNoise(p)+.3*tatNoise(p*2.03+7.1)+.15*tatNoise(p*4.1+3.3);}
`;
function worldVarying(shader,name){
 shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nvarying vec3 ${name};`).replace('#include <project_vertex>',`#include <project_vertex>
 vec4 ${name}P=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
  ${name}P=instanceMatrix*${name}P;
 #endif
 ${name}=(modelMatrix*${name}P).xyz;`);
}
export function installCloudShadow(material){
 if(material.userData.cloudShadow)return material;material.userData.cloudShadow=true;
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);
  Object.assign(shader.uniforms,{tatTime:ATMOSPHERE.time,tatCloud:ATMOSPHERE.cloudShadow,tatWind:ATMOSPHERE.wind});
  worldVarying(shader,'vTatCloudW');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vTatCloudW;uniform float tatTime,tatCloud;uniform vec2 tatWind;'+NOISE.replace(/tat(Hash|Noise|Fbm)/g,'tcs$1'))
   .replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
 {
  vec2 cp=mod(vTatCloudW.xy,4096.0)*.0105-tatWind*tatTime*.045;
  float cover=smoothstep(.42,.72,tcsFbm(cp));
  float k=1.0-tatCloud*cover;
  reflectedLight.directDiffuse*=k;reflectedLight.directSpecular*=k;
 }`);
 };
 material.customProgramCacheKey=()=>key+'|cloud-shadow-v1';return material;
}
export function installWetness(material,{hard=true}={}){
 if(material.userData.wetness)return material;material.userData.wetness=true;
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);
  Object.assign(shader.uniforms,{twtWet:ATMOSPHERE.wetness});
  worldVarying(shader,'vTwtW');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vTwtW;uniform float twtWet;'+NOISE.replace(/tat(Hash|Noise|Fbm)/g,'twt$1'))
   .replace('#include <map_fragment>',`#include <map_fragment>
 float twtUp=0.0,twtPuddle=0.0;
 if(twtWet>0.001){
  vec3 wn=normalize(cross(dFdx(vTwtW),dFdy(vTwtW)));twtUp=clamp(abs(wn.z)*1.4-.3,0.0,1.0)*twtWet;
  ${hard?'twtPuddle=smoothstep(.62,.7,twtFbm(mod(vTwtW.xy,512.0)*.45))*twtUp*smoothstep(.4,1.0,twtWet);':''}
  diffuseColor.rgb*=mix(1.0,.62,twtUp)*mix(1.0,.85,twtPuddle);
 }`)
   .replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
 roughnessFactor=mix(roughnessFactor,roughnessFactor*.35,twtUp);roughnessFactor=mix(roughnessFactor,.04,twtPuddle);`);
 };
 material.customProgramCacheKey=()=>key+'|wetness-v1';return material;
}

// Weather: deterministic per in-game day (most days fair, some overcast, some rain
// spells), or forced. Drives sky cover, sun dimming, cloud shadows, rain and wetness.
export function weatherFor(minutes){
 const day=Math.floor(minutes/1440),h=(minutes%1440)/60,s=((day*2654435761)>>>0)/4294967296;
 if(s<.22&&h>13&&h<18.5)return 'rain';if(s<.4)return 'overcast';return 'clear';
}
export function createWeather(scene){
 const N=3500,pos=new Float32Array(N*6),speed=new Float32Array(N),r=(()=>{let s=7;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};})();
 const base=new Float32Array(N*3);for(let i=0;i<N;i++){base.set([(r()-.5)*36,(r()-.5)*36,r()*16],i*3);speed[i]=7+3*r();}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const rain=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xaab4bc,transparent:true,opacity:.35,depthWrite:false,fog:true}));rain.frustumCulled=false;rain.visible=false;rain.name='rain';rain.userData.indirectCaptureExclude=true;scene.add(rain);
 const state={mode:'clear',forced:null,target:{cover:.38,sun:1,cloud:.35,rain:0,wet:0},cur:{cover:.38,sun:1,cloud:.35,rain:0,wet:0},fall:0};
 const PRESET={clear:{cover:.38,sun:1,cloud:.35,rain:0},overcast:{cover:.82,sun:.42,cloud:.15,rain:0},rain:{cover:.95,sun:.25,cloud:.05,rain:1}};
 return {
  set(mode){if(mode&&!PRESET[mode])throw Error('Unknown weather');state.forced=mode||null;this.setTime(state.minutes??780);},
  setTime(minutes){state.minutes=minutes;state.mode=state.forced||weatherFor(minutes);Object.assign(state.target,PRESET[state.mode]);},
  // Returns the sky cover and sun factor to apply; animates rain and wetness.
  update(camera,dt,light=1){const c=state.cur,t=state.target,k=Math.min(1,dt*.35);for(const key of ['cover','sun','cloud','rain'])c[key]+=(t[key]-c[key])*k;
   c.wet=Math.max(0,Math.min(1,c.wet+(c.rain>.5?dt*.02:-dt*.004)));ATMOSPHERE.wetness.value=c.wet;
   rain.visible=c.rain>.05;if(rain.visible){rain.material.opacity=.35*c.rain;rain.material.color.setHex(0xaab4bc).multiplyScalar(.1+.9*light);state.fall+=dt;const p=camera.position;
    for(let i=0;i<N;i++){const b=i*3,z=((base[b+2]-state.fall*speed[i])%16+16)%16,x=p.x+base[b]+ATMOSPHERE.wind.value.x*z*.06,y=p.y+base[b+1]+ATMOSPHERE.wind.value.y*z*.06,zz=p.z-6+z;pos.set([x,y,zz,x-ATMOSPHERE.wind.value.x*.05,y-ATMOSPHERE.wind.value.y*.05,zz+.32],i*6);}
    g.attributes.position.needsUpdate=true;}
   return {cover:c.cover,sun:c.sun,cloud:c.cloud,mode:state.mode};},
  state:()=>({...state.cur,mode:state.mode,forced:state.forced}),
  dispose(){scene.remove(rain);g.dispose();rain.material.dispose();}
 };
}

// A small flock wheeling over the plot: each bird a body and two flapping wings.
export function createBirds(scene,centre,{count=7,seed=3}={}){
 const r=(()=>{let s=seed;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};})(),group=new THREE.Group();group.name='birds';
 const mat=new THREE.MeshStandardMaterial({color:0x26292b,roughness:.8,side:THREE.DoubleSide}),birds=[];
 const wingGeo=new THREE.BufferGeometry();wingGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,.09,0,.26,.03,0],3));wingGeo.computeVertexNormals();
 const bodyGeo=new THREE.CapsuleGeometry(.035,.14,3,6);bodyGeo.rotateZ(Math.PI/2);
 for(let i=0;i<count;i++){const b=new THREE.Group(),body=new THREE.Mesh(bodyGeo,mat),wl=new THREE.Mesh(wingGeo,mat),wr=new THREE.Mesh(wingGeo,mat);wl.rotation.x=0;wr.scale.x=-1;
  const wrapL=new THREE.Group(),wrapR=new THREE.Group();wrapL.add(wl);wrapR.add(wr);wl.position.set(.02,-.045,0);wr.position.set(.02,-.045,0);wl.rotation.z=Math.PI/2;wr.rotation.z=Math.PI/2;
  b.add(body,wrapL,wrapR);group.add(b);birds.push({b,wrapL,wrapR,ph:r()*6.3,rad:18+10*r(),h:22+12*r(),sp:.12+.05*r(),off:new THREE.Vector3((r()-.5)*4,(r()-.5)*4,(r()-.5)*2)});}
 scene.add(group);let t=0;
 return {group,update(dt,day=1){t+=dt;group.visible=day>.15;for(const k of birds){const a=t*k.sp+k.ph,x=centre[0]+Math.cos(a)*k.rad+k.off.x,y=centre[1]+Math.sin(a)*k.rad+k.off.y,z=k.h+Math.sin(t*.4+k.ph)*2;
   k.b.position.set(x,y,z);k.b.rotation.set(0,0,a+Math.PI/2+Math.PI/2);const flap=Math.sin(t*11+k.ph*3)*(Math.sin(t*.7+k.ph)>-.2?.9:.12);k.wrapL.rotation.x=flap;k.wrapR.rotation.x=-flap;}},
  dispose(){scene.remove(group);bodyGeo.dispose();wingGeo.dispose();mat.dispose();}};
}
// Leaves let go from the garden crowns, tumble and drift down, then recycle.
export function createFallingLeaves(scene,sources,map,{count=40,seed=9}={}){
 if(!sources.length)return {update(){},dispose(){}};
 const r=(()=>{let s=seed;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};})();
 const mat=new THREE.MeshStandardMaterial({map,alphaTest:.5,side:THREE.DoubleSide,roughness:.85,color:0xd8c8a0}),geo=new THREE.PlaneGeometry(.09,.09);
 const mesh=new THREE.InstancedMesh(geo,mat,count);mesh.name='falling-leaves';mesh.frustumCulled=false;mesh.castShadow=true;scene.add(mesh);
 const leaves=[];const spawn=L=>{const s=sources[Math.floor(r()*sources.length)];L.p=new THREE.Vector3(s[0]+(r()-.5)*5,s[1]+(r()-.5)*5,3+r()*3);L.v=.35+.3*r();L.ph=r()*6.3;L.spin=new THREE.Vector3(r()*3,r()*3,r()*3);};
 for(let i=0;i<count;i++){const L={};spawn(L);L.p.z=r()*5;leaves.push(L);}
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),one=new THREE.Vector3(1,1,1);let t=0;
 return {mesh,update(dt){t+=dt;const w=ATMOSPHERE.wind.value;leaves.forEach((L,i)=>{L.p.z-=L.v*dt;L.p.x+=(Math.sin(t*1.7+L.ph)*.4+w.x*.25)*dt;L.p.y+=(Math.cos(t*1.3+L.ph)*.4+w.y*.25)*dt;if(L.p.z<.02)spawn(L);
   e.set(L.spin.x*t,L.spin.y*t,L.spin.z*t);q.setFromEuler(e);m.compose(L.p,q,one);mesh.setMatrixAt(i,m);});mesh.instanceMatrix.needsUpdate=true;},
  dispose(){scene.remove(mesh);geo.dispose();mat.dispose();}};
}

// Screen-space sun shafts: occlusion mask = bright pixels (open sky), radially
// blurred toward the sun's screen position and added back, tinted, with falloff.
export const ShaftsShader={
 uniforms:{tDiffuse:{value:null},sunUV:{value:new THREE.Vector2(.5,.5)},strength:{value:0},tint:{value:new THREE.Color(1,.92,.78)},threshold:{value:3}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 sunUV;uniform float strength,threshold;uniform vec3 tint;varying vec2 vUv;
void main(){vec4 src=texture2D(tDiffuse,vUv);if(strength<=0.0){gl_FragColor=src;return;}
 vec2 d=(sunUV-vUv)/48.0;vec2 p=vUv;float acc=0.0,w=1.0;
 for(int i=0;i<48;i++){p+=d;vec3 c=texture2D(tDiffuse,clamp(p,0.0,1.0)).rgb;float l=dot(c,vec3(.2126,.7152,.0722));acc+=smoothstep(threshold,threshold*2.5,l)*w;w*=.965;}
 float fall=1.0-smoothstep(.0,.75,length((vUv-sunUV)*vec2(1.0,.8)));
 gl_FragColor=vec4(src.rgb+tint*acc/48.0*strength*fall,src.a);}`
};
export function createShaftsPass(){return new ShaderPass(ShaftsShader);}
