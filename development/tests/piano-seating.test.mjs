import test from 'node:test';import assert from 'node:assert/strict';
import {pianoSeatCandidate} from '../src/piano-seating.js';
const keyboard={point:[4,.6,.78],forward:[0,1,0],levelId:'g'};
const seat={objectId:'bench',point:[4,1.2,.51],levelId:'g'};
test('bench must be within keyboard working face, same floor and resident reach',()=>{
 const picked=pianoSeatCandidate(keyboard,[seat],[4,1.8,.9]);assert.equal(picked.objectId,'bench');assert.deepEqual(picked.forward,[-0,-1,-0]);
 for(const bad of [{...seat,point:[4,-.2,.51]},{...seat,point:[5,1.2,.51]},{...seat,levelId:'up'},{...seat,point:[4,1.2,3.51]}])assert.equal(pianoSeatCandidate(keyboard,[bad],[4,1.8,.9]),null);
 assert.equal(pianoSeatCandidate(keyboard,[seat],[4,3,.9]),null);
});
test('rotated instrument uses the same geometric test and faces keyboard',()=>{
 const picked=pianoSeatCandidate({...keyboard,point:[.6,4,.78],forward:[1,0,0]},[{...seat,point:[1.2,4,.51]}],[1.8,4,.9]);assert.deepEqual(picked.forward,[-1,-0,-0]);
 assert.equal(pianoSeatCandidate(null,[seat],[4,1.8,.9]),null);
});
