import * as THREE from 'three';
// Box-projected local reflections: an approximation of the authored room shell,
// not ray tracing of furniture, doors, or moving objects. No additional samplers.
export function boxProjectedDirection(point,direction,region){
 const min=[region.rect[0],region.rect[1],region.minZ],max=[region.rect[2],region.rect[3],region.maxZ];
 if(point.some((v,i)=>v<min[i]||v>max[i]))return [...direction];
 const distances=direction.map((v,i)=>Math.abs(v)<1e-6?Infinity:((v>0?max[i]:min[i])-point[i])/v);
 const distance=Math.min(...distances);
 if(!Number.isFinite(distance))return [...direction];
 return point.map((v,i)=>v+direction[i]*distance-region.position[i]);
}
export function createReflectionParallax(){
 const enabled={value:0},minimum={value:new THREE.Vector3()},maximum={value:new THREE.Vector3()},origin={value:new THREE.Vector3()};
 return {
  setRegion(region){enabled.value=region?1:0;if(!region)return;minimum.value.set(region.rect[0],region.rect[1],region.minZ);maximum.value.set(region.rect[2],region.rect[3],region.maxZ);origin.value.fromArray(region.position);},
  install(shader){
   Object.assign(shader.uniforms,{tianReflectionBoxEnabled:enabled,tianReflectionBoxMin:minimum,tianReflectionBoxMax:maximum,tianReflectionOrigin:origin});
   const helper=`
    uniform float tianReflectionBoxEnabled;
    uniform vec3 tianReflectionBoxMin, tianReflectionBoxMax, tianReflectionOrigin;
    vec3 tianBoxReflection(vec3 direction) {
     if(tianReflectionBoxEnabled<0.5 || any(lessThan(vTianWorld,tianReflectionBoxMin)) || any(greaterThan(vTianWorld,tianReflectionBoxMax))) return direction;
     vec3 farPlane=mix(tianReflectionBoxMin,tianReflectionBoxMax,step(vec3(0.0),direction));
     vec3 safeDirection=mix(vec3(-1.0),vec3(1.0),step(vec3(0.0),direction))*max(abs(direction),vec3(1e-6));
     vec3 distances=(farPlane-vTianWorld)/safeDirection;
     // Parallel rays must not select a zero-distance plane at room boundaries.
     distances=mix(distances,vec3(1e20),lessThan(abs(direction),vec3(1e-6)));
     float distanceToBox=min(distances.x,min(distances.y,distances.z));
     return vTianWorld+direction*distanceToBox-tianReflectionOrigin;
    }
   `;
   if(!THREE.ShaderChunk.envmap_physical_pars_fragment.includes('envMapRotation * reflectVec, roughness'))throw Error('Review box reflection hook for this Three version');
   const chunk=THREE.ShaderChunk.envmap_physical_pars_fragment.replace('envMapRotation * reflectVec, roughness','envMapRotation * tianBoxReflection(reflectVec), roughness').replace('envMapRotation * retroVec, roughness','envMapRotation * tianBoxReflection(retroVec), roughness');
   shader.fragmentShader=shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>',helper+chunk);
  }
 };
}
