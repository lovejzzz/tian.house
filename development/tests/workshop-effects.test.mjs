import test from 'node:test';
import assert from 'node:assert/strict';
import {effectProgress} from '../src/workshop-effects.js';
test('queued frames older than placement keep dust radii and opacity valid',()=>{
 for(const now of [0,500,1000,1325,1650,5000]){const t=effectProgress(now,1000,650);assert.ok(3+t*6>=3);assert.ok(2+t*3>=2);assert.ok((1-t)*.3>=0&&(1-t)*.3<=.3);}
 assert.equal(effectProgress(0,1000,650),0);assert.equal(effectProgress(1325,1000,650),.5);assert.equal(effectProgress(5000,1000,650),1);
});
