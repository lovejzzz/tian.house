import * as THREE from 'three';
const SIZE=32,MAX=16,FAR=100;
// Direction mapping matches Three's WebGL CubeCamera, including face-local Y.
export const probeVisibilityGLSL=`
uniform sampler2D tianProbeDepth;
uniform float tianProbeVisibilityReady;
float tianDepthWeight(vec2 pixel,float face,int index,float distance){
 vec2 cell=clamp(pixel,vec2(0.0),vec2(31.0));
 float depth=texture2D(tianProbeDepth,vec2((face*32.0+cell.x+0.5)/192.0,(float(index)*32.0+cell.y+0.5)/512.0)).r;
 float width=max(0.06,distance*0.055);
 return 1.0-smoothstep(depth+0.04,depth+0.04+width,distance);
}
float tianVisibility(vec3 delta,int index){
 if(tianProbeVisibilityReady<0.5)return 1.0;
 vec3 a=abs(delta);vec2 uv;float face;float major;
 if(a.x>=a.y&&a.x>=a.z){major=a.x;if(delta.x>0.0){face=0.0;uv=vec2(delta.z,delta.y);}else{face=1.0;uv=vec2(-delta.z,delta.y);}}
 else if(a.y>=a.z){major=a.y;if(delta.y>0.0){face=2.0;uv=vec2(-delta.x,-delta.z);}else{face=3.0;uv=vec2(-delta.x,delta.z);}}
 else{major=a.z;if(delta.z>0.0){face=4.0;uv=vec2(-delta.x,delta.y);}else{face=5.0;uv=vec2(delta.x,delta.y);}}
 uv=clamp(-uv/max(major,0.0001)*0.5+0.5,vec2(0.5/32.0),vec2(1.0-0.5/32.0));
 // Interpolate visibility, never depth: averaging near/far depths invents
 // geometry behind furniture silhouettes. Each tap stays in its cube face.
 vec2 pixel=uv*32.0-0.5,base=floor(pixel),blend=fract(pixel);
 float distance=length(delta);
 return mix(mix(tianDepthWeight(base,face,index,distance),tianDepthWeight(base+vec2(1.0,0.0),face,index,distance),blend.x),
            mix(tianDepthWeight(base+vec2(0.0,1.0),face,index,distance),tianDepthWeight(base+vec2(1.0,1.0),face,index,distance),blend.x),blend.y);
}`;
export function captureProbeVisibility(renderer,scene,regions){
 const target=new THREE.WebGLRenderTarget(SIZE*6,SIZE*MAX,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});
 const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,vertexShader:'varying vec3 world; void main(){vec4 p=modelMatrix*vec4(position,1.0);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',fragmentShader:'varying vec3 world;void main(){float d=length(world-cameraPosition);gl_FragColor=vec4(d,d,d,1.0);}'});
 const cube=new THREE.CubeCamera(.03,FAR);cube.coordinateSystem=THREE.WebGLCoordinateSystem;cube.updateCoordinateSystem();
 const previous={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),color:renderer.getClearColor(new THREE.Color()),alpha:renderer.getClearAlpha(),background:scene.background,override:scene.overrideMaterial,shadow:renderer.shadowMap.enabled,xr:renderer.xr.enabled},hidden=[];
 try{
  scene.traverse(o=>{const cut=o.userData.wallCutaway||o.userData.furnitureCutaway;const opacity=cut?.opacity??o.material?.opacity;if(o.userData.indirectCaptureExclude||(o.isMesh&&opacity<1)){hidden.push([o,o.visible]);o.visible=false;}});
  scene.background=null;scene.overrideMaterial=material;renderer.shadowMap.enabled=false;renderer.xr.enabled=false;renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.setClearColor(new THREE.Color(FAR,FAR,FAR),1);renderer.clear();target.scissorTest=true;
  regions.forEach((region,index)=>{cube.position.fromArray(region.position);cube.updateMatrixWorld(true);for(let face=0;face<6;face++){target.viewport.set(face*SIZE,index*SIZE,SIZE,SIZE);target.scissor.set(face*SIZE,index*SIZE,SIZE,SIZE);renderer.setRenderTarget(target);renderer.render(scene,cube.children[face]);}});
  return target;
 }catch(error){target.dispose();throw error;}
 finally{for(const [o,v]of hidden)o.visible=v;scene.background=previous.background;scene.overrideMaterial=previous.override;renderer.shadowMap.enabled=previous.shadow;renderer.xr.enabled=previous.xr;renderer.setRenderTarget(previous.target,previous.face,previous.mip);renderer.setViewport(previous.viewport);renderer.setScissor(previous.scissor);renderer.setScissorTest(previous.scissorTest);renderer.setClearColor(previous.color,previous.alpha);material.dispose();}
}

// Depth is independent of lamp colour/time, but not of door transforms, mesh
// replacement, edited vertex buffers, or probe relocation.
export function probeVisibilityKey(regions,meshes){
 return JSON.stringify([regions.map(r=>[r.position,r.rect,r.minZ,r.maxZ]),meshes.map(mesh=>{
  mesh.updateWorldMatrix(true,false);
  return [mesh.uuid,mesh.geometry.uuid,mesh.geometry.attributes.position?.version,mesh.geometry.index?.version,mesh.matrixWorld.elements];
 })]);
}
