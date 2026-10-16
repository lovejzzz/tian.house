import fs from 'node:fs';import assert from 'node:assert/strict';import {ordinaryCraftUse} from '../src/item-use.js';
const rows=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse);
for(const r of rows)assert.deepEqual(ordinaryCraftUse(r.before,r.requested,{keep:r.keep,destroy:r.destroy,disappearOnUse:!r.keepEmpty}),{used:r.used,remaining:r.after,remove:!r.present},JSON.stringify(r));
assert.equal(rows.length,72);console.log(JSON.stringify({passed:true,cases:72,scope:'Native ItemUser.UseItem(force=true) with ordinary fixture items in an isolated container; no replacement/subclass/player-equipment coverage.'},null,2));
