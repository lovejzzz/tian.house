// World-space surface variation for every volume surface: real materials are never
// one flat colour. Soft tonal mottling (two scales) and uneven sheen (roughness)
// are evaluated from world position, so they are continuous across meshes, need
// no UVs, and do not tile. Authored look development, not measured reflectance.
export const SURFACE_VARIATION_DEFAULTS={tone:.1,roughness:.28,scale:1};
export function surfaceVariationProfile(definition={},{opacity=1,metalness=0,emissive=false}={}){
 const v=definition.variation;
 if(v===false||opacity<1||emissive)return null;
 const base={...SURFACE_VARIATION_DEFAULTS,...(metalness>.5?{tone:.045,roughness:.3}:{}),...(v||{})};
 for(const key of ['tone','roughness','scale'])if(!Number.isFinite(base[key])||base[key]<0||base[key]>(key==='scale'?10:1))throw Error('Invalid surface variation '+key);
 return base;
}
const NOISE=`
float tsvHash3(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float tsvNoise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(tsvHash3(i),tsvHash3(i+vec3(1,0,0)),f.x),mix(tsvHash3(i+vec3(0,1,0)),tsvHash3(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(tsvHash3(i+vec3(0,0,1)),tsvHash3(i+vec3(1,0,1)),f.x),mix(tsvHash3(i+vec3(0,1,1)),tsvHash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
export function installSurfaceVariation(material,profile){
 if(!profile)return material;
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.userData.tianSurfaceVariation=profile;
 material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);
  shader.uniforms.tsvVariation={value:[profile.tone,profile.roughness,profile.scale]};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTsvWorld;')
   .replace('#include <project_vertex>',`#include <project_vertex>
 vec4 tsvWP=vec4(transformed,1.0);
 #ifdef USE_BATCHING
  tsvWP=batchingMatrix*tsvWP;
 #endif
 #ifdef USE_INSTANCING
  tsvWP=instanceMatrix*tsvWP;
 #endif
 vTsvWorld=(modelMatrix*tsvWP).xyz;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vTsvWorld;\nuniform vec3 tsvVariation;'+NOISE)
   .replace('#include <map_fragment>',`#include <map_fragment>
 // Offset keeps large world coordinates out of the hash's precision range.
 vec3 tsvP=mod(vTsvWorld,512.)*tsvVariation.z;
 float tsvBroad=tsvNoise3(tsvP*1.7),tsvMid=tsvNoise3(tsvP*7.3+11.),tsvFine=tsvNoise3(tsvP*31.+5.);
 diffuseColor.rgb*=1.+tsvVariation.x*(1.2*(tsvBroad-.5)+.6*(tsvMid-.5)+.25*(tsvFine-.5));`)
   .replace('#include <metalnessmap_fragment>',`
 roughnessFactor=clamp(roughnessFactor*(1.+tsvVariation.y*(1.4*(tsvMid-.5)+.8*(tsvFine-.5))),.02,1.);
#include <metalnessmap_fragment>`);
 };
 material.customProgramCacheKey=()=>key+'|tian-surface-variation-v1';
 return material;
}
