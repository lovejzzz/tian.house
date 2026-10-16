import {sweepSolidBox} from '../src/convex-solid.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {LightProbeGenerator} from '../node_modules/three/examples/jsm/lights/LightProbeGenerator.js';
import {roomProbeRegions,createRoomBounceStudy} from '../src/room-bounce-study.js';
import {prismSolid} from '../src/prism-solid.js';
test('captured linear constant radiance integrates to pi times radiance, independent of normal',async()=>{
 const renderer={coordinateSystem:THREE.WebGLCoordinateSystem,isWebGLRenderer:true,readRenderTargetPixelsAsync:async(_t,_x,_y,_w,_h,data)=>{for(let i=0;i<data.length;i+=4)data.set([.2,.4,.6,1],i);}};
 const target=new THREE.WebGLCubeRenderTarget(16,{type:THREE.FloatType,colorSpace:THREE.LinearSRGBColorSpace});const probe=await LightProbeGenerator.fromCubeRenderTarget(renderer,target);
 for(const n of [[1,0,0],[0,0,1],[0,-1,0]]){const value=probe.sh.getIrradianceAt(new THREE.Vector3(...n),new THREE.Vector3());for(let i=0;i<3;i++)assert.ok(Math.abs(value.getComponent(i)-Math.PI*[.2,.4,.6][i])<.002);}target.dispose();
});
test('room probes are located away from furniture and masks retain calibrated room bounds',()=>{
 const source={levels:[{id:'g',index:0}],rooms:[{id:'r',levelId:'g',name:'Room',rect:[0,0,4,4]}]},metrics={cellSize:1,storeyHeight:3,wallHeight:3};
 const obstacle=prismSolid({polygon:[[1,1],[3,1],[3,3],[1,3]],minZ:0,maxZ:2});
 const r=roomProbeRegions(source,'g',metrics,[obstacle])[0];assert.notDeepEqual(r.position,[2,2,1.35]);assert.deepEqual(r.rect,[0,0,4,4]);
 assert.throws(()=>roomProbeRegions({...source,rooms:Array.from({length:5},()=>source.rooms[0])},'g',metrics,[]),/four rooms/);
});
test('large furnished rooms distribute distinct bounded samples, small rooms keep their own mask',()=>{
 const source={levels:[{id:'g',index:0}],rooms:[{id:'studio',name:'Studio',levelId:'g',rect:[0,0,10,6]},{id:'bath',name:'Bath',levelId:'g',rect:[10,0,12,3]}]};
 const probes=roomProbeRegions(source,'g',{cellSize:1,storeyHeight:3,wallHeight:2.7},[]);
 assert.equal(probes.length,10);const studio=probes.filter(p=>p.roomId==='studio');assert.equal(studio.length,8);
 assert.equal(new Set(probes.map(p=>p.position.join(','))).size,10);
 assert.ok(Math.max(...studio.map(p=>p.position[0]))-Math.min(...studio.map(p=>p.position[0]))>8);
 for(const p of probes){assert.ok(p.position[0]>p.rect[0]&&p.position[0]<p.rect[2]);assert.ok(p.position[1]>p.rect[1]&&p.position[1]<p.rect[3]);}
 assert.deepEqual(probes.at(-1).rect,[10,0,12,3]);
});

test('room irradiance samples animated vertices after skinning',async()=>{
 const {createRoomBounceStudy}=await import('../src/room-bounce-study.js');
 const renderer={};
 const study=createRoomBounceStudy({scene:new THREE.Scene(),renderer,onStatus(){}}),material=new THREE.MeshStandardMaterial();
 study.install({material});const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
 material.onBeforeCompile(shader);
 const assignment=shader.vertexShader.indexOf('vTianWorld =');
 assert.ok(assignment>shader.vertexShader.indexOf('#include <skinning_vertex>'));
 assert.ok(assignment>shader.vertexShader.indexOf('#include <project_vertex>'));
 assert.ok(shader.uniforms.tianProbeSH);
 study.dispose();
});

test('experimental visibility is absent from default shaders to preserve the full lighting budget',()=>{
 const study=createRoomBounceStudy({scene:new THREE.Scene(),renderer:{},onStatus(){}});
 for(const material of [new THREE.MeshStandardMaterial(),new THREE.MeshPhysicalMaterial({sheen:.35})]){
  study.install({material});const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
  assert.equal(shader.fragmentShader.includes('uniform sampler2D tianProbeDepth'),false);
  assert.match(shader.fragmentShader,/tianInside/);assert.match(shader.fragmentShader,/max\(tianWeight,0.000001\)/);material.dispose();
 }
 study.dispose();
});

test('upper probes can reach tall furniture tops without crossing the solid',()=>{
 const source={levels:[{id:'g',index:0}],rooms:[{id:'r',name:'Kitchen',levelId:'g',rect:[0,0,6,6]}]};
 const cabinet=prismSolid({polygon:[[2,2],[4,2],[4,4],[2,4]],minZ:0,maxZ:2});
 const probes=roomProbeRegions(source,'g',{cellSize:1,storeyHeight:3,wallHeight:2.7},[cabinet]);
 const upper=probes.filter(p=>p.position[2]>2.1);assert.ok(upper.length);
 assert.ok(upper.some(p=>!sweepSolidBox(cabinet,p.position,[3,3,2.04],[.001,.001,.001])));
 for(const p of probes)assert.equal(sweepSolidBox(cabinet,p.position,p.position,[.12,.12,.12]),null);
});

test('vertical sampling respects global shader capacity across four large rooms',()=>{
 const source={levels:[{id:'g',index:1}],rooms:Array.from({length:4},(_,i)=>({id:'r'+i,name:'Room',levelId:'g',rect:[i*10,0,i*10+10,6]}))};
 const probes=roomProbeRegions(source,'g',{cellSize:1,storeyHeight:3,wallHeight:2.7},[]);
 assert.equal(probes.length,16);for(const room of source.rooms){const samples=probes.filter(p=>p.roomId===room.id);assert.equal(samples.length,4);assert.equal(new Set(samples.map(p=>p.position[2])).size,2);assert.ok(samples.every(p=>p.position[2]>3&&p.position[2]<5.7));}
});
test('transport pass count is bounded and switching quality invalidates only when changed',()=>{
 const messages=[],study=createRoomBounceStudy({scene:new THREE.Scene(),renderer:{},onStatus:s=>messages.push(s)});
 assert.equal(study.stats().bounceCount,3);assert.equal(study.setBounceCount(3),false);assert.equal(messages.length,0);
 assert.equal(study.setBounceCount(4),true);assert.equal(study.stats().bounceCount,4);assert.match(messages[0],/retained/);
 for(const value of [0,1,5,NaN,2.5,'3'])assert.throws(()=>study.setBounceCount(value),/2–4/);
 assert.equal(study.stats().bounceCount,4);study.dispose();
 assert.throws(()=>createRoomBounceStudy({scene:new THREE.Scene(),renderer:{},onStatus(){},bounceCount:9}),/2–4/);
});
