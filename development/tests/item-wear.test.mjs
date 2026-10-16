import test from 'node:test';
import assert from 'node:assert/strict';
import {damageCheck,wearDenominator} from '../src/item-wear.js';

test('wear checks retain source sharpness/head/general order and independent draws',()=>{
 const calls=[],hits=[];
 const result=damageCheck({lowerChance:5,scale:6,addedChance:3,sharpness:{reduce:()=>hits.push('sharp')},head:{lowerChanceMultiplier:1,reduce:()=>hits.push('head')},reduceCondition:()=>hits.push('general')},n=>{calls.push(n);return 0;});
 assert.deepEqual(calls,[32,33,33]);assert.deepEqual(hits,['sharp','head','general']);assert.equal(result,true);
});
test('secondary damage reports change even when final general check misses',()=>{
 const hits=[],draws=[0,1];assert.equal(damageCheck({lowerChance:5,head:{lowerChanceMultiplier:1,reduce:()=>hits.push('head')},reduceCondition:()=>hits.push('general')},()=>draws.shift()),true);
 assert.deepEqual(hits,['head']);assert.equal(draws.length,0);
});
test('absent condition channels do not draw random numbers and misses do not mutate',()=>{
 const calls=[];assert.equal(damageCheck({lowerChance:5,reduceCondition:()=>assert.fail('miss must not reduce')},n=>{calls.push(n);return n-1;}),false);assert.deepEqual(calls,[5]);
});
test('nonpositive denominators are guaranteed hits without consuming RNG',()=>{
 let hits=0;assert.equal(damageCheck({lowerChance:5,scale:-1,reduceCondition:()=>hits++},()=>assert.fail('source Next(nonpositive) does not consume RNG')),true);assert.equal(hits,1);
});
test('denominators apply float32 before integer truncation and saturate like Java',()=>{
 assert.equal(wearDenominator(5,6,3),33);assert.equal(wearDenominator(16777217,1),16777216);
 assert.equal(wearDenominator(5,.3,0),1);assert.equal(wearDenominator(2147483647,6),2147483647);
});
