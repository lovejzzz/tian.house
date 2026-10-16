import test from 'node:test';
import assert from 'node:assert/strict';
import {drawGroundThumbnail} from '../src/ground-thumbnail.js';
test('raised thumbnail clips the top, retains the base and draws the real exposed side',()=>{
 const paths=[],images=[];let path;
 const c={save(){},restore(){},translate(){},scale(){},beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},closePath(){},clip(){paths.push({clip:path});},fill(){paths.push({face:path});},drawImage(...args){images.push(args);}};
 const canvas={width:112,height:82,getContext:()=>c};
 const props={road:{solidfloor:''},cut:{solidfloor:'',TianGroundHeight:'6',TianGroundPolygon:'[[0,0],[1,0],[0,1]]',TianGroundBase:'road'}};
 const image={},region={page:'shared',x:0,y:0,w:96,h:160,ox:-16,oy:-24,scale:1},source={atlas:{regions:{road:region,cut:region}},page:()=>image};
 assert.equal(drawGroundThumbnail({parts:[{tile:'cut',dx:0,dy:0}]},canvas,source,props),true);
 assert.equal(images.length,2);assert.deepEqual(paths.find(p=>p.clip).clip,[[0,-6],[32,10],[-32,10]]);
 assert.equal(paths.filter(p=>p.face).length,1);
 assert.equal(drawGroundThumbnail({parts:[{tile:'road',dx:0,dy:0}]},canvas,source,props),false);
});
