// Source-derived single-player skill-book state rules. Action timing units are
// native timed-action units, not browser seconds. Animation/UI integrate later.
const MAX_MULTIPLIERS={1:3,3:5,5:8,7:12,9:16};
// Native identity is the generated literature title, not the item's full type.
// The clock is GameTime.nightsSurvived; callers must supply that clock explicitly.
export function isLiteratureRead(player,title,nightsSurvived,cooldown=45){
 const memory=player.readLiterature;
 return !!memory&&Object.hasOwn(memory,title)&&nightsSurvived<((memory[title]+cooldown)|0);
}
export function addReadLiterature(player,title,nightsSurvived,cooldown=45,recordedDay=nightsSurvived){
 if(isLiteratureRead(player,title,nightsSurvived,cooldown))return;
 player.readLiterature??={};
 Object.defineProperty(player.readLiterature,title,{value:recordedDay,writable:true,enumerable:true,configurable:true});
}
// Installed skill names differ from progression identities for these three skills.
const SKILL_PERKS=Object.freeze(Object.fromEntries([
 'Blacksmith','Butchering','Carpentry','Carving','Cooking','Electricity','Farming','FirstAid','Fishing','FlintKnapping','Foraging','Glassmaking','Husbandry','Masonry','Mechanics','MetalWelding','Pottery','Tailoring','Tracking','Trapping','Aiming','Reloading','LongBlade','Maintenance'
].map(name=>[name,({Carpentry:'Woodwork',FirstAid:'Doctor',Foraging:'PlantScavenging'}[name]??name).toLowerCase()])));
export function skillBook(properties){
 const name=properties.SkillTrained;
 if(!Object.hasOwn(SKILL_PERKS,name)||!(Number(properties.NumberOfPages)>0))return null;
 const minLevel=Number(properties.LvlSkillTrained),levels=Number(properties.NumLevelsTrained);
 const scale=['Aiming','Reloading','LongBlade'].includes(name)?.5:1;
 return {pages:Number(properties.NumberOfPages),perk:SKILL_PERKS[name],minLevel,maxLevel:minLevel+levels-1,maxMultiplier:(MAX_MULTIPLIERS[minLevel]??1)*scale};
}
export function carpentryBook(properties){return properties.SkillTrained==='Carpentry'?skillBook(properties):null;}
export function readingComprehension(player,book){
 const next=(player.skillLevels?.[book.perk]??0)+1;
 if(player.traits?.includes('Illiterate')||book.minLevel>next)return 'too-difficult';
 return book.maxLevel<next?'obsolete':'understood';
}
export function prepareBookReading(player,item,book){
 player.readPages??={};
 if(readingComprehension(player,book)==='too-difficult'){
  item.alreadyReadPages=0;player.readPages[item.type]=0;
 }
 // Character memory wins over the physical copy's page counter.
 item.alreadyReadPages=player.readPages[item.type]??0;
 return item.alreadyReadPages;
}
export function bookReadingDuration(book,player,{minutesPerPage=2,minutesPerDay=60,fastRead=false,instant=false}={}){
 if(instant)return 1;
 if(minutesPerPage<0)minutesPerPage=2;
 const f=1/minutesPerDay/2;
 let time=fastRead?50:(book.pages>0?book.pages:5)*minutesPerPage/f;
 if(player.traits?.includes('FastReader'))time*=.7;
 if(player.traits?.includes('SlowReader'))time*=1.3;
 if(player.readingGlasses)time*=.9;
 if(player.sitting)time*=.9;
 return Math.max(time,1);
}
export function updateBookMultiplier(player,item,book){
 const percent=Math.min(100,item.alreadyReadPages/book.pages*100);
 const multiplier=Math.floor(percent/10)*(book.maxMultiplier/10);
 const prior=player.xpMultipliers?.[book.perk];
 const current=typeof prior==='object'&&prior!==null?prior.multiplier:prior??0;
 if(multiplier>current){
  player.xpMultipliers??={};
  player.xpMultipliers[book.perk]={multiplier:Math.fround(multiplier),minLevel:book.minLevel,maxLevel:book.maxLevel};
 }
}
export function updateBookPages(player,item,book,jobDelta){
 item.alreadyReadPages=Math.min(book.pages,Math.floor(book.pages*jobDelta));
 player.readPages??={};player.readPages[item.type]=item.alreadyReadPages;
 if(readingComprehension(player,book)==='understood')updateBookMultiplier(player,item,book);
}

