import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';import {captureCubeFace} from '../src/cube-face-capture.js';
test('each face uses CubeCamera orientation and restores target, XR and mipmaps even on failure',()=>{
 const cube=new THREE.CubeCamera(.05,100,new THREE.WebGLCubeRenderTarget(32)),original={name:'screen'},calls=[];
 const renderer={coordinateSystem:THREE.WebGLCoordinateSystem,xr:{enabled:true},target:original,face:3,mip:2,getRenderTarget(){return this.target;},getActiveCubeFace(){return this.face;},getActiveMipmapLevel(){return this.mip;},setRenderTarget(t,f,m){this.target=t;this.face=f;this.mip=m;},render(s,c){calls.push(c);assert.equal(this.xr.enabled,false);if(this.fail)throw Error('render failed');}};
 for(let i=0;i<6;i++){captureCubeFace(renderer,{},cube,i);assert.equal(calls[i],cube.children[i]);assert.equal(renderer.target,original);assert.equal(renderer.face,3);assert.equal(renderer.mip,2);assert.equal(renderer.xr.enabled,true);}
 renderer.fail=true;assert.throws(()=>captureCubeFace(renderer,{},cube,0),/render failed/);assert.equal(renderer.target,original);assert.equal(renderer.xr.enabled,true);
 assert.throws(()=>captureCubeFace(renderer,{},cube,6),/Invalid/);cube.renderTarget.dispose();
});
