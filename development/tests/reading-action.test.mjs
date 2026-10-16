import test from 'node:test';import assert from 'node:assert/strict';
import {useFixtureCatalog} from './fixtures/catalog.mjs';
import {World} from '../src/world.js';import {Simulation,newState,parseSave} from '../src/simulation.js';
const catalog=useFixtureCatalog();Object.assign(catalog['Base.BookCarpentry1'].properties,{SkillTrained:'Carpentry',NumberOfPages:220,LvlSkillTrained:1,NumLevelsTrained:2});
function fixture(){const s=newState([8494,11549,0]),w=new World({cells:[]},{}),sim=new Simulation(w,s);sim.paused=false;const book=sim.inventory.create('book');return {s,sim,book};}
function advance(sim,n){for(let i=0;i<n;i++)sim.tick(.1);}
test('reading resumes character pages, saves interrupted progress and completes with bonus not XP',()=>{
 const {s,sim,book}=fixture();s.player.readPages={[book.type]:219};
 assert.equal(sim.readBook(book.id),true);assert.equal(sim.action.duration,1100);
 advance(sim,20);sim.cancel();assert.equal(s.player.readPages[book.type],219);
 assert.equal(JSON.parse(sim.serialize()).player.readPages[book.type],219);
 assert.equal(sim.readBook(book.id),true);advance(sim,51);assert.equal(sim.action,null);
 assert.equal(book.alreadyReadPages,220);assert.equal(s.player.xpMultipliers.woodwork.multiplier,3);assert.equal(s.player.xp,undefined);
});
test('reading cancellation on movement or inventory removal prevents completion bonus',()=>{
 for(const cause of ['move','remove','dark']){const {sim,s,book}=fixture();sim.readBook(book.id);
 if(cause==='move')sim.tick(.1,{x:1});
 if(cause==='remove'){sim.inventory.remove(book.id);sim.tick(.1);}
 if(cause==='dark'){s.player.tooDarkToRead=true;sim.tick(.1);}
 assert.equal(sim.action,null);assert.equal(s.player.xpMultipliers,undefined);}
});
test('uncomprehended reading force-stops on native pageTimer threshold',()=>{
 const {sim,s,book}=fixture();s.player.traits=['Illiterate'];sim.readBook(book.id);advance(sim,40);assert.ok(sim.action);
 advance(sim,2);assert.equal(sim.action,null);assert.equal(s.player.readPages[book.type],0);assert.equal(s.player.xpMultipliers,undefined);
});

test('save import validates page representation without silently clamping source integer values',()=>{
 const {sim,s,book}=fixture();
 for(const invalid of [null,[],10,'220']){s.player.readPages=invalid;assert.throws(()=>parseSave(sim.serialize()));}
 for(const invalid of [null,'22',1.5,2147483648]){s.player.readPages={[book.type]:invalid};assert.throws(()=>parseSave(sim.serialize()));}
 s.player.readPages={[book.type]:221};book.alreadyReadPages=-1;
 const restored=parseSave(sim.serialize());assert.equal(restored.player.readPages[book.type],221);assert.equal(restored.inventory.items[book.id].alreadyReadPages,-1);
 book.alreadyReadPages='22';assert.throws(()=>parseSave(sim.serialize()));
});
test('overlong item pages invalidate reading, including owner progress applied at start',()=>{
 const {sim,s,book}=fixture();book.alreadyReadPages=221;assert.equal(sim.readBook(book.id),false);
 book.alreadyReadPages=0;s.player.readPages={[book.type]:221};assert.equal(sim.readBook(book.id),true);
 sim.tick(.1);assert.equal(sim.action,null);assert.equal(s.player.xpMultipliers,undefined);
});
test('reading visual overrides are transient and never replace actual equipment',()=>{
 const {sim,s,book}=fixture();const equipment={...s.inventory.equipment};sim.readBook(book.id);assert.ok(s.player.readMotion);sim.tick(.1);assert.equal(s.player.readMotion.elapsed,.1);
 assert.equal(JSON.parse(sim.serialize()).player.readMotion,undefined);assert.deepEqual(s.inventory.equipment,equipment);
 sim.cancel();assert.equal(s.player.readMotion,undefined);assert.deepEqual(s.inventory.equipment,equipment);
 s.player.readPages={[book.type]:219};sim.readBook(book.id);advance(sim,51);assert.equal(s.player.readMotion,undefined);
});

