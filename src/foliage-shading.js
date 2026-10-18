// Foliage shading extensions, chained onto any MeshStandard/Physical material.
// - Translucency: thin leaves transmit sun to the side facing away from it. A
//   wrapped back-lighting term (yellow-shifted, scaled by albedo) on the key light;
//   unshadowed by design, so its strength stays modest.
// - Leaf wind: whole-cluster sway that grows with height above ground plus a fast
//   per-vertex flutter, phased by world position so neighbours never move in step.
// Authored look development, not a measured BSDF or a fluid simulation.
export function installLeafTranslucency(material,strength=.5){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);
  shader.uniforms.leafTranslucency={value:strength};
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float leafTranslucency;')
   .replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
 #if NUM_DIR_LIGHTS > 0
 {
  vec3 leafL=directionalLights[ 0 ].direction;
  float leafBack=pow(max(0.0,-dot(normal,leafL)),1.5);
  float leafView=pow(max(0.0,dot(normalize(vViewPosition),-leafL)),4.0);
  reflectedLight.directDiffuse+=directionalLights[ 0 ].color*diffuseColor.rgb*vec3(1.05,1.0,.55)*leafTranslucency*(leafBack*.75+leafView*.6);
 }
 #endif`);
 };
 material.customProgramCacheKey=()=>key+'|leaf-translucency-v1';
 material.userData.leafTranslucency=strength;return material;
}
export function installLeafWind(material,time,amplitude=.05){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);
  shader.uniforms.leafWindTime=time;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float leafWindTime;').replace('#include <begin_vertex>',`#include <begin_vertex>
 #ifdef USE_INSTANCING
  vec3 leafRoot=instanceMatrix[3].xyz;
 #else
  vec3 leafRoot=vec3(0.0);
 #endif
 float leafPhase=leafRoot.x*.37+leafRoot.y*.53;
 float leafHeight=clamp(leafRoot.z/5.0,0.15,1.0);
 float leafFront=.35+1.1*smoothstep(-.2,1.0,.55*sin(dot(leafRoot.xy,vec2(.09,.035))-leafWindTime*1.25)+.45*sin(dot(leafRoot.xy,vec2(.021,.03))-leafWindTime*.47));
 vec3 leafGust=(vec3(sin(leafWindTime*1.1+leafPhase),cos(leafWindTime*.83+leafPhase*1.7),0.0)*.6+vec3(.8,.3,0.0)*leafFront)*leafFront;
 transformed+=leafGust*${amplitude.toFixed(4)}*leafHeight*6.0;
 transformed+=normal*sin(leafWindTime*7.3+leafPhase*4.1+position.x*9.0)*${(amplitude*.6).toFixed(4)};`);
 };
 material.customProgramCacheKey=()=>key+'|leaf-wind-v2-'+amplitude;return material;
}
