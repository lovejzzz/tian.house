import test from 'node:test';import assert from 'node:assert/strict';
import {daylightCycle} from '../src/daylight-cycle.js';
test('game-clock cycle wraps days and transitions continuously across dawn and dusk',()=>{
 assert.deepEqual(daylightCycle(420),daylightCycle(1860));assert.deepEqual(daylightCycle(-60),daylightCycle(1380));
 assert.equal(daylightCycle(720).intensity,3.2);assert.equal(daylightCycle(0).intensity,.5);
 for(const t of [0,360,1080,1440]){const a=daylightCycle(t-.001),b=daylightCycle(t+.001);assert.ok(Math.abs(a.intensity-b.intensity)<.001);assert.ok(Math.abs(a.skyIntensity-b.skyIntensity)<.001);}
 assert.ok(daylightCycle(420).warmth>daylightCycle(720).warmth);assert.throws(()=>daylightCycle(NaN));
});
