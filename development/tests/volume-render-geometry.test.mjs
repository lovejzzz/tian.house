import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {volumeRenderGeometry} from '../src/volume-render-geometry.js';import {studioFurnitureVolume} from '../src/studio-furniture-volume.js';
test('soft corners share continuous unit normals while hard surfaces preserve faceting and geometry',()=>{
 const recipe=JSON.parse(fs.readFileSync(new URL('../assets/recipes/volume/studio-sectional-sofa.json',import.meta.url))),part=studioFurnitureVolume(recipe).parts.find(p=>p.id==='seat:0');assert.equal(part.smoothNormals,true);
 const smooth=volumeRenderGeometry(part),hard=volumeRenderGeometry({...part,smoothNormals:false});assert.deepEqual(smooth.attributes.position.array,hard.attributes.position.array);
 const normal=smooth.attributes.normal,positions=smooth.attributes.position,byPosition=new Map();for(let i=0;i<normal.count;i++){const n=[normal.getX(i),normal.getY(i),normal.getZ(i)],key=[positions.getX(i),positions.getY(i),positions.getZ(i)].join(',');assert.ok(Math.abs(Math.hypot(...n)-1)<1e-5);if(byPosition.has(key))assert.deepEqual(n,byPosition.get(key));else byPosition.set(key,n);}assert.notDeepEqual(normal.array,hard.attributes.normal.array);smooth.dispose();hard.dispose();
});

test('local mesh coordinates preserve sub-millimetre details at map coordinates',()=>{
 const vertices=[[8000,11400,0],[8000.0002,11400,0],[8000,11400.0003,0]],volume={vertices,indices:[0,1,2]};
 const g=volumeRenderGeometry(volume,{localOrigin:true});
 assert.deepEqual(g.userData.origin,vertices[0]);
 assert.ok(Math.abs(g.attributes.position.getX(1)-.0002)<1e-9);
 assert.ok(Math.abs(g.attributes.position.getY(2)-.0003)<1e-9);
 assert.equal(g.attributes.normal.getZ(0),1);
 assert.deepEqual(vertices[0],[8000,11400,0]);g.dispose();
});
