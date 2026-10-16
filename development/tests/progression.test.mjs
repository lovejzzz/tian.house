import test from 'node:test';
import assert from 'node:assert/strict';
import {woodworkXpGain,awardWoodworkXp,WOODWORK_XP_TOTALS,validateWoodworkProgression} from '../src/progression.js';
test('entity woodwork reward uses initial XP boost, not current skill level',()=>{
 assert.equal(woodworkXpGain(10,{}),2.5);
 assert.equal(woodworkXpGain(10,{skillLevels:{woodwork:8}}),2.5);
 assert.equal(woodworkXpGain(10,{xpBoosts:{woodwork:1}}),10);
 assert.equal(woodworkXpGain(10,{xpBoosts:{woodwork:2}}),Math.fround(10*Math.fround(1.33)));
 assert.equal(woodworkXpGain(10,{xpBoosts:{woodwork:3}}),Math.fround(10*Math.fround(1.66)));
});
test('woodwork traits, books and sandbox modifiers compose in float32 order',()=>{
 assert.equal(woodworkXpGain(10,{traits:['FastLearner']}),3.25);
 assert.equal(woodworkXpGain(10,{traits:['SlowLearner']}),1.75);
 assert.equal(woodworkXpGain(10,{traits:['Crafty']}),3.25);
 assert.equal(woodworkXpGain(10,{traits:['Pacifist']}),2.5);
 assert.equal(woodworkXpGain(10,{xpMultipliers:{woodwork:3}},{xpMultipliers:{woodwork:2}}),15);
 assert.equal(woodworkXpGain(10,{xpMultipliers:{woodwork:.5}}),2.5);
 assert.equal(woodworkXpGain(10,{}, {xpMultiplierGlobalToggle:true,xpMultiplierGlobal:4,xpMultipliers:{woodwork:2}}),10);
 assert.equal(woodworkXpGain(10,{asleep:true}),0);
});

test('recipe XP crosses installed woodwork thresholds and caps cumulative XP',()=>{
 for(let level=0;level<10;level++){
  const p={skillLevels:{woodwork:level},xp:{woodwork:WOODWORK_XP_TOTALS[level+1]-2.5}};
  assert.equal(awardWoodworkXp(10,p),2.5);
  assert.equal(p.skillLevels.woodwork,level+1);
 }
 const p={xp:{woodwork:32774},skillLevels:{woodwork:9}};
 assert.equal(awardWoodworkXp(10,p),1);assert.equal(p.skillLevels.woodwork,10);
 assert.equal(awardWoodworkXp(10,p),0);assert.equal(p.xp.woodwork,32775);
});
test('large awards cross multiple levels but do not repair inconsistent imported level state',()=>{
 const p={};awardWoodworkXp(2400,p);assert.equal(p.xp.woodwork,600);assert.equal(p.skillLevels.woodwork,3);
 const inconsistent={xp:{woodwork:100},skillLevels:{woodwork:0}};
 awardWoodworkXp(10,inconsistent);assert.equal(inconsistent.skillLevels.woodwork,0);
 const sleeping={asleep:true};assert.equal(awardWoodworkXp(10,sleeping),0);assert.equal(sleeping.xp,undefined);
});

test('book interval expires after the entire crossing award, not partway through it',()=>{
 const p={xp:{woodwork:222.5},skillLevels:{woodwork:1},xpMultipliers:{woodwork:{multiplier:3,minLevel:1,maxLevel:2}}};
 assert.equal(awardWoodworkXp(10,p),7.5);assert.equal(p.xp.woodwork,230);
 assert.equal(p.skillLevels.woodwork,2);assert.equal(p.xpMultipliers.woodwork,undefined);
 assert.equal(awardWoodworkXp(10,p),2.5);assert.equal(p.xp.woodwork,232.5);
});
test('source multiplier getter does not gate by current range or remove already-stale intervals',()=>{
 for(const xp of [0,525]){
  const p={xp:{woodwork:xp},skillLevels:{woodwork:0},xpMultipliers:{woodwork:{multiplier:3,minLevel:3,maxLevel:3}}};
  assert.equal(awardWoodworkXp(10,p),7.5);assert.ok(p.xpMultipliers.woodwork);
 }
 const p={xp:{woodwork:217.5},xpMultipliers:{woodwork:{multiplier:3,minLevel:1,maxLevel:2}}};
 awardWoodworkXp(10,p);assert.equal(p.xp.woodwork,225);assert.equal(p.xpMultipliers.woodwork,undefined);
});
test('saved interval survives roundtrip and invalid intervals are rejected; legacy numeric boosts retained',()=>{
 const p={xpMultipliers:{woodwork:{multiplier:3,minLevel:1,maxLevel:2}}};
 const restored=JSON.parse(JSON.stringify(p));validateWoodworkProgression(restored);assert.deepEqual(restored,p);
 for(const value of [null,NaN,-1,{multiplier:3,minLevel:0,maxLevel:2},{multiplier:3,minLevel:4,maxLevel:2},{multiplier:3,minLevel:1,maxLevel:11},{multiplier:'3',minLevel:1,maxLevel:2}])assert.throws(()=>validateWoodworkProgression({xpMultipliers:{woodwork:value}}));
 const old={xp:{woodwork:222.5},xpMultipliers:{woodwork:3}};validateWoodworkProgression(old);awardWoodworkXp(10,old);assert.equal(old.xpMultipliers.woodwork,3);
});
