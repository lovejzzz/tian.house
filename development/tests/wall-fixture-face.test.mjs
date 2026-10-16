import test from 'node:test';import assert from 'node:assert/strict';
import {flipWallFixtureSide} from '../src/scene-wall-mounts.js';import {sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';import {readVolume} from './helpers/volume-delivery.mjs';
const props={mirror_N:{TianMount:'wall',attachedN:'',Facing:'N',TianWallSide:'opposite',TianVariantFamily:'mirror'},mirror_S:{TianMount:'wall',attachedN:'',Facing:'S',TianWallSide:'front',TianVariantFamily:'mirror'}};
const catalog=Object.keys(props).map(tile=>({id:tile,source:tile,category:'furniture',parts:[{tile,dx:0,dy:0}]}));
test('flip wall face reuses verified sprites, preserves identity and reflects mesh and collision together',()=>{
 const asset=structuredClone(readVolume('detail-bath-mirror'));asset.recipe.migration={N:['mirror_N'],S:['mirror_S']};asset.recipe.sourceLayout={N:catalog[0].parts,S:catalog[1].parts};
 const scene={levels:[{id:'g',index:0}],rooms:[],openings:[],walls:[{id:'wall',axis:'N',x:0,y:0,levelId:'g'}],objects:[{id:'mirror',assetId:'mirror_N',x:0,y:0,levelId:'g',parts:catalog[0].parts,wallMounts:[{part:0,wallId:'wall'}]}]};
 const flipped=flipWallFixtureSide(scene,{ids:['mirror']},catalog,props);assert.equal(flipped.objects[0].id,'mirror');assert.equal(flipped.objects[0].assetId,'mirror_S');assert.deepEqual(flipped.objects[0].wallMounts,scene.objects[0].wallMounts);
 const render=s=>sceneFurnitureVolumes(s,{squares:[]},props,[asset],{cellSize:1,storeyHeight:3,wallThickness:.2});
 for(const v of render(scene)){assert.ok(v.vertices.every(p=>p[1]<0));for(const c of v.collision)assert.ok(c.bounds.max[1]<0);}
 for(const v of render(flipped)){assert.ok(v.vertices.every(p=>p[1]>0));for(const c of v.collision)assert.ok(c.bounds.min[1]>0);}
 assert.deepEqual(flipWallFixtureSide(flipped,{ids:['mirror']},catalog,props),scene);
 assert.throws(()=>flipWallFixtureSide(scene,{ids:['mirror']},catalog.slice(0,1),props),/no verified/);
});
