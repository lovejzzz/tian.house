// Woodwork branch of the installed single-player XP.AddXP multiplier path.
// Full reading actions, XP events and skill UI remain pending.
export function woodworkXpGain(base,player,sandbox={}){
 if(player.asleep)return 0;
 const f=Math.fround,boost=player.xpBoosts?.woodwork??0,traits=player.traits??[];
 let factor=f(boost===0?.25:boost===1?1:boost===2?1.33:1.66);
 if(traits.includes('FastLearner'))factor=f(factor*f(1.3));
 if(traits.includes('SlowLearner'))factor=f(factor*f(.7));
 if(traits.includes('Crafty'))factor=f(factor*f(1.3));
 let gain=f(f(base)*factor);
 const entry=player.xpMultipliers?.woodwork;
 const book=typeof entry==='object'&&entry!==null?entry.multiplier:entry??1;
 if(book>1)gain=f(gain*f(book));
 const multiplier=sandbox.xpMultiplierGlobalToggle?sandbox.xpMultiplierGlobal??1:sandbox.xpMultipliers?.woodwork??1;
 return f(gain*f(multiplier));
}

// Installed PerkFactory Woodwork cumulative thresholds (42.21.0).
export const WOODWORK_XP_TOTALS=Object.freeze([0,75,225,525,1275,2775,5775,10275,16275,23775,32775]);
export function awardWoodworkXp(base,player,sandbox={}){
 if(base<0)throw new RangeError('Recipe XP award must be nonnegative');
 if(player.asleep)return 0;
 const before=Math.fround(player.xp?.woodwork??0),cap=WOODWORK_XP_TOTALS[10];
 if(before>=cap)return 0;
 const after=Math.max(0,Math.min(cap,Math.fround(before+woodworkXpGain(base,player,sandbox))));
 player.xp??={};player.xp.woodwork=after;
 const book=player.xpMultipliers?.woodwork;
 if(book&&typeof book==='object'){
  const lower=WOODWORK_XP_TOTALS[book.minLevel-1],upper=WOODWORK_XP_TOTALS[book.maxLevel];
  // Apply the full multiplier to this award, then remove it on crossing.
  // Source does not clamp the multiplied portion to the book's XP range.
  if((before>=lower&&after<lower)||(before<upper&&after>=upper))delete player.xpMultipliers.woodwork;
 }
 let level=player.skillLevels?.woodwork??0;
 // Source checks a crossing from the old XP, not just the final total. This
 // preserves explicitly assigned levels even in an inconsistent imported save.
 while(level<10&&before<WOODWORK_XP_TOTALS[level+1]&&after>=WOODWORK_XP_TOTALS[level+1]){
  player.skillLevels??={};player.skillLevels.woodwork=++level;
 }
 return Math.fround(after-before);
}

export function validateWoodworkProgression(player){
 const book=player.xpMultipliers?.woodwork;
 if(book===undefined)return;
 if(typeof book==='number'){
  if(!Number.isFinite(book)||book<0)throw new Error('Invalid saved carpentry XP multiplier');
  return; // Earlier saves have no book interval; do not invent one.
 }
 if(!book||typeof book!=='object'||!Number.isFinite(book.multiplier)||book.multiplier<0||!Number.isInteger(book.minLevel)||!Number.isInteger(book.maxLevel)||book.minLevel<1||book.maxLevel>10||book.minLevel>book.maxLevel)throw new Error('Invalid saved carpentry book level range');
}
