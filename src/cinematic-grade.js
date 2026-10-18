import * as THREE from 'three';
import {ShaderPass} from '../node_modules/three/examples/jsm/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from '../node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js';
// Camera-side finishing in scene-linear HDR, before the AgX output transform:
// warm daylight white balance, a gentle filmic contrast around mid grey (log
// space, so it never clips), restrained saturation lift, cool shadows / warm
// highlights split tone, lens vignette and fine luminance-weighted grain.
// Values are authored look development, not a calibrated camera profile.
export const GRADE_DEFAULTS={whiteBalance:[1.035,1,.955],contrast:1.12,saturation:1.1,split:.035,vignette:.2,grain:.018,bloom:.05,bloomRadius:.3,bloomThreshold:25};

export const GradeShader={
 uniforms:{tDiffuse:{value:null},whiteBalance:{value:new THREE.Vector3(...GRADE_DEFAULTS.whiteBalance)},contrast:{value:GRADE_DEFAULTS.contrast},saturation:{value:GRADE_DEFAULTS.saturation},split:{value:GRADE_DEFAULTS.split},vignette:{value:GRADE_DEFAULTS.vignette},grain:{value:GRADE_DEFAULTS.grain},time:{value:0},aspect:{value:1}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`
uniform sampler2D tDiffuse;uniform vec3 whiteBalance;uniform float contrast,saturation,split,vignette,grain,time,aspect;varying vec2 vUv;
float gradeHash(vec2 p){p=fract(p*vec2(443.897,441.423));p+=dot(p,p.yx+19.19);return fract((p.x+p.y)*p.x);}
void main(){
 vec4 src=texture2D(tDiffuse,vUv);vec3 c=max(src.rgb,vec3(0.0))*whiteBalance;
 float lum=dot(c,vec3(.2126,.7152,.0722));
 // Filmic contrast in log2 around 18% grey, then rescale colour by the luminance change.
 float l2=log2(max(lum,1e-5)/.18)*contrast,graded=.18*exp2(l2);c*=graded/max(lum,1e-5);lum=graded;
 c=mix(vec3(lum),c,saturation);
 float t=smoothstep(.02,.6,lum);c*=mix(vec3(1.0-split*.6,1.0,1.0+split),vec3(1.0+split,1.0,1.0-split*.8),t);
 vec2 d=(vUv-.5)*vec2(aspect,1.0);c*=1.0-vignette*smoothstep(.35,1.05,length(d)*1.25);
 float n=gradeHash(vUv*vec2(1931.,1213.)+fract(time*7.31))-.5;c*=1.0+grain*n*(1.0-smoothstep(.2,2.,lum)*.6);
 gl_FragColor=vec4(c,src.a);
}`
};

// One NaN/Inf pixel (a degenerate normal on a sub-pixel leaf, say) would be smeared
// over the whole frame by the bloom blur; replace such pixels and clamp extremes.
export const SanitizeShader={uniforms:{tDiffuse:{value:null}},vertexShader:GradeShader.vertexShader,
 fragmentShader:'uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);if(any(isnan(c))||any(isinf(c)))c=vec4(0.0,0.0,0.0,1.0);gl_FragColor=vec4(min(c.rgb,vec3(256.0)),c.a);}'};
export function createCinematicGrade(width=1,height=1,options={}){
 const o={...GRADE_DEFAULTS,...options};
 const grade=new ShaderPass(GradeShader),sanitize=new ShaderPass(SanitizeShader);
 Object.assign(grade.uniforms.contrast,{value:o.contrast});grade.uniforms.saturation.value=o.saturation;grade.uniforms.split.value=o.split;grade.uniforms.vignette.value=o.vignette;grade.uniforms.grain.value=o.grain;grade.uniforms.whiteBalance.value.set(...o.whiteBalance);
 const bloom=new UnrealBloomPass(new THREE.Vector2(width,height),o.bloom,o.bloomRadius,o.bloomThreshold);
 return {grade,bloom,sanitize,
  resize(w,h){bloom.setSize(w,h);grade.uniforms.aspect.value=w/Math.max(1,h);},
  tick(dt){grade.uniforms.time.value+=dt;},
  set(values={}){for(const [k,v] of Object.entries(values)){if(k==='bloom')bloom.strength=v;else if(k==='whiteBalance')grade.uniforms.whiteBalance.value.set(...v);else if(grade.uniforms[k])grade.uniforms[k].value=v;}},
  dispose(){grade.dispose?.();sanitize.dispose?.();bloom.dispose();}};
}