catalog['Base.ComicBook']={name:'Comic Book',properties:{ItemType:'base:literature',Weight:.4,BoredomChange:-30,StressChange:-20,UnhappyChange:-20,StaticModel:'ComicBook'}};
test('ordinary comic completes, persists title cooldown and suppresses repeated effects',()=>{
 const {sim,s}=fixture(),comic=sim.inventory.create('Base.ComicBook');comic.modData={literatureTitle:'Gorilla Trucker #190'};
 Object.assign(s.player,{stress:.8,boredom:50,unhappiness:50});
 assert.equal(sim.consume(comic.id),true);assert.equal(sim.action.duration,25);
 advance(sim,251);assert.equal(sim.action,null);assert.equal(s.player.stress,Math.fround(.6));assert.equal(s.player.boredom,20);assert.equal(s.player.unhappiness,30);
 assert.equal(s.player.readLiterature[comic.modData.literatureTitle],0);assert.equal(comic.alreadyReadPages,-1);assert.ok(sim.inventory.state.items[comic.id]);
 assert.equal(sim.readBook(comic.id),true);advance(sim,251);assert.equal(s.player.boredom,20);
 const restored=parseSave(sim.serialize());assert.equal(restored.player.readLiterature[comic.modData.literatureTitle],0);
 s.nightsSurvived=45;sim.readBook(comic.id);advance(sim,251);assert.equal(s.player.boredom,0);assert.equal(s.player.readLiterature[comic.modData.literatureTitle],45);
});
test('ordinary reading cancellation never applies effects or title memory',()=>{
 const {sim,s}=fixture(),comic=sim.inventory.create('Base.ComicBook');comic.modData={literatureTitle:'issue'};s.player.boredom=50;
 sim.readBook(comic.id);advance(sim,10);sim.cancel();assert.equal(s.player.boredom,50);assert.equal(s.player.readLiterature,undefined);
});

test('save import rejects malformed literature metadata, emotions and day counters',()=>{
 const {sim}=fixture(),base=JSON.parse(sim.serialize());
 for(const [key,values]of [['nightsSurvived',[null,'0',.5,2147483648]]])for(const value of values){const s=structuredClone(base);s[key]=value;assert.throws(()=>parseSave(JSON.stringify(s)));}
 for(const[key,values]of [['stress',[null,'0',-.1,1.1]],['boredom',[null,'0',-1,101]],['unhappiness',[null,'0',-1,101]]])for(const value of values){const s=structuredClone(base);s.player[key]=value;assert.throws(()=>parseSave(JSON.stringify(s)));}
 for(const fields of [{modData:null},{modData:[]},{modData:{literatureTitle:17}},{displayName:[]},{alreadyRead:1}]){const s=structuredClone(base);Object.assign(Object.values(s.inventory.items)[0],fields);assert.throws(()=>parseSave(JSON.stringify(s)));}
 const valid=structuredClone(base);valid.nightsSurvived=-1;Object.assign(Object.values(valid.inventory.items)[0],{modData:{literatureTitle:'',other:{preserved:1}},displayName:'',alreadyRead:false});assert.deepEqual(parseSave(JSON.stringify(valid)),valid);
});
test('reading queues open, normal-speed animation flip and one cancellation close',()=>{
 const {sim,book}=fixture();sim.readBook(book.id);assert.deepEqual(sim.soundEvents.splice(0),['OpenBook']);advance(sim,38);assert.deepEqual(sim.soundEvents.splice(0),['PageFlipBook']);sim.cancel();sim.cancel();assert.deepEqual(sim.soundEvents.splice(0),['CloseBook']);
 sim.readBook(book.id);sim.soundEvents=[];sim.speed=5;advance(sim,10);assert.deepEqual(sim.soundEvents,[]);sim.cancel();assert.deepEqual(sim.soundEvents,['CloseBook']);
});

test('non-carpentry skill action resumes, completes and roundtrips its own bonus',()=>{
 catalog['Base.TestAimingBook']={name:'Aiming volume 1',properties:{ItemType:'base:literature',SkillTrained:'Aiming',NumberOfPages:220,LvlSkillTrained:1,NumLevelsTrained:2}};
 const {sim,s}=fixture(),item=sim.inventory.create('Base.TestAimingBook');
 s.player.readPages={[item.type]:219};s.player.skillLevels={woodwork:10,aiming:0};
 assert.equal(sim.consume(item.id),true);advance(sim,51);assert.equal(sim.action,null);
 assert.equal(item.alreadyReadPages,220);assert.deepEqual(s.player.xpMultipliers,{aiming:{multiplier:1.5,minLevel:1,maxLevel:2}});
 assert.deepEqual(parseSave(sim.serialize()).player.xpMultipliers,s.player.xpMultipliers);
});
