import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {wallLightVolume} from '../src/wall-light-volume.js';
import {sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';
const recipe=JSON.parse(fs.readFileSync(new URL('../assets/recipes/volume/directional-wall-light.json',import.meta.url))),asset={recipe,geometry:wallLightVolume(recipe)};
test('explicit wall face transforms fixture, collision and light toward the selected side',()=>{
 for(const [direction,axis,side] of [['S','N','front'],['N','N','opposite'],['E','W','front'],['W','W','opposite']]){
  const tile=recipe.migration[direction][0],coordinate=axis==='N'?1:0,sign=side==='front'?1:-1;
  const scene={levels:[{id:'g',index:0}],rooms:[{id:'r',levelId:'g',rect:[0,0,3,3]}],walls:[{id:'wall',levelId:'g',axis,x:3,y:3}],openings:[],objects:[{id:'lamp',levelId:'g',x:3,y:3,parts:recipe.sourceLayout[direction],wallMounts:[{part:0,wallId:'wall'}]}]};
  const properties={[tile]:{TianMount:'wall',TianWallSide:side,['attached'+axis]:''}};
  const meshes=sceneFurnitureVolumes(scene,{squares:[]},properties,asset,{cellSize:1,storeyHeight:3}),light=meshes.find(m=>m.light)?.light;
  assert.equal(meshes.length,asset.geometry.parts.length);assert.ok(meshes.flatMap(m=>m.vertices).every(v=>(v[coordinate]-3)*sign>0));assert.ok((light.target[coordinate]-light.position[coordinate])*sign>0);assert.ok(meshes.every(m=>m.collision.length===1));
  scene.walls[0].x+=2;scene.objects[0].x+=2;const moved=sceneFurnitureVolumes(scene,{squares:[]},properties,asset,{cellSize:1,storeyHeight:3});assert.ok(Math.abs(moved[0].light.position[0]-light.position[0]-2)<1e-9);
 }
});
