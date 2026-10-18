import {flatUniform} from './flat-uniform.js?v=1d7ffb1877ce';
import {captureProbeVisibility,probeVisibilityGLSL,probeVisibilityKey} from './probe-visibility.js?v=1d7ffb1877ce';
import {createCaptureShadowCache} from './capture-shadow-cache.js?v=1d7ffb1877ce';
import {createReflectionParallax} from './room-reflection-parallax.js?v=1d7ffb1877ce';
import {capturedSkyRadiance} from './captured-sky-radiance.js?v=1d7ffb1877ce';
import {writeProbeField,withProbeField} from './probe-field-state.js?v=1d7ffb1877ce';
import {prepareRenderPrograms,prepareCapturePrograms} from './prepare-render-programs.js?v=1d7ffb1877ce';
import {roomReflectionIndex} from './room-reflection-selection.js?v=1d7ffb1877ce';
import * as THREE from 'three';
import {SKY_SH} from './exterior-sky.js?v=1d7ffb1877ce';
import {ATMOSPHERE} from './atmosphere-effects.js?v=1d7ffb1877ce';
import {LightProbeGenerator} from '../node_modules/three/examples/jsm/lights/LightProbeGenerator.js';
import {sweepSolidBox} from './convex-solid.js?v=1d7ffb1877ce';
import {roomCells} from './room-footprint.js?v=1d7ffb1877ce';
import {captureCubeFace} from './cube-face-capture.js?v=1d7ffb1877ce';
const MAX_ROOMS=4, MAX=16;
// Bounded two-bounce radiance capture. Room masks limit cross-room leakage,
// Depth-tested local interpolation remains a coarse approximation, not full DDGI.
export function roomProbeRegions(source,levelId,metrics,solids){
 const rooms=source.rooms.filter(r=>r.levelId===levelId);if(rooms.length>MAX_ROOMS)throw Error('Room-probe study supports at most four rooms per floor');
 const z=source.levels.find(l=>l.id===levelId).index*metrics.storeyHeight;
 return rooms.flatMap((room,roomIndex)=>{
  if(room.polygon||room.cells)throw Error('Non-rectangular room probe masks are not implemented');
  const rect=room.rect.map(v=>v*metrics.cellSize);
  // A single eye-height layer cannot illuminate the top of a tall cupboard:
  // every probe-to-surface ray intersects the cupboard itself. Sample the upper
  // free volume as well, rather than weakening visibility or adding ambient fill.
  const budget=Math.floor(MAX/rooms.length)+(roomIndex<MAX%rooms.length?1:0);
  const desired=Math.min(4,Math.floor(budget/2),Math.max(1,Math.ceil((rect[2]-rect[0])*(rect[3]-rect[1])/12)));
  const layers=[Math.min(1.35,metrics.wallHeight*.45),metrics.wallHeight-.3];
  const positions=[];
  for(const height of layers){
   if(height<.15||positions.some(p=>Math.abs(p[2]-z-height)<.3))continue;
   const candidates=[[(rect[0]+rect[2])/2,(rect[1]+rect[3])/2,z+height],...roomCells(room).map(([x,y])=>[(x+.5)*metrics.cellSize,(y+.5)*metrics.cellSize,z+height])]
    .filter(p=>!solids.some(s=>sweepSolidBox(s,p,p,[.12,.12,.12])));
   if(!candidates.length)continue;
   const layer=[candidates[0]],distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
   while(layer.length<desired){
    let best=null,separation=0;
    for(const p of candidates){const d=Math.min(...layer.map(q=>distance(p,q)));if(d>separation){best=p;separation=d;}}
    if(!best||separation<.5)break;
    layer.push(best);
   }
   positions.push(...layer);
  }
  if(!positions.length)throw Error('No clear probe position in '+room.name);
  return positions.map((position,index)=>({id:room.id+':'+index,roomId:room.id,rect,minZ:z,maxZ:z+metrics.wallHeight,position}));
 });
}
export function createRoomBounceStudy({scene,renderer,onStatus,onCompileState=()=>{},depthVisibility=false,sharedSpotShadows=false,bounceCount=3}){
 const validateBounces=value=>{if(!Number.isInteger(value)||value<2||value>4)throw Error("Diffuse transport requires 2–4 passes");return value;};
 validateBounces(bounceCount);
 const enabled={value:0},count={value:0},coefficients={value:Array.from({length:MAX*9},()=>new THREE.Vector3())},bounds={value:Array.from({length:MAX},()=>new THREE.Vector4())},positions={value:Array.from({length:MAX},()=>new THREE.Vector3())},heights={value:Array.from({length:MAX},()=>new THREE.Vector2())};
 const dynamic={value:Array.from({length:MAX*9},()=>new THREE.Vector3())},dynamicEnabled={value:1};
 // Local (interior) eye adaptation: scales outgoing radiance of fragments inside a
 // captured room only. Exposure, not added light; 1 = off. See interior-exposure.js.
 const interiorGain={value:1};
 const field={count,coefficients,bounds,positions,heights};
 // Shader-side views of the probe arrays (see flat-uniform.js).
 const flat={dynamic:flatUniform(dynamic,3,renderer),coefficients:flatUniform(coefficients,3,renderer),bounds:flatUniform(bounds,4,renderer),heights:flatUniform(heights,2,renderer),positions:flatUniform(positions,3,renderer)};
 const depth={value:null},visibilityReady={value:0};let visibilityTarget=null,visibilityStale=true,visibilityKey=null;
 let generation=0,closed=false,busy=false,ready=false,capturesStarted=0,capturesCompleted=0;
 const reflectionBoxes=new WeakMap();
 const pmrem=new THREE.PMREMGenerator(renderer);let reflectionTargets=[],reflectionMaterials=[],reflectionsWanted=true;
 const reflectionEnabled=on=>{for(const material of reflectionMaterials)material.envMapIntensity=on&&reflectionsWanted?1:0;};
 const preparePrograms=(camera,toneMapping,compileState=onCompileState)=>prepareRenderPrograms(renderer,scene,camera,toneMapping,compileState);

 return {
  install(mesh){const material=mesh.material;if(material.transparent)return;const projection=createReflectionParallax();reflectionBoxes.set(material,projection);const previous=material.onBeforeCompile,key=material.customProgramCacheKey();material.onBeforeCompile=(shader,renderer)=>{previous.call(material,shader,renderer);
   Object.assign(shader.uniforms,{tianInteriorGain:interiorGain,tianDynamicSH:flat.dynamic,tianDynamicEnabled:dynamicEnabled,tianProbeDepth:depth,tianProbeVisibilityReady:visibilityReady,tianBounceEnabled:enabled,tianProbeCount:count,tianProbeSH:flat.coefficients,tianProbeBounds:flat.bounds,tianProbeHeights:flat.heights,tianProbePositions:flat.positions,tianSkySH:SKY_SH,tianGroundBounce:ATMOSPHERE.groundBounce});
   shader.vertexShader='varying vec3 vTianWorld;\n'+shader.vertexShader;
   // transformed includes morph targets and skinning; sample the posed world position.
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvTianWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
   shader.fragmentShader=(depthVisibility?probeVisibilityGLSL:'float tianVisibility(vec3 delta,int index){return 1.0;}\n')+`varying vec3 vTianWorld;\nuniform float tianInteriorGain;\nuniform float tianBounceEnabled;\nuniform int tianProbeCount;\nuniform vec3 tianProbeSH[144];\nuniform vec3 tianDynamicSH[144];\nuniform float tianDynamicEnabled;\nuniform vec4 tianProbeBounds[16];\nuniform vec2 tianProbeHeights[16];\nuniform vec3 tianProbePositions[16];\nuniform vec3 tianSkySH[9];\nuniform float tianSkyEnv;\nuniform vec3 tianGroundBounce;\n`+shader.fragmentShader;
   // SH already supplies diffuse bounce. The cubemap contributes specular only.
   const reflectionChunk=THREE.ShaderChunk.lights_fragment_maps.replace('iblIrradiance += getIBLIrradiance( geometryNormal );','');
   // Materials without their own room capture inherit the scene's sky environment.
   // Decided live per draw: room captures are assigned after first compile.
   shader.uniforms.tianSkyEnv={get value(){return material.envMap?0:1;}};
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_maps>',`${reflectionChunk}
    vec3 tianN = transformNormalByInverseViewMatrix(geometryNormal, viewMatrix);
    // Visibility bias follows geometry, not decorative normal/bump detail.
    // Otherwise a flat face on a room boundary flickers between lighting fields.
    vec3 tianGeometricN = transformNormalByInverseViewMatrix(nonPerturbedNormal, viewMatrix);
    vec3 tianP = vTianWorld + tianGeometricN * 0.025;
    vec3 tianIndirect = vec3(0.0); float tianWeight = 0.0; float tianBaseWeight = 0.0; bool tianInside = false;
    for (int i=0; i<16; i++) {
     if(i>=tianProbeCount) break;
     vec4 r=tianProbeBounds[i];vec2 h=tianProbeHeights[i];
     if(tianP.x>r.x && tianP.y>r.y && tianP.x<r.z && tianP.y<r.w && tianP.z>=h.x && tianP.z<=h.y){
      tianInside=true;vec3 c[9];for(int j=0;j<9;j++)c[j]=tianProbeSH[i*9+j]+tianDynamicSH[i*9+j]*tianDynamicEnabled;
      vec3 delta=tianP-tianProbePositions[i];
      // Prefer samples on the receiving side of the surface. Distance-only
      // blending lets a bright sample behind a cabinet dominate its dark front.
      // Wrapped cosine keeps interpolation continuous; this is not ray visibility.
      float distanceSquared=dot(delta,delta);
      vec3 toProbe=-delta*inversesqrt(max(distanceSquared,0.000001));
      float facing=0.5+0.5*dot(tianN,toProbe);
      float baseWeight=max(0.02,facing*facing)/(0.25+distanceSquared);
      tianBaseWeight += baseWeight;
      float weight=baseWeight*tianVisibility(delta,i);
      tianIndirect += max(vec3(0.0), shGetIrradianceAt(tianN,c))*weight;
      tianWeight += weight;
     }
    }
    if(tianInside) {
     // Published room transport replaces the unoccluded hemisphere fill indoors.
     // Outdoor fragments and the disabled-study comparison retain the fallback.
     #if ( NUM_HEMI_LIGHTS > 0 )
      #pragma unroll_loop_start
      for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
       irradiance -= getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal ) * tianBounceEnabled;
      }
      #pragma unroll_loop_end
     #endif
     // Do not amplify an almost-fully-occluded sample back to full brightness.
     // Relative confidence keeps the fade independent of probe distance/count.
     float tianConfidence=smoothstep(0.0,0.1,tianWeight/max(tianBaseWeight,0.000001));
     irradiance += tianIndirect/max(tianWeight,0.000001)*tianConfidence*tianBounceEnabled;
     #ifdef USE_ENVMAP
      // Sky reflections belong outdoors; rooms use their own capture/lamps.
      radiance *= 1.0-tianBounceEnabled*tianSkyEnv;
     #endif
    }
    if(!tianInside) {
     #ifdef USE_ENVMAP
      // Outdoors the sky environment supplies the diffuse fill the probes give inside;
      // a material's own room capture is the wrong world out here, so it is dropped.
      if(tianSkyEnv>0.5) iblIrradiance += getIBLIrradiance( geometryNormal );
      else radiance *= 0.0;
     #endif
     if(tianSkyEnv<0.5) irradiance += max( vec3( 0.0 ), shGetIrradianceAt( tianN, tianSkySH ) );
     // Sunlit ground bounces light back up onto walls, soffits and undersides.
     irradiance += tianGroundBounce*(0.5-0.5*tianN.z);
    }`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','if(tianInside)outgoingLight*=tianInteriorGain;\n#include <opaque_fragment>');
   projection.install(shader);
  };material.customProgramCacheKey=()=> key+'|tian-room-bounce-v16-ground-bounce|'+depthVisibility;material.needsUpdate=true;},
  invalidate({retain=false}={}){generation++;if(!retain){visibilityStale=true;ready=false;enabled.value=0;reflectionEnabled(false);}onStatus(retain?'Indirect light update pending · previous lighting retained':'Indirect study stale · Rebuild after geometry, door or lighting changes');},
  setReflectionsEnabled(on){reflectionsWanted=!!on;reflectionEnabled(enabled.value>0);},
  setDynamic(coeffs=[]){for(let i=0;i<dynamic.value.length;i++)dynamic.value[i].copy(coeffs[i]||new THREE.Vector3());},
  setEnabled(on){enabled.value=on&&ready?1:0;reflectionEnabled(on&&ready);},
  publishedVersion(){return capturesCompleted;},
  // Diagnostic: temporarily bypass depth visibility (1 restores the captured state).
  debugVisibility(on){visibilityReady.value=on&&depth.value?1:0;return visibilityReady.value;},
  setInteriorGain(value){interiorGain.value=Number.isFinite(value)&&value>0?value:1;},
  get interiorGain(){return interiorGain.value;},
  // Read-only diagnostics: probe positions and DC (ambient) SH term per probe.
  diagnostics(){return {enabled:enabled.value,count:count.value,probes:Array.from({length:count.value},(_,i)=>({position:positions.value[i].toArray(),dc:coefficients.value[i*9].toArray(),bounds:bounds.value[i].toArray(),heights:heights.value[i].toArray()}))};},
  async capture(regions,meshes){
   if(regions.length>MAX)throw Error('Spatial probe budget exceeded');
   if(busy)throw Error('Probe capture already running');busy=true;capturesStarted++;const hadReady=ready,compileState=pending=>onCompileState(pending&&!hadReady);const token=++generation;const started=performance.now();const timings={compile:0,visibility:0,faces:0,readback:0,reflection:0};let captureProgramsReady=false;
   const passCount=bounceCount;
   const target=new THREE.WebGLCubeRenderTarget(32,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,colorSpace:THREE.LinearSRGBColorSpace});const cube=new THREE.CubeCamera(.05,100,target);let results=[],previousPass=null;const nextReflections=[];let committed=false;let nextVisibility=null;const nextVisibilityKey=probeVisibilityKey(regions,meshes);let reusedVisibility=false;const captureShadows=createCaptureShadowCache(renderer,scene);
   try{
    // DFG LUT is used by standard materials too; count it alongside every shadow.
    if(depthVisibility){let shadows=0,spots=false;scene.traverse(o=>{if(o.isLight&&o.castShadow){if(sharedSpotShadows&&o.isSpotLight)spots=true;else shadows++;}});if(spots)shadows++;if(shadows+5>renderer.capabilities.maxTextures)throw Error('Probe visibility requires a shared shadow atlas: fragment sampler budget exceeded');}
    reusedVisibility=depthVisibility&&!visibilityStale&&visibilityTarget!==null&&visibilityKey===nextVisibilityKey;
    const visibilityStarted=performance.now();
    nextVisibility=depthVisibility?(reusedVisibility?visibilityTarget:captureProbeVisibility(renderer,scene,regions)):null;timings.visibility+=performance.now()-visibilityStarted;
    for(let pass=0;pass<passCount;pass++){
    results=[];
    for(const region of regions){
     if(closed||token!==generation)return false;
     onStatus('Capturing bounce '+(pass+1)+'/'+passCount+' · room '+region.id);cube.position.set(...region.position);cube.updateMatrixWorld(true);
     // Camera translation and SH uniforms do not change shader topology. The
     // capture excludes the same live objects throughout all passes.
     if(!captureProgramsReady){const t=performance.now();const fading=meshes.filter(m=>(m.userData.wallCutaway||m.userData.furnitureCutaway)&&m.material.transparent).map(m=>m.material);for(const m of fading)m.transparent=false;let warm;try{warm=prepareCapturePrograms(renderer,scene,cube.children[0],THREE.NoToneMapping,compileState,cube.renderTarget);}finally{for(const m of fading)m.transparent=true;}await warm;timings.compile+=performance.now()-t;captureProgramsReady=true;}
     if(closed||token!==generation)return false;
     for(let face=0;face<6;face++){
     if(closed||token!==generation)return false;
     const skyRadiance=capturedSkyRadiance(scene);
     const background=scene.background,clear=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha(),tone=renderer.toneMapping,previousDynamic=dynamicEnabled.value,previousEnabled=enabled.value,previousDepth=depth.value,previousVisibilityReady=visibilityReady.value,hidden=[],ambient=[];
     const receivers=meshes.map(m=>[m,m.receiveShadow]);
     const materials=meshes.map(m=>[m.material,m.material.colorWrite,m.material.depthWrite,m.material.emissiveIntensity,m.material.color.clone(),m.material.envMapIntensity,m.material.opacity,m.material.transparent]);
     scene.traverse(o=>{if(o.isHemisphereLight||o.isLight&&o.userData.indirectCaptureExclude){ambient.push([o,o.intensity]);o.intensity=0;}else if(o.userData.indirectCaptureExclude){hidden.push([o,o.visible]);o.visible=false;}}); /* excluded lights go dark rather than invisible: the light count stays that of the view, so the capture reuses its programs */
     try{
      dynamicEnabled.value=0;depth.value=nextVisibility?.texture??null;visibilityReady.value=depthVisibility?1:0;enabled.value=pass===0?0:1;scene.background=skyRadiance;renderer.setClearColor(skyRadiance,1);renderer.toneMapping=THREE.NoToneMapping;
      for(const mesh of meshes){mesh.receiveShadow=mesh.userData.originalReceiveShadow??mesh.receiveShadow;mesh.material.color.set(mesh.userData.baseColor);if(mesh.userData.roofId){mesh.material.colorWrite=true;mesh.material.depthWrite=true;}const cutaway=mesh.userData.wallCutaway||mesh.userData.furnitureCutaway;if(cutaway){mesh.material.opacity=cutaway.opacity;mesh.material.depthWrite=cutaway.depthWrite;mesh.material.transparent=false;/* light bounces off the physical wall; also keeps the capture on the warmed opaque program */}mesh.material.emissiveIntensity=0;mesh.material.envMapIntensity=0;}
      // Captured radiance must be physical: interior eye adaptation is a display
      // transform and would otherwise feed back into the next adaptation step.
      const drawFace=()=>{const t=performance.now(),gain=interiorGain.value;interiorGain.value=1;try{return captureShadows.run(()=>captureCubeFace(renderer,scene,cube,face));}finally{interiorGain.value=gain;timings.faces+=performance.now()-t;}};
      if(previousPass)withProbeField(field,regions,previousPass,drawFace);else drawFace();
     }finally{dynamicEnabled.value=previousDynamic;for(const [mesh,receive] of receivers)mesh.receiveShadow=receive;depth.value=previousDepth;visibilityReady.value=previousVisibilityReady;enabled.value=previousEnabled;scene.background=background;renderer.setClearColor(clear,alpha);renderer.toneMapping=tone;for(const [o,v]of hidden)o.visible=v;for(const [o,intensity]of ambient)o.intensity=intensity;for(const [m,c,d,e,color,env,opacity,transparent]of materials){m.colorWrite=c;m.depthWrite=d;m.emissiveIntensity=e;m.color.copy(color);m.envMapIntensity=env;m.opacity=opacity;m.transparent=transparent;}}
     // Normal gameplay can render between each cube direction.
     await new Promise(resolve=>requestAnimationFrame(resolve));
     }
     if(closed||token!==generation)return false;
     const readStarted=performance.now();const probe=await LightProbeGenerator.fromCubeRenderTarget(renderer,target);timings.readback+=performance.now()-readStarted;if(closed||token!==generation)return false;results.push(probe.sh.coefficients.map(c=>c.clone()));if(pass===passCount-1){const t=performance.now();nextReflections.push(pmrem.fromCubemap(target.texture));timings.reflection+=performance.now()-t;}
    }
    if(closed||token!==generation)return false;
    previousPass=results;
    }
    writeProbeField(field,regions,results);if(visibilityTarget!==nextVisibility)visibilityTarget?.dispose();visibilityTarget=nextVisibility;visibilityKey=nextVisibilityKey;visibilityStale=false;depth.value=nextVisibility?.texture??null;visibilityReady.value=depthVisibility?1:0;ready=true;enabled.value=1;
    // Compile the materials' new reflection variants before publishing them: set the
    // new maps, start the parallel compile, put the previous maps back and keep
    // drawing with those until the programs are ready (publishing first made the
    // view link each variant synchronously, a ten-second stutter on every recapture).
    {const swaps=[];for(const mesh of meshes){mesh.geometry.computeBoundingBox();const center=mesh.geometry.boundingBox.getCenter(new THREE.Vector3());mesh.localToWorld(center);const index=roomReflectionIndex(center.toArray(),regions);if(index<0)continue;swaps.push([mesh.material,mesh.material.envMap,mesh.material.envMapIntensity]);mesh.material.envMap=nextReflections[index].texture;mesh.material.envMapIntensity=reflectionsWanted?1:0;}
     let warm;try{warm=prepareRenderPrograms(renderer,scene,cube.children[0],renderer.toneMapping,()=>{});}finally{for(const [material,envMap,intensity] of swaps){material.envMap=envMap;material.envMapIntensity=intensity;}}
     await warm;if(closed||token!==generation){for(const target of nextReflections)target.dispose();return false;}}
    // Atomically publish diffuse and specular data from the same capture generation.
    reflectionMaterials=[];
    for(const mesh of meshes){
     mesh.geometry.computeBoundingBox();const center=mesh.geometry.boundingBox.getCenter(new THREE.Vector3());mesh.localToWorld(center);
     const index=roomReflectionIndex(center.toArray(),regions);reflectionBoxes.get(mesh.material)?.setRegion(index<0?null:regions[index]);if(index<0)continue;
     mesh.material.envMap=nextReflections[index].texture;mesh.material.envMapIntensity=reflectionsWanted?1:0;mesh.material.needsUpdate=true;reflectionMaterials.push(mesh.material);
    }
    for(const old of reflectionTargets)old.dispose();reflectionTargets=nextReflections;committed=true;
    const publishStarted=performance.now();await preparePrograms(cube.children[0],renderer.toneMapping,compileState);timings.compile+=performance.now()-publishStarted;if(closed||token!==generation)return false;
    capturesCompleted++;onStatus(`Spatial ${passCount}-pass bounce study · ${regions.length} probes · ${(performance.now()-started).toFixed(0)} ms capture · stages ms ${Object.entries(timings).map(([name,ms])=>name+' '+ms.toFixed(0)).join(', ')} · occluded sky + distance/normal-blended diffuse + box-projected local reflections · ${depthVisibility?'experimental depth visibility ('+(reusedVisibility?'reused':'rebuilt')+')':'depth visibility disabled: shadow atlas required'} · no furniture reflection parallax`);return true;
   }finally{captureShadows.dispose();if(!committed){for(const t of nextReflections)t.dispose();if(nextVisibility!==visibilityTarget)nextVisibility?.dispose();}target.dispose();busy=false;}
  },
  setBounceCount(value){validateBounces(value);if(value===bounceCount)return false;bounceCount=value;generation++;onStatus("Transport quality changed · previous lighting retained until recaptured");return true;},
  stats(){return {capturesStarted,capturesCompleted,busy,bounceCount};},
  dispose(){closed=true;generation++;enabled.value=0;for(const t of reflectionTargets)t.dispose();reflectionTargets=[];visibilityTarget?.dispose();visibilityTarget=null;pmrem.dispose();}
 };
}
