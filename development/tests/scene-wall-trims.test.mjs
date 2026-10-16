import test from 'node:test';import assert from 'node:assert/strict';
import {sceneWallTrims} from '../src/scene-wall-trims.js';
const assets=[{recipe:{surfaces:[{usage:'wall',tiles:['plaster'],trim:{height:.09,depth:.016,casingWidth:.06,material:{color:0xeeeeee,roughness:.8}}}]}}],scene={rooms:[{levelId:'g',rect:[0,0,4,4]}]},wall={id:'w',levelId:'g',materialId:'plaster',hostEndpoints:[[0,0],[4,0]],height:3,thickness:.2,base:0};
test('interior-only finish preserves full doorway and structural collision ownership',()=>{
 const volumes=sceneWallTrims(scene,[{...wall,opening:[1,0,2,2.1]}],assets,{cellSize:1});assert.equal(volumes.length,1);const m=volumes[0];assert.equal(m.hostWallId,'w');assert.deepEqual(m.collision,[]);
 assert.ok(m.vertices.every(p=>p[1]>=.1-1e-8));
 for(let i=0;i<m.indices.length;i+=3){const p=m.indices.slice(i,i+3).map(j=>m.vertices[j]),x=p.reduce((s,v)=>s+v[0],0)/3,z=p.reduce((s,v)=>s+v[2],0)/3;assert.ok(!(x>1+1e-8&&x<2-1e-8&&z<2.1-1e-8),'finish blocks aperture');}
});
test('full-height glazing has no floating baseboard; ordinary window keeps wall-foot finish',()=>{
 assert.equal(sceneWallTrims(scene,[{...wall,opening:[0,0,4,3]}],assets,{cellSize:1}).length,0);
 const m=sceneWallTrims(scene,[{...wall,opening:[1,1,2,2]}],assets,{cellSize:1})[0];assert.ok(m.vertices.some(p=>p[0]===4&&p[2]===.09));assert.ok(m.vertices.some(p=>Math.abs(p[2]-.94)<1e-8));
});
test('shared walls get separate interior faces and unconfigured materials remain untouched',()=>{
 const rooms={rooms:[...scene.rooms,{levelId:'g',rect:[0,-4,4,0]}]};assert.equal(sceneWallTrims(rooms,[wall],assets,{cellSize:1}).length,2);
 assert.equal(sceneWallTrims(scene,[{...wall,materialId:'other'}],assets,{cellSize:1}).length,0);
});
