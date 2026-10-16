import fs from 'node:fs';
import assert from 'node:assert/strict';
import {isLiteratureRead,addReadLiterature} from '../src/reading.js';
const lines=fs.readFileSync(process.argv[2],'utf8').trim().split('\n');
assert.equal(lines.shift(),'defaultCooldown=45');
assert.equal(lines.shift(),'cooldown,stored,now,before,afterAdd,afterExplicit,otherTitle');
let samples=0;
for(const line of lines){
 const [cooldown,stored,now,before,after,explicit,other]=line.split(',');
 const p={readLiterature:{issue190:Number(stored)}};
 assert.equal(String(isLiteratureRead(p,'issue190',+now,+cooldown)),before,line);
 addReadLiterature(p,'issue190',+now,+cooldown);assert.equal(p.readLiterature.issue190,+after,line);
 addReadLiterature(p,'issue190',+now,+cooldown,123);assert.equal(p.readLiterature.issue190,+explicit,line);
 assert.equal(String(isLiteratureRead(p,'issue191',+now,+cooldown)),other,line);samples++;
}
assert.equal(samples,36);
console.log(JSON.stringify({passed:true,samples,kind:'installed-component-comparison',applicationAcceptance:false}));
