import {Color} from 'three';
// A uniform overcast sky approximation. HemisphereLight colours are linear
// irradiance; a constant incident radiance L integrates to pi*L. Geometry in
// the cube capture determines which directions can see the exterior.
// This is not a measured sky dome or directional atmosphere model.
export function capturedSkyRadiance(scene){
 const radiance=new Color(0,0,0);
 scene.traverse(o=>{if(o.isHemisphereLight&&o.visible)radiance.add(o.color.clone().multiplyScalar(o.intensity/Math.PI));});
 return radiance;
}
