import test from 'node:test';
import assert from 'node:assert/strict';
import {transferDuration} from '../src/item-transfer.js';
test('direct ground drop is ten times faster than pickup for equal weight',()=>{
 const drop=transferDuration({weight:2,sourceDirect:true,sourceCarried:true,destinationFloor:true,destinationCarried:false});
 const take=transferDuration({weight:2,sourceDirect:false,sourceCarried:false,destinationCarried:true});
 assert.equal(drop,10/48);assert.equal(take,100/48);
});
test('packing depends on destination fullness with forty percent minimum and weight cap',()=>{
 const args={weight:10,sourceDirect:true,sourceCarried:true,destinationCarried:true,destinationCapacity:20};
 assert.ok(Math.abs(transferDuration({...args,destinationWeight:0})-144/48)<1e-12);
 assert.ok(Math.abs(transferDuration({...args,destinationWeight:16})-288/48)<1e-12);
});
test('unpacking to ground has no direct drop acceleration; traits and awkward gloves apply once',()=>{
 const args={weight:1,sourceDirect:false,sourceCarried:true,destinationFloor:true,destinationCarried:false};
 assert.equal(transferDuration(args),120/48);
 assert.equal(transferDuration({...args,traits:['Dextrous','AllThumbs'],awkwardGloves:true}),120/48);
 assert.equal(transferDuration({...args,lastStand:true}),36/48);
});
