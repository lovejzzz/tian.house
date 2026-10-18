import * as THREE from 'three';
// Exterior weathering for the house envelope, evaluated per fragment in world
// space (no UVs, continuous across meshes). Only fragments outside every room are
// touched, so interiors stay clean. On vertical faces:
// - rain run-off streaks hanging from the wall head (coping drip line), long and
//   thin, strongest just below the top and fading down the wall;
// - splash-back: soil-darkened, slightly green algae band at the foot, with a
//   ragged noisy upper edge;
// - broad uneven weathering of the render (sun/rain exposure differences).
// On horizontal faces (paving): grime and damp collecting along the wall base.
// Authored look development; amounts are tuned by eye, not measured.
export const WEATHERING_DEFAULTS={streak:.5,splash:.55,patch:.14,kerb:.4};
const NOISE=`
float tfwHash(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
float tfwNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(tfwHash(i),tfwHash(i+vec2(1,0)),f.x),mix(tfwHash(i+vec2(0,1)),tfwHash(i+vec2(1,1)),f.x),f.y);}
float tfwFbm(vec2 p){return .55*tfwNoise(p)+.3*tfwNoise(p*2.1+7.)+.15*tfwNoise(p*4.3+13.);}
`;
export function roomBoxes(rooms,{cellSize,storeyHeight},levels=[]){
 const index=new Map(levels.map(l=>[l.id,l.index??0]));
 return rooms.slice(0,16).map(r=>{const z=(index.get(r.levelId)??0)*storeyHeight;return [r.rect[0]*cellSize,r.rect[1]*cellSize,r.rect[2]*cellSize,r.rect[3]*cellSize,z,z+storeyHeight];});
}
// detail: optional {map,normalMap} of a scanned render (white_plaster_rough_02):
// on outdoor vertical faces it adds real trowel relief and tonal variation, mapped
// in world metres along the wall and up (no UV channel, no extra varyings).
export function installFacadeWeathering(material,boxes,{wallTop=3,ground=0,detail=null,detailRepeat=1.2,...amounts}={}){
 const a={...WEATHERING_DEFAULTS,...amounts},previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 const rects=Array.from({length:16},(_,i)=>boxes[i]?new THREE.Vector4(boxes[i][0],boxes[i][1],boxes[i][2],boxes[i][3]):new THREE.Vector4());
 const heights=Array.from({length:16},(_,i)=>boxes[i]?new THREE.Vector2(boxes[i][4],boxes[i][5]):new THREE.Vector2());
 material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);
  Object.assign(shader.uniforms,{tfwRects:{value:rects},tfwHeights:{value:heights},tfwCount:{value:Math.min(16,boxes.length)},tfwAmount:{value:new THREE.Vector4(a.streak,a.splash,a.patch,a.kerb)},tfwLevels:{value:new THREE.Vector2(ground,wallTop)}});
  if(detail){shader.defines??={};shader.defines.TFW_DETAIL='';Object.assign(shader.uniforms,{tfwDetailMap:{value:detail.map},tfwDetailNormal:{value:detail.normalMap},tfwDetailScale:{value:1/detailRepeat}});}
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTfwWorld;').replace('#include <project_vertex>',`#include <project_vertex>
 vec4 tfwWP=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
  tfwWP=instanceMatrix*tfwWP;
 #endif
 vTfwWorld=(modelMatrix*tfwWP).xyz;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vTfwWorld;uniform vec4 tfwRects[16];uniform vec2 tfwHeights[16];uniform int tfwCount;uniform vec4 tfwAmount;uniform vec2 tfwLevels;${NOISE}
