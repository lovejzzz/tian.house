import test from 'node:test';import assert from 'node:assert/strict';import {createCoalescedSave} from '../src/coalesced-save.js';
test('pause queues the latest snapshot behind an in-flight autosave without overlapping writes',async()=>{
 let current=1,release,active=0,maxActive=0;const snapshots=[];
 const save=createCoalescedSave(async()=>{active++;maxActive=Math.max(maxActive,active);snapshots.push(current);if(snapshots.length===1)await new Promise(r=>release=r);active--;return true;});
 const first=save();current=2;const second=save();current=3;const third=save();release();
 assert.equal(await first,true);await second;await third;assert.deepEqual(snapshots,[1,3]);assert.equal(maxActive,1);
 current=4;await save();assert.deepEqual(snapshots,[1,3,4]);
});
test('failed write releases the queue for a subsequent retry',async()=>{
 let fail=true;const save=createCoalescedSave(async()=>{if(fail)throw Error('disk');return true;});
 await assert.rejects(save(),/disk/);fail=false;assert.equal(await save(),true);
});
