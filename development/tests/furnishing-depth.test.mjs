import test from 'node:test';
import assert from 'node:assert/strict';
import {furnishingDepth} from '../src/furnishing.js';

test('opposite wall shelves and stock remain behind nearer walls on the same diagonal',()=>{
 for(const axis of ['N','W']){
  const props={TianMount:'wall',TianWallSide:'opposite',['attached'+axis]:''};
  const shelf=furnishingDepth(4,10,props),stock=furnishingDepth(4,10,props,true);
  const front=furnishingDepth(3,11,{wall:'',WallN:''});
  assert.ok(shelf<stock);assert.ok(stock<front);
  assert.ok(stock<furnishingDepth(4,10,{wall:'',WallW:''}));
 }
});
test('ordinary furnishings, stock and diagonal walls retain their ordering',()=>{
 assert.equal(furnishingDepth(4,10,{}),14.5);
 assert.equal(furnishingDepth(4,10,{},true),14.7);
 assert.equal(furnishingDepth(4,10,{TianWallAxis:'D-'}),15.01);
});
