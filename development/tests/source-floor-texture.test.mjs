import test from 'node:test';import assert from 'node:assert/strict';
import {sourceFloorPixels} from '../src/source-floor-texture.js';
const width=20,height=20,region={x:0,y:0,w:20,h:20,ox:0,oy:0},plane={originX:10,originY:2,halfWidth:8,halfHeight:4};
test('inverse-isometric sampling keeps source color and directional variation deterministically',()=>{
 const pixels=new Uint8Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++)pixels.set([x*10,y*10,91,255],(y*width+x)*4);
 const args={pixels,width,height,region,plane,size:4},a=sourceFloorPixels(args);assert.deepEqual(a,sourceFloorPixels(args));
 assert.equal(a.color[0],100);assert.equal(a.color[1],30);assert.equal(a.color[2],91);assert.ok(a.color[12]>a.color[0]);assert.ok(a.color[48]<a.color[0]);
});
test('transparent atlas pixels cannot silently become black floor material',()=>{
 assert.throws(()=>sourceFloorPixels({pixels:new Uint8Array(1600),width,height,region,plane,size:4}),/transparent holes/);
});
