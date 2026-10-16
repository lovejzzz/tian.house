import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sceneFurnitureVolumes} from '../src/scene-furniture-volumes.js';
import {frameFurnitureVolume} from '../src/frame-furniture-volume.js';
import {furnitureActivityAudit} from '../src/furniture-activity-audit.js';
const recipe=JSON.parse(fs.readFileSync(new URL('../assets/recipes/volume/chair.json',import.meta.url)));
function chair(direction){
 const zones=[],scene={levels:[{id:'g',index:0}],objects:[{id:'chair',levelId:'g',x:10,y:20,parts:recipe.sourceLayout[direction]}]};
 const volumes=sceneFurnitureVolumes(scene,{squares:[]},{},{recipe,geometry:frameFurnitureVolume(recipe)},{cellSize:1,storeyHeight:3,onActivityZone:z=>zones.push(z)});
 return {zones,volumes};
}
test('chair rear allowance rotates with the rendered chair, including placement offset',()=>{
 const expected={S:[10.1,19.6],E:[10.8,20.1],N:[10.1,20.8],W:[9.6,20.1]};
 for(const facing of Object.keys(expected)){const {zones}=chair(facing);assert.equal(zones.length,1);zones[0].min.slice(0,2).forEach((v,i)=>assert.ok(Math.abs(v-expected[facing][i])<1e-8));}
});
test('activity audit catches an architectural blocker but excludes its own furniture and other floors',()=>{
 const {zones,volumes}=chair('S');
 const obstacle={id:'wall',levelId:'g',collision:[{polygon:[[10,19.5],[11,19.5],[11,19.9],[10,19.9]],minZ:0,maxZ:3}]};
 assert.deepEqual(furnitureActivityAudit(zones,volumes)[0].blockers,[]);
 assert.deepEqual(furnitureActivityAudit(zones,[...volumes,obstacle])[0].blockers,['wall']);
 assert.deepEqual(furnitureActivityAudit(zones,[{...obstacle,levelId:'upper'}])[0].blockers,[]);
});
test('clearance allows touching floor but detects a raised intrusion',()=>{
 const {zones}=chair('S'),floor={id:'floor',levelId:'g',collision:[{polygon:[[9,19],[12,19],[12,22],[9,22]],minZ:-.2,maxZ:0}]};
 assert.deepEqual(furnitureActivityAudit(zones,[floor])[0].blockers,[]);
 floor.collision[0].maxZ=.2;
 assert.deepEqual(furnitureActivityAudit(zones,[floor])[0].blockers,['floor']);
});

import {studioFurnitureVolume} from '../src/studio-furniture-volume.js';
test('centred west-facing trainer keeps its full exercise envelope inside the south wall',()=>{
 const r=JSON.parse(fs.readFileSync(new URL('../assets/recipes/volume/studio-functional-trainer.json',import.meta.url)));
 const scene={levels:[{id:'g',index:0}],objects:[{id:'trainer',levelId:'g',x:0,y:4,parts:r.sourceLayout.W}]};
 const wall={id:'south-wall',levelId:'g',collision:[{polygon:[[0,5.9],[3,5.9],[3,6.1],[0,6.1]],minZ:0,maxZ:3}]};
 function audit(recipe){const zones=[];sceneFurnitureVolumes(scene,{squares:[]},{},{recipe,geometry:studioFurnitureVolume(recipe)},{cellSize:1,storeyHeight:3,onActivityZone:z=>zones.push(z)});return furnitureActivityAudit(zones,[wall])[0];}
 assert.deepEqual(audit(r).blockers,[]);
 const old=structuredClone(r);old.placement.offset=[0,0];assert.deepEqual(audit(old).blockers,['south-wall']);
 assert.ok(Math.abs(audit(r).max[0]-audit(r).min[0]-1.2)<1e-8);
});
