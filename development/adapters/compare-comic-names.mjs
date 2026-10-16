import fs from 'node:fs';import assert from 'node:assert/strict';import {comicIdentity} from '../src/comic-identity.js';
const catalog=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),rows=fs.readFileSync(process.argv[3],'utf8').trim().split('\n').slice(1);
for(const row of rows){const[key,count,requested,identity,display]=row.split('\t');const entry=catalog.entries.find(e=>e.key===key);assert.equal(entry.issues,+count);const result=comicIdentity(entry,Math.min(+requested,+count-1),'Comic Book',catalog.formats);assert.deepEqual(result,{identity,displayName:display},key);}
assert.equal(rows.length,catalog.entries.length*3);console.log(JSON.stringify({passed:true,series:catalog.entries.length,samples:rows.length,kind:'native-nameComicBook-component',applicationAcceptance:false}));