float tfwInside(vec3 p){for(int i=0;i<16;i++){if(i>=tfwCount)break;vec4 r=tfwRects[i];vec2 h=tfwHeights[i];if(p.x>r.x&&p.y>r.y&&p.x<r.z&&p.y<r.w&&p.z>=h.x&&p.z<=h.y)return 1.0;}return 0.0;}
#ifdef TFW_DETAIL
uniform sampler2D tfwDetailMap;uniform sampler2D tfwDetailNormal;uniform float tfwDetailScale;
#endif
float tfwToRoom(vec3 p){float d=1e5;for(int i=0;i<16;i++){if(i>=tfwCount)break;vec4 r=tfwRects[i];vec2 q=max(max(r.xy-p.xy,p.xy-r.zw),vec2(0.0));d=min(d,length(q));}return d;}`)
   .replace('#include <map_fragment>',`#include <map_fragment>
 float tfwRough=0.0;float tfwDetailOn=0.0;vec2 tfwDetailUV=vec2(0.0);vec3 tfwDetailT=vec3(1.0,0.0,0.0);
 {
  vec3 tfwP=vTfwWorld;vec3 tfwN=normalize(cross(dFdx(tfwP),dFdy(tfwP)));if(dot(tfwN,cameraPosition-tfwP)<0.0)tfwN=-tfwN;
  vec3 tfwProbe=tfwP+tfwN*0.06;
  if(tfwInside(tfwProbe)<0.5){
   vec3 tfwP2=mod(tfwP,512.0);
   if(abs(tfwN.z)<0.5){
    float along=abs(tfwN.x)>abs(tfwN.y)?tfwP2.y:tfwP2.x,z=tfwP.z-tfwLevels.x,top=tfwLevels.y-tfwLevels.x;
    // Each streak hangs from the head of the wall to its own random length.
    float lane=floor(along*9.0),reach=.8+2.6*tfwHash(vec2(lane,7.0)),drop=1.0-smoothstep(reach*.55,reach,top-z);
    float streaks=smoothstep(.4,.8,tfwNoise(vec2(along*9.0,z*.25)))*(.5+.5*tfwNoise(vec2(along*31.0,z*2.3)));
    float streak=tfwAmount.x*streaks*drop*(.55+.45*tfwFbm(vec2(along*.7,z*.2)));
    float edge=.5+.25*tfwFbm(vec2(along*2.3,1.7))+.08*tfwNoise(vec2(along*19.0,3.0));
    float splash=tfwAmount.y*(1.0-smoothstep(edge*.55,edge,z))*(.55+.45*tfwFbm(vec2(along*3.1,z*4.0)));
    float tfwPatch=tfwAmount.z*(tfwFbm(vec2(along*.35,z*.5))-.5);
    diffuseColor.rgb*=mix(vec3(1.0),vec3(.74,.73,.69),streak);
    diffuseColor.rgb*=mix(vec3(1.0),vec3(.62,.66,.52),splash);
    diffuseColor.rgb*=1.0+tfwPatch;
    #ifdef TFW_DETAIL
     tfwDetailOn=1.0;tfwDetailUV=vec2(along,z)*tfwDetailScale;tfwDetailT=abs(tfwN.x)>abs(tfwN.y)?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0);
     // Tone from the scan, normalised round its mean so the paint colour holds.
     vec3 tfwScan=texture2D(tfwDetailMap,tfwDetailUV).rgb,tfwMean=textureLod(tfwDetailMap,vec2(.5),12.0).rgb;
     diffuseColor.rgb*=mix(1.0,clamp(dot(tfwScan,vec3(.2126,.7152,.0722))/max(dot(tfwMean,vec3(.2126,.7152,.0722)),.05),.6,1.4),.6);
    #endif
    tfwRough=streak*.5+splash;
   }else if(tfwN.z>0.5){
    float d=tfwToRoom(tfwP);
    float kerb=tfwAmount.w*(1.0-smoothstep(.04,.38+.15*tfwNoise(tfwP2.xy*3.0),d))*(.5+.5*tfwFbm(tfwP2.xy*2.7));
    float grime=.12*smoothstep(.55,.9,tfwFbm(tfwP2.xy*.9));
    diffuseColor.rgb*=mix(vec3(1.0),vec3(.66,.66,.6),kerb)*(1.0-grime);
    tfwRough=kerb*.6;
   }
  }
 }`)
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 #ifdef TFW_DETAIL
 if(tfwDetailOn>0.5){
  vec3 tfwNm=texture2D(tfwDetailNormal,tfwDetailUV).xyz*2.0-1.0;
  vec3 tfwTv=normalize((viewMatrix*vec4(tfwDetailT,0.0)).xyz),tfwBv=normalize((viewMatrix*vec4(0.0,0.0,1.0,0.0)).xyz);
  float tfwNs=1.4*(1.0-smoothstep(8.0,28.0,length(vViewPosition))); // past ~20 m the 1 mm relief only aliases into speckle
  normal=normalize(tfwTv*tfwNm.x*tfwNs+tfwBv*tfwNm.y*tfwNs+normal*tfwNm.z);
 }
 #endif`)
   .replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
 roughnessFactor=clamp(roughnessFactor+tfwRough*.15,0.0,1.0);`);
 };
 material.customProgramCacheKey=()=>key+'|facade-weathering-v3'+(detail?'-detail':'');material.userData.facadeWeathering=a;return material;
}

// Grass ground (plot lawn and meadow): no real sward is one green. Broad drier,
// yellower patches and darker lush ones at metre scales, plus fine mottling.
export function installGroundVariation(material,{dry=.45,lush=.18}={}){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);
  shader.uniforms.tgvAmount={value:new THREE.Vector2(dry,lush)};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTgvWorld;').replace('#include <project_vertex>',`#include <project_vertex>
 vec4 tgvWP=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
  tgvWP=instanceMatrix*tgvWP;
 #endif
 vTgvWorld=(modelMatrix*tgvWP).xyz;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vTgvWorld;uniform vec2 tgvAmount;'+NOISE.replace(/tfw/g,'tgv'))
   .replace('#include <map_fragment>',`#include <map_fragment>
 {
  vec2 tgvP=mod(vTgvWorld.xy,512.0);
  float tgvDry=smoothstep(.4,.68,tgvFbm(tgvP*.22))*tgvAmount.x,tgvLush=smoothstep(.5,.75,tgvFbm(tgvP*.5+17.0))*tgvAmount.y;
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.35,1.12,.55),tgvDry);
  diffuseColor.rgb*=1.0-tgvLush;
  diffuseColor.rgb*=.92+.16*tgvNoise(tgvP*3.7);
 }`);
 };
 material.customProgramCacheKey=()=>key+'|ground-variation-v1';return material;
}

// Glazing: a flat 30% tint is not glass. Opacity follows Schlick's Fresnel so
// panes are clear face-on and mirror the sky/garden at grazing angles; the
// environment reflection is boosted to read through the blend.
export function installGlassFresnel(material,{faceOn=.22,grazing=.92,reflection=2.6}={}){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();material.envMapIntensity=reflection;material.roughness=Math.min(material.roughness,.06);
 material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);
  shader.uniforms.tgfAlpha={value:new THREE.Vector2(faceOn,grazing)};
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec2 tgfAlpha;').replace('#include <opaque_fragment>',`float tgfCos=abs(dot(normalize(vViewPosition),normalize(normal)));
 float tgfF=pow(1.0-tgfCos,5.0);
 diffuseColor.a=mix(tgfAlpha.x,tgfAlpha.y,tgfF)*clamp(opacity/.3,0.0,1.0);
#include <opaque_fragment>`);
 };
 material.customProgramCacheKey=()=>key+'|glass-fresnel-v1';return material;
}
