import fs from 'node:fs';import assert from 'node:assert/strict';import {parseCraftItemInput,usesPartialCraftItem} from '../src/craft-inputs.js';
const rows=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse);
for(const row of rows){const input=parseCraftItemInput(`item 1 [Base.Fixture] mode:${row.mode}${row.count?' flags[ItemCount]':''}`);assert.equal(usesPartialCraftItem(input,{ItemType:'base:'+row.type.toLowerCase(),UseDelta:row.value,HungerChange:row.value}),row.partial,JSON.stringify(row));}
assert.equal(rows.length,144);console.log(JSON.stringify({passed:true,cases:rows.length,scope:'Native isUsesPartialItem on script Item fixtures. Does not validate quantity selection, actual consumption, replacements or UI.'},null,2));
