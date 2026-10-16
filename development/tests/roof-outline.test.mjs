import test from 'node:test';import assert from 'node:assert/strict';
import {roomRoofOutline} from '../src/roof-outline.js';import {polygonSignedArea,pointInPolygon} from '../src/polygon-footprint.js';
test('manual roof outline follows merged L-shaped room, preserving courtyard and bridging interior floor void',()=>{
 const cells=[];for(let x=10;x<16;x++)for(let y=20;y<26;y++)if(x<13||y<23)cells.push([x,y]);const room={rect:[10,20,16,26],cells,floorOpenings:[{id:'void',rect:[11,21,12,22]}]},outline=roomRoofOutline(room);
 assert.equal(Math.abs(polygonSignedArea(outline)),27);assert.equal(pointInPolygon([14,24],outline),false);assert.equal(pointInPolygon([11.5,21.5],outline),true);assert.equal(outline.length,6);
});
test('rectangular and diagonal outlines retain geometry; multi-loop footprints reject clearly',()=>{
 assert.deepEqual(roomRoofOutline({rect:[1,2,4,6]}),[[1,2],[4,2],[4,6],[1,6]]);
 const polygon=[[1,1],[5,1],[5,4],[4,5],[1,5]];assert.deepEqual(roomRoofOutline({polygon}),polygon);
 const cells=[];for(let x=0;x<3;x++)for(let y=0;y<3;y++)if(x!==1||y!==1)cells.push([x,y]);assert.throws(()=>roomRoofOutline({rect:[0,0,3,3],cells}),/internal holes/);
});
