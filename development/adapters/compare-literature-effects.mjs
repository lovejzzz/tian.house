import fs from 'node:fs';import assert from 'node:assert/strict';
import {applyLiteratureEffects} from '../src/reading.js';
const lines=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').slice(1);
for(const row of lines){const [s,b,u,read,es,eb,eu]=row.split(',');const p={stress:+s,boredom:+b,unhappiness:+u};applyLiteratureEffects(p,{StressChange:-20,BoredomChange:-30,UnhappyChange:-20},read==='true');for(const [actual,expected]of [[p.stress,+es],[p.boredom,+eb],[p.unhappiness,+eu]])assert.ok(Math.abs(actual-expected)<1e-7,row);}
assert.equal(lines.length,8);console.log(JSON.stringify({passed:true,samples:8,kind:'installed-component-effects',applicationAcceptance:false,stressScriptConversion:'static Item.InstanceItem bytecode division by100'}));
