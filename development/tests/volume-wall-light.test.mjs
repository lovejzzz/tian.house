import test from 'node:test';import assert from 'node:assert/strict';
import {readVolume} from './helpers/volume-delivery.mjs';
import {wallLightVolume} from '../src/wall-light-volume.js';
import {sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';
for(const family of ['wall-strip','wall-sconce'])test(family+' uses actual wall face and thickness in both axes',()=>{
 const asset=readVolume(family);
 assert.deepEqual(asset.geometry,JSON.parse(JSON.stringify(wallLightVolume(asset.recipe))));
 for(const axis of ['N','W']){
  const tile=asset.recipe.migration[axis][0],props={[tile]:{TianMount:'wall',['attached'+axis]:''}},scene={levels:[{id:'up',index:1}],walls:[{id:'wall',levelId:'up',axis,x:10,y:20}],openings:[],objects:[{id:'light',x:10,y:20,levelId:'up',parts:asset.recipe.sourceLayout[axis],wallMounts:[{part:0,wallId:'wall'}]}]};
  const metrics={cellSize:2,storeyHeight:3,wallThickness:.4};
  const compile=()=>sceneFurnitureVolumes(scene,{squares:[]},props,[asset],metrics),parts=compile();
  assert.equal(parts.length,4);const normal=axis==='N'?1:0,origin=axis==='N'?40:20;
  assert.ok(Math.abs(Math.min(...parts.flatMap(p=>p.vertices.map(v=>v[normal])))-origin-.2)<1e-9);
  assert.ok(parts[0].light.position[normal]>Math.max(...parts.flatMap(p=>p.vertices.map(v=>v[normal]))));
  assert.ok(parts[0].light.target[normal]>parts[0].light.position[normal]);
  const before=parts[0].light;scene.walls[0].x+=3;scene.objects[0].x+=3;
  assert.equal(compile()[0].light.position[0]-before.position[0],6);
  scene.openings.push({id:'door',hostWallId:'wall'});assert.equal(compile().length,0);scene.openings=[];
  scene.walls=[];assert.equal(compile().length,0);
 }
});
test('wall light rejects degenerate diffuser geometry',()=>{
 const a=readVolume('wall-strip');assert.throws(()=>wallLightVolume({...a.recipe,parameters:{...a.recipe.parameters,depth:.01}}),/dimensions/);
});
