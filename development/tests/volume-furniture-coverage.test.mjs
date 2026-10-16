import {readVolume} from './helpers/volume-delivery.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {resolveVolumeFurniture,sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';
const assets=['table','lamp'].map(name=>readVolume(name));
test('wrong multipart arrangement cannot silently match a source family',()=>{
 const parts=assets[0].recipe.sourceLayout.E,object={parts};assert.equal(resolveVolumeFurniture(object,assets).direction,'E');assert.match(resolveVolumeFurniture({parts:parts.map(p=>({...p,dx:p.dy,dy:0}))},assets).reason,/offsets/);
 assert.match(resolveVolumeFurniture(object,[...assets,assets[0]]).reason,/Ambiguous/);
});
test('unsupported furnishings and dependent fixtures report omissions without fabricated geometry',()=>{
 const scene={levels:[{id:'g',index:0}],objects:[{id:'counter',assetId:'tile:counter',levelId:'g',x:0,y:0,parts:[{tile:'counter',dx:0,dy:0}]},{id:'lamp',assetId:'tile:tian_detail_lamp',levelId:'g',hostId:'counter',x:0,y:0,parts:assets[1].recipe.sourceLayout.S}]},before=structuredClone(scene),issues=[];
 const volumes=sceneFurnitureVolumes(scene,{squares:[]},{counter:{IsTable:'',Surface:'34'}},assets,{cellSize:1,storeyHeight:3,onUnresolved:x=>issues.push(x)});
 assert.equal(volumes.length,0);assert.deepEqual(issues.map(i=>i.objectId),['counter','lamp']);assert.match(issues[0].reason,/No volume/);assert.match(issues[1].reason,/Supporting/);assert.deepEqual(scene,before);
});
