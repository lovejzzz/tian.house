import test from 'node:test';
import assert from 'node:assert/strict';
import {frameEmission} from '../src/television-frame.js';
test('television light preserves absolute dark, white and primary energy',()=>{
 assert.deepEqual(frameEmission([0,0,0,255]),[0,0,0]);assert.deepEqual(frameEmission([255,255,255,255]),[1,1,1]);assert.deepEqual(frameEmission([255,0,0,255,0,0,255,255]),[.5,0,.5]);
 const grey=frameEmission([128,128,128,255]);assert.ok(Math.abs(grey[0]-.21586)<.00001);assert.equal(grey[0],grey[2]);
});
test('screen letterbox black is not normalized out',()=>{assert.deepEqual(frameEmission([255,255,255,255,0,0,0,255]),[.5,.5,.5]);assert.throws(()=>frameEmission([]));});