// Native page setters store signed Java ints without clamping to book length.
// Keep representable values; the action's validity check handles overlong pages.
export function validateReadingState(player,items,state={}){
 for(const field of ['knownRecipes','alreadyReadBooks'])if(player[field]!==undefined&&(!Array.isArray(player[field])||player[field].some(v=>typeof v!=='string')))throw new Error('Invalid saved recipe reading history');
 if(player.knowAllRecipes!==undefined&&typeof player.knowAllRecipes!=='boolean')throw new Error('Invalid saved recipe debug flag');
 const integer=n=>Number.isInteger(n)&&n>=-2147483648&&n<=2147483647;
 if(state.nightsSurvived!==undefined&&!integer(state.nightsSurvived))throw new Error('Invalid saved survival day count');
 for(const [key,max] of [['stress',1],['boredom',100],['unhappiness',100]])if(player[key]!==undefined&&(!Number.isFinite(player[key])||player[key]<0||player[key]>max))throw new Error('Invalid saved reading mood data');
 for(const item of Object.values(items)){
  if(item.modData!==undefined&&(!item.modData||typeof item.modData!=='object'||Array.isArray(item.modData)))throw new Error('Invalid saved item metadata');
  if(item.modData?.literatureTitle!==undefined&&typeof item.modData.literatureTitle!=='string')throw new Error('Invalid saved literature title');
  if(item.modData?.learnedRecipe!==undefined&&typeof item.modData.learnedRecipe!=='string')throw new Error('Invalid saved item recipe identifier');
  if(item.displayName!==undefined&&typeof item.displayName!=='string')throw new Error('Invalid saved item name');
  if(item.alreadyRead!==undefined&&typeof item.alreadyRead!=='boolean')throw new Error('Invalid saved read status');
 }
 if(player.readLiterature!==undefined){
  const memory=player.readLiterature;
  if(!memory||typeof memory!=='object'||Array.isArray(memory)||Object.values(memory).some(day=>!integer(day)))throw new Error('Invalid saved literature reading history');
 }
 if(player.readPages!==undefined){
  const pages=player.readPages;
  if(!pages||typeof pages!=='object'||Array.isArray(pages))throw new Error('Invalid saved reading history');
  for(const [type,count] of Object.entries(pages))if(!type||!integer(count))throw new Error('Invalid saved reading page count');
 }
 for(const item of Object.values(items))if(item.alreadyReadPages!==undefined&&!integer(item.alreadyReadPages))throw new Error('Invalid saved book page count');
}

export function ordinaryLiterature(properties){
 if(properties.ItemType!=='base:literature'||(properties.SkillTrained&&properties.SkillTrained!=='None'))return null;
 const pages=Number(properties.NumberOfPages??-1);
 return pages<0?{pages,ordinary:true}:null;
}
export function applyLiteratureEffects(player,properties,alreadyRead=false){
 if(alreadyRead)return;
 for(const [field,key,max,scale] of [['stress','StressChange',1,100],['boredom','BoredomChange',100,1],['unhappiness','UnhappyChange',100,1]]){
  const delta=Math.fround(Math.fround(Number(properties[key]??0))/scale);
  player[field]=Math.max(0,Math.min(max,Math.fround(Math.fround(player[field]??0)+delta)));
 }
}
// Native GameTime increments nightsSurvived after crossing 07:00, not midnight.
export function advanceReadingClock(state,before,after){
 const crossings=t=>Math.ceil((t-420)/1440);
 state.nightsSurvived??=Math.max(0,crossings(before)-1);
 state.nightsSurvived=(state.nightsSurvived+crossings(after)-crossings(before))|0;
}
