import fs from 'node:fs';import assert from 'node:assert/strict';
import {advanceBlendRaw,animationWeight} from '../src/animation-blend.js';
const rows=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').slice(1);
const state={in:0,out:1},observations=[];
for(const row of rows){const [direction,step,dt,raw,weight]=row.split('\t');
 state[direction]=advanceBlendRaw(state[direction],direction==='in',Math.fround(+dt));
 const result=animationWeight(state[direction]);
 assert.equal(state[direction],Math.fround(+raw),`raw ${direction}/${step}`);
 assert.equal(result,Math.fround(+weight),`weight ${direction}/${step}`);
 observations.push({direction,step:+step,raw:state[direction],weight:result});
}
console.log(JSON.stringify({kind:'source-component/successor-component',passed:observations.length,comparison:'exact float32',observations},null,2));
