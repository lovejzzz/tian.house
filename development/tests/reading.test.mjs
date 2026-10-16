import test from 'node:test';
import assert from 'node:assert/strict';
import {skillBook,carpentryBook,readingComprehension,prepareBookReading,bookReadingDuration,updateBookPages,updateBookMultiplier} from '../src/reading.js';
const book=carpentryBook({SkillTrained:'Carpentry',NumberOfPages:220,LvlSkillTrained:1,NumLevelsTrained:2});
test('five carpentry volumes map to installed trained levels and multiplier maxima',()=>{
 for(const [index,max] of [3,5,8,12,16].entries()){
  const b=carpentryBook({SkillTrained:'Carpentry',NumberOfPages:220,LvlSkillTrained:index*2+1,NumLevelsTrained:2});
  assert.equal(b.maxMultiplier,max);assert.equal(b.maxLevel,index*2+2);
 }
 assert.equal(carpentryBook({SkillTrained:'Cooking',NumberOfPages:220}),null);
});
test('comprehension and character page memory differ from physical copy state',()=>{
 const item={type:'Base.BookCarpentry1',alreadyReadPages:200},p={readPages:{'Base.BookCarpentry1':44}};
 assert.equal(prepareBookReading(p,item,book),44);
 assert.equal(readingComprehension({skillLevels:{woodwork:2}},book),'obsolete');
 assert.equal(prepareBookReading({...p,skillLevels:{woodwork:2}},item,book),44);
 const illiterate={traits:['Illiterate'],readPages:{'Base.BookCarpentry1':44}};
 assert.equal(prepareBookReading(illiterate,item,book),0);assert.equal(illiterate.readPages[item.type],0);
 assert.equal(readingComprehension({}, {...book,minLevel:3,maxLevel:4}),'too-difficult');
});
test('reading duration retains native units and composes day length, traits, glasses and sitting',()=>{
 assert.equal(bookReadingDuration(book,{}),52800);
 assert.equal(bookReadingDuration(book,{}, {minutesPerPage:-1}),52800);
 assert.equal(bookReadingDuration(book,{}, {minutesPerPage:0}),1);
 assert.equal(bookReadingDuration(book,{}, {minutesPerDay:120}),105600);
 assert.equal(bookReadingDuration(book,{traits:['FastReader','SlowReader'],readingGlasses:true,sitting:true}),52800*.7*1.3*.9*.9);
 assert.equal(bookReadingDuration(book,{traits:['FastReader']},{fastRead:true}),35);
 assert.equal(bookReadingDuration(book,{traits:['SlowReader']},{instant:true}),1);
});
test('partial reading grants stepped float32 multiplier, preserves pages, never grants direct XP',()=>{
 const p={},item={type:'Base.BookCarpentry1'};
 updateBookPages(p,item,book,21/220);assert.equal(item.alreadyReadPages,21);assert.equal(p.xpMultipliers,undefined);
 updateBookPages(p,item,book,.1);assert.equal(p.xpMultipliers.woodwork.multiplier,Math.fround(.3));
 updateBookPages(p,item,book,.4);assert.equal(p.xpMultipliers.woodwork.multiplier,Math.fround(1.2));
 assert.equal(prepareBookReading(p,{type:item.type},book),88);assert.equal(p.xp,undefined);
 updateBookPages(p,item,book,1.1);assert.equal(item.alreadyReadPages,220);assert.equal(p.xpMultipliers.woodwork.multiplier,3);
 item.alreadyReadPages=44;updateBookMultiplier(p,item,book);assert.equal(p.xpMultipliers.woodwork.multiplier,3);
});
test('uncomprehended pages update counters without awarding bonus before source stop timer',()=>{
 const p={traits:['Illiterate']},item={type:'Base.BookCarpentry1'};updateBookPages(p,item,book,.5);
 assert.equal(p.readPages[item.type],110);assert.equal(p.xpMultipliers,undefined);
});

test('literature cooldown is title-specific, expires at boundary and does not refresh early',async()=>{
 const {isLiteratureRead,addReadLiterature,validateReadingState}=await import('../src/reading.js');
 const p={};assert.equal(isLiteratureRead(p,'issue190',10),false);
 addReadLiterature(p,'issue190',10);
 assert.equal(isLiteratureRead(p,'issue190',54),true);
 assert.equal(isLiteratureRead(p,'issue191',54),false);
 addReadLiterature(p,'issue190',54);assert.equal(p.readLiterature.issue190,10);
 assert.equal(isLiteratureRead(p,'issue190',55),false);
 addReadLiterature(p,'issue190',55);assert.equal(p.readLiterature.issue190,55);
 const restored=JSON.parse(JSON.stringify(p));validateReadingState(restored,{});
 assert.equal(isLiteratureRead(restored,'issue190',99),true);
 assert.equal(isLiteratureRead(restored,'issue190',100),false);
});
test('literature memory preserves explicit native int days and safe arbitrary titles',async()=>{
 const {isLiteratureRead,addReadLiterature,validateReadingState}=await import('../src/reading.js');
 const p={};for(const title of ['__proto__','constructor',''])addReadLiterature(p,title,10,45,5);
 assert.equal(Object.getPrototypeOf(p.readLiterature),Object.prototype);
 for(const title of ['__proto__','constructor',''])assert.equal(isLiteratureRead(p,title,49),true);
 addReadLiterature(p,'overflow',0,45,2147483645);
 assert.equal(isLiteratureRead(p,'overflow',0),false);
 validateReadingState(p,{});
 for(const memory of [null,[],{x:1.5},{x:2147483648},{x:'1'}])assert.throws(()=>validateReadingState({readLiterature:memory},{}));
});
test('survived-day clock crosses after 07:00 and preserves existing counter',async()=>{
 const {advanceReadingClock}=await import('../src/reading.js');const state={nightsSurvived:10};
 advanceReadingClock(state,1859,1860);assert.equal(state.nightsSurvived,10);
 advanceReadingClock(state,1860,1860.01);assert.equal(state.nightsSurvived,11);
 advanceReadingClock(state,2879,2881);assert.equal(state.nightsSurvived,11);
 const legacy={};advanceReadingClock(legacy,1861,1862);assert.equal(legacy.nightsSurvived,1);
});

test('different skill identities keep comprehension and multipliers independent',()=>{
 const player={skillLevels:{woodwork:10,cooking:0,doctor:2,plantscavenging:0}};
 for(const [name,perk,level,max] of [['Cooking','cooking',1,3],['FirstAid','doctor',3,5],['Foraging','plantscavenging',1,3],['Aiming','aiming',1,1.5],['Reloading','reloading',3,2.5],['LongBlade','longblade',9,8]]){
  const b=skillBook({SkillTrained:name,NumberOfPages:220,LvlSkillTrained:level,NumLevelsTrained:2});
  assert.equal(b.perk,perk);assert.equal(b.maxMultiplier,max);
  player.skillLevels[perk]=level-1;
  assert.equal(readingComprehension(player,b),'understood');
  updateBookPages(player,{type:'Test.'+name},b,1);
  assert.equal(player.xpMultipliers[perk].multiplier,max);
 }
 assert.equal(player.xpMultipliers.woodwork,undefined);
 assert.equal(skillBook({SkillTrained:'Unknown',NumberOfPages:220}),null);
 assert.equal(skillBook({SkillTrained:'constructor',NumberOfPages:220}),null);
});
