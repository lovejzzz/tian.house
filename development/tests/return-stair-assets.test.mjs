import test from 'node:test';import assert from 'node:assert/strict';
import {installCafeAssets} from '../src/cafe-assets.js';import {returnStairPath} from '../src/return-stair-path.js';import {returnStairEntry} from '../src/scene-return-stairs.js';
test('every delivered return-stair part agrees with runtime height and gradient in all variants',()=>{
 const props={},atlas={regions:{}};installCafeAssets(props,atlas);
 for(const run of [2,3])for(const handedness of ['left','right'])for(const axis of ['W','N','E','S']){
  const path=returnStairPath({x:0,y:0,z:0,run,handedness,axis}),entry=returnStairEntry(axis,handedness,run);
  for(const [i,c] of path.cells.entries()){const part=entry.parts[i],p=props[part.tile];assert.ok(atlas.regions[part.tile]);assert.deepEqual([part.dx,part.dy],[c.x,c.y]);assert.equal(Number(p.TianStairLow),c.low);assert.equal(Number(p.TianStairHigh),c.high);assert.equal(p.TianStairGradient,[c.gx,c.gy].join(','));}
 }
});
import {ReturnStairPath} from '../src/return-stair-path.js';
test('guard segments coincide with blocked path edges and leave turn/entry/exit edges open',()=>{
 const props={},atlas={regions:{}};installCafeAssets(props,atlas);
 for(const run of [2,3])for(const handedness of ['left','right'])for(const axis of ['W','N','E','S']){
  const route=new ReturnStairPath({x:0,y:0,z:0,run,handedness,axis}),entry=returnStairEntry(axis,handedness,run);
  for(const [i,c]of route.cells.entries())for(const guard of JSON.parse(props[entry.parts[i].tile].TianStairGuards)){
   const mx=(guard.a[0]+guard.b[0])/2,my=(guard.a[1]+guard.b[1])/2;
   const nx=c.x+.5+2*(mx-.5),ny=c.y+.5+2*(my-.5);
   assert.equal(route.transition(c.x+.5,c.y+.5,nx,ny,0)?.allowed,false);
   for(const p of [guard.a,guard.b])assert.ok(Math.abs(p[2]/96-(c.low+(c.high-c.low)*(.5+c.gx*(p[0]-.5)+c.gy*(p[1]-.5))))<1e-9);
  }
 }
});
