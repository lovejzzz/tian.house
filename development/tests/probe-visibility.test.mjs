import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {captureProbeVisibility,probeVisibilityGLSL} from '../src/probe-visibility.js';
test('depth capture restores live renderer and excluded objects even on render failure',()=>{
 for(const fail of [false,true]){
  const scene=new THREE.Scene(),background=new THREE.Color('red');scene.background=background;const actor=new THREE.Group();actor.userData.indirectCaptureExclude=true;scene.add(actor);
  const glass=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial({opacity:.3})),wall=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial({opacity:.03}));wall.userData.wallCutaway={opacity:1};scene.add(glass,wall);
  let target=null,viewport=new THREE.Vector4(1,2,3,4),scissor=viewport.clone(),test=false,color=new THREE.Color('blue'),alpha=.5,renders=0;
  const renderer={shadowMap:{enabled:true},xr:{enabled:true},getRenderTarget:()=>target,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>test,getClearColor:c=>c.copy(color),getClearAlpha:()=>alpha,setRenderTarget:t=>target=t,setViewport:(...v)=>{viewport=v[0]?.isVector4?v[0].clone():new THREE.Vector4(...v);},setScissor:(...v)=>{scissor=v[0]?.isVector4?v[0].clone():new THREE.Vector4(...v);},setScissorTest:v=>test=v,setClearColor:(c,a)=>{color=c.clone();alpha=a;},clear(){},render(){renders++;assert.equal(actor.visible,false);assert.equal(glass.visible,false);assert.equal(wall.visible,true);assert.equal(renderer.shadowMap.enabled,false);if(fail)throw Error('render failed');}};
  let result;if(fail)assert.throws(()=>captureProbeVisibility(renderer,scene,[{position:[1,1,1]}]),/render failed/);else{result=captureProbeVisibility(renderer,scene,[{position:[1,1,1]},{position:[2,1,1]}]);assert.equal(renders,12);assert.equal(result.width,192);assert.equal(result.height,512);result.dispose();}
  assert.equal(target,null);assert.deepEqual(viewport.toArray(),[1,2,3,4]);assert.deepEqual(scissor.toArray(),[1,2,3,4]);assert.equal(test,false);assert.equal(color.getHex(),0x0000ff);assert.equal(alpha,.5);assert.equal(scene.background,background);assert.equal(scene.overrideMaterial,null);assert.equal(actor.visible,true);assert.equal(glass.visible,true);assert.equal(renderer.shadowMap.enabled,true);assert.equal(renderer.xr.enabled,true);glass.geometry.dispose();wall.geometry.dispose();glass.material.dispose();wall.material.dispose();
 }
});
test('visibility cubemap faces agree with Three WebGL projection',()=>{
 const cube=new THREE.CubeCamera(.03,100);cube.coordinateSystem=THREE.WebGLCoordinateSystem;cube.updateCoordinateSystem();cube.updateMatrixWorld(true);
 const directions=[[2,.2,.4],[-2,.2,.4],[.2,2,.4],[.2,-2,.4],[.2,.4,2],[.2,.4,-2]],uv=[[.4,.45],[.6,.45],[.55,.6],[.55,.4],[.55,.4],[.45,.4]];
 directions.forEach((d,i)=>{const p=new THREE.Vector3(...d).project(cube.children[i]);assert.ok(Math.abs((p.x+1)/2-uv[i][0])<1e-6);assert.ok(Math.abs((p.y+1)/2-uv[i][1])<1e-6);});
 assert.match(probeVisibilityGLSL,/vec2\(-delta.x,-delta.z\)/);assert.match(probeVisibilityGLSL,/vec2\(-delta.x,delta.z\)/);
});
test('depth reuse key tracks geometry and probe changes but ignores light and material colour',async()=>{
 const {probeVisibilityKey}=await import('../src/probe-visibility.js');
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()),regions=[{position:[0,0,1],rect:[0,0,4,4],minZ:0,maxZ:3}];
 const original=probeVisibilityKey(regions,[mesh]);mesh.material.color.set('red');assert.equal(probeVisibilityKey(regions,[mesh]),original);
 mesh.rotation.z=.5;const rotated=probeVisibilityKey(regions,[mesh]);assert.notEqual(rotated,original);
 mesh.geometry.attributes.position.needsUpdate=true;assert.notEqual(probeVisibilityKey(regions,[mesh]),rotated);
 const edited=probeVisibilityKey(regions,[mesh]);regions[0].position[2]=2;assert.notEqual(probeVisibilityKey(regions,[mesh]),edited);mesh.geometry.dispose();mesh.material.dispose();
});
