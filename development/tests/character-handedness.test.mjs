import test from 'node:test';import assert from 'node:assert/strict';
import {Matrix4,Vector3,OrthographicCamera} from 'three';
import {characterModelTransform,CHARACTER_ELEVATION} from '../src/character-projection.js';
test('browser camera and actor preserve the source world-view handedness in all eight directions',()=>{
 const c=new OrthographicCamera(-1,1,1,-1,.01,100),h=10*Math.cos(CHARACTER_ELEVATION)/Math.SQRT2;c.position.set(h,.5+10*Math.sin(CHARACTER_ELEVATION),h);c.lookAt(0,.5,0);c.updateMatrixWorld(true);
 for(let i=0;i<8;i++){const angle=i*Math.PI/4,t=characterModelTransform(angle),actor=new Matrix4().makeRotationY(t.yaw).multiply(new Matrix4().makeScale(1,1,t.scaleZ));
  const source=new Matrix4().makeRotationX(Math.PI/6).multiply(new Matrix4().makeRotationY(3*Math.PI/4)).multiply(new Matrix4().makeScale(-1,1,1)).multiply(new Matrix4().makeRotationY(angle+3*Math.PI/2));
  const target=c.matrixWorldInverse.clone().multiply(actor);const origin=new Vector3().applyMatrix4(target);
  // Translation/scale are calibrated separately. Compare directions, including
  // depth and an asymmetric vector; a visually plausible mirrored pose fails.
  for(const v of [[1,0,0],[0,1,0],[0,0,1],[.31,.73,-.21]]){const a=new Vector3(...v).applyMatrix4(source),b=new Vector3(...v).applyMatrix4(target).sub(origin);assert.ok(a.distanceTo(b)<1e-12,`angle ${angle}, vector ${v}`);}
  assert.ok(actor.determinant()<0);
 }
});
