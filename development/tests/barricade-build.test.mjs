import test from 'node:test';
import assert from 'node:assert/strict';
import {useFixtureCatalog} from './fixtures/catalog.mjs';
import {World} from '../src/world.js';
import {Simulation,newState} from '../src/simulation.js';
import {addBarricadePlank,canAddBarricadePlank,woodBarricadeDuration} from '../src/barricades.js';
const catalog=useFixtureCatalog();
function fixture(){
 const w=new World({cells:[]},{floor:{solidfloor:''},window:{windowN:''}}),squares=new Map();
 for(let x=0;x<8;x++)for(let y=0;y<8;y++)squares.set(`${x},${y},0`,{x,y,z:0,room:-1,tiles:['floor']});
 w.cells.set('0_0',{squares});w.square(3,3).tiles.push('window');
 const s=newState([3.5,3.5,0]),sim=new Simulation(w,s);sim.spawnNearby=()=>{};
 const obj=w.interactions(s.player).find(o=>o.type==='window');
 sim.inventory.create('hammer');for(let i=0;i<5;i++)sim.inventory.create('plank');for(let i=0;i<10;i++)sim.inventory.create('nails');
 const finish=()=>{for(let i=0;i<51;i++)sim.tick(.1);};
 return {w,s,sim,obj,finish,current:()=>w.state(3,3,0,'window')};
}
test('plank condition and woodwork modifiers use source integer health, filling first vacant slot',()=>{
 const expected=[1000,1000,1100,1140,1180,1220,1260,1300,1340,1400,1500];
 expected.forEach((health,level)=>assert.equal(addBarricadePlank(null,10,10,level).plankHealth[0],health));
 const before={plankHealth:[90,0,70,0]},after=addBarricadePlank(before,5,10,10);
 assert.deepEqual(after.plankHealth,[90,750,70,0]);assert.deepEqual(before.plankHealth,[90,0,70,0]);
 assert.equal(addBarricadePlank(null,1,3,10).plankHealth[0],499);
 for(const value of [{metalHealth:1},{metalBarHealth:1},{plankHealth:[1,1,1,1]},100])assert.equal(canAddBarricadePlank(value),false);
});
test('window building consumes one plank and one nail (42.21 entity recipe), preserves open state, opposite side and prior health',()=>{
 const {w,s,sim,finish,current}=fixture();w.change(3,3,0,'window',{open:true,barricades:{same:{plankHealth:[90,0,70,0]},opposite:{plankHealth:[800]}}});
 sim.inventory.find('plank').condition=5;s.player.skillLevels={woodwork:10};s.player.skills.carpentry=123;
 assert.equal(sim.craft('barricade'),true);const equipped={...s.inventory.equipment};assert.equal(sim.craft('barricade'),false);assert.deepEqual(s.inventory.equipment,equipped);
 finish();assert.deepEqual(current().barricades.same.plankHealth,[90,750,70,0]);assert.deepEqual(current().barricades.opposite.plankHealth,[800]);assert.equal(current().open,true);
 assert.equal(sim.inventory.count('plank'),4);assert.equal(sim.inventory.count('nails'),9);assert.equal(s.player.xp.woodwork,2.5);assert.equal(s.player.skills.carpentry,123);assert.deepEqual(s.inventory.equipment,equipped);
});
test('four successive planks survive and fifth attempt does not consume materials',()=>{
 const {sim,finish,current}=fixture();for(let i=0;i<4;i++){assert.equal(sim.craft('barricade'),true);finish();}
 assert.deepEqual(current().barricades.same.plankHealth,[1000,1000,1000,1000]);assert.equal(sim.craft('barricade'),false);assert.equal(sim.inventory.count('plank'),1);assert.equal(sim.inventory.count('nails'),6);
});
test('cancellation and mid-action material, equipment, side or capacity changes do not consume remaining materials',()=>{
 for(const mutation of ['cancel','equipment','nails','capacity','side']){
  const {w,s,sim,finish,current}=fixture();assert.equal(sim.craft('barricade'),true);
  if(mutation==='cancel')sim.cancel();
  if(mutation==='equipment')sim.inventory.remove(sim.inventory.find('hammer').id);
  if(mutation==='nails')for(let i=0;i<10;i++)sim.inventory.remove(sim.inventory.find('nails').id);
  if(mutation==='capacity')w.change(3,3,0,'window',{barricades:{same:{plankHealth:[1,1,1,1]}}});
  if(mutation==='side')s.player.y=2.5;
  finish();assert.equal(sim.action,null);assert.equal(sim.inventory.count('plank'),5);assert.equal(sim.inventory.count('nails'),mutation==='nails'?0:10);assert.equal(s.player.xp,undefined);
  if(mutation!=='capacity')assert.equal(current().barricades,undefined);
 }
});
test('nominal construction timer starts a transient animation and clears it on completion, cancel and serialization',()=>{
 const {sim,s,finish}=fixture();sim.craft('barricade');assert.ok(Math.abs(sim.action.duration-200/48)<1e-10);sim.tick(.1);assert.equal(s.player.buildMotion.elapsed,.1);
 assert.equal(JSON.parse(sim.serialize()).player.buildMotion,undefined);sim.cancel();assert.equal(s.player.buildMotion,undefined);
 s.player.skillLevels={woodwork:10};s.player.traits=['Handy'];sim.craft('barricade');assert.equal(sim.action.duration,150/48);finish();assert.equal(s.player.buildMotion,undefined);
});

test('one remaining nail is consumed; zero nails allows the action but fails at commit',()=>{
 const {sim,finish,current}=fixture();
 for(let i=0;i<9;i++)sim.inventory.remove(sim.inventory.find('nails').id);
 assert.equal(sim.craft('barricade'),true);finish();
 assert.equal(sim.inventory.count('nails'),0);assert.equal(sim.inventory.count('plank'),4);
 assert.deepEqual(current().barricades.same.plankHealth,[1000,0,0,0]);
 assert.equal(sim.craft('barricade'),true);finish();assert.equal(sim.inventory.count('plank'),4);
 assert.match(sim.state.journal[0],/consumption failed/);
});

test('active entity recipe overrides generic carpentry time reduction at every level',()=>{
 for(let level=0;level<=10;level++){
  assert.equal(woodBarricadeDuration(level,false),200/48);
  assert.equal(woodBarricadeDuration(level,true),150/48);
 }
 const {sim,finish}=fixture();sim.craft('barricade');
 for(let i=0;i<25;i++)sim.tick(.1);
 assert.ok(sim.action,'old 100-unit timer must not complete the 200-unit recipe');
 assert.equal(sim.inventory.count('plank'),5);finish();assert.equal(sim.inventory.count('plank'),4);
});

test('entity visual props leave equipment and encumbrance unchanged across build, cancel and completion',()=>{
 const {sim,s,finish}=fixture(),held=sim.inventory.create('plank');
 sim.inventory.equip(held.id,'secondary');
 const before={...s.inventory.equipment},weight=sim.inventory.encumbrance();
 assert.equal(sim.craft('barricade'),true);
 assert.deepEqual(s.inventory.equipment,before);assert.equal(sim.inventory.encumbrance(),weight);
 assert.equal(s.player.buildMotion.handModels.secondary,null);
 sim.cancel();assert.deepEqual(s.inventory.equipment,before);assert.equal(s.player.buildMotion,undefined);
 sim.craft('barricade');finish();assert.deepEqual(s.inventory.equipment,before);
 assert.equal(s.player.buildMotion,undefined);
});

test('tagged alternative and favorite hammers are retained, broken hammers are skipped',()=>{
 for(const type of ['Base.BallPeenHammer','Base.HammerStone']){
  const {sim,s,finish}=fixture();sim.inventory.find('hammer').condition=0;
  const tool=sim.inventory.create(type,'player',{favorite:true});
  assert.equal(sim.craft('barricade'),true);assert.equal(s.player.buildMotion.handModels.primary,type==='Base.HammerStone'?'StoneHammer':'BallPeenHammer');
  finish();assert.equal(sim.inventory.state.items[tool.id],tool);assert.equal(sim.inventory.count('plank'),4);
 }
});
test('favorite consumed inputs are skipped and their exact identities survive completion',()=>{
 const {sim,finish}=fixture(),plank=sim.inventory.find('plank'),nail=sim.inventory.find('nails');plank.favorite=true;nail.favorite=true;
 assert.equal(sim.craft('barricade'),true);finish();
 assert.equal(sim.inventory.state.items[plank.id],plank);assert.equal(sim.inventory.state.items[nail.id],nail);
 assert.equal(sim.inventory.count('plank'),4);assert.equal(sim.inventory.count('nails'),9);
});
test('unusable inputs allow the action but fail consumption without partial materials or XP',()=>{
 for(const phase of ['before','during'])for(const change of ['hammerCondition','hammerBroken','plankFavorite','nailsFavorite']){
  const {sim,finish,s}=fixture();
  if(phase==='during')assert.equal(sim.craft('barricade'),true);
  if(change==='hammerCondition')sim.inventory.find('hammer').condition=0;
  if(change==='hammerBroken')sim.inventory.find('hammer').broken=true;
  if(change==='plankFavorite')sim.inventory.list().filter(i=>i.type==='Base.Plank').forEach(i=>i.favorite=true);
  if(change==='nailsFavorite')sim.inventory.list().filter(i=>i.type==='Base.Nails').forEach(i=>i.favorite=true);
  if(phase==='before')assert.equal(sim.craft('barricade'),true);
  sim.tick(.1);assert.ok(sim.action,'input eligibility must not abort the action before commit');
  finish();assert.equal(sim.inventory.count('plank'),5);assert.equal(sim.inventory.count('nails'),10);assert.equal(s.player.xp,undefined);
 }
});

test('recipe exclusion is character-name specific, independent of favorite, and rechecked during the action',()=>{
 for(const kind of ['Base.Hammer','Base.Plank','Base.Nails'])for(const phase of ['before','during']){
  const {sim,s,finish}=fixture();s.player.fullName='Deidra Shipp';
  if(phase==='during')assert.equal(sim.craft('barricade'),true);
  sim.inventory.list().filter(i=>i.type===kind).forEach(i=>i.noRecipesOwner='Deidra Shipp');
  if(phase==='before')assert.equal(sim.craft('barricade'),true);
  sim.tick(.1);assert.ok(sim.action,'input eligibility must not abort the action before commit');
  finish();assert.equal(sim.inventory.count('plank'),5);assert.equal(sim.inventory.count('nails'),10);assert.equal(s.player.xp,undefined);
  s.player.fullName='Another Survivor';assert.equal(sim.craft('barricade'),true);sim.cancel();
  s.player.fullName='Deidra Shipp';sim.inventory.list().forEach(i=>i.noRecipesOwner=false);
  sim.inventory.find('hammer').favorite=true;assert.equal(sim.craft('barricade'),true);
 }
});


test('eligibility restored during a build is selected at commit, without restarting the action',()=>{
 const {sim,s,finish,current}=fixture();
 for(const item of sim.inventory.list())item.noRecipesOwner='Survivor';
 assert.equal(sim.craft('barricade'),true);sim.tick(.5);assert.ok(sim.action);
 assert.equal(current().barricades,undefined);
 for(const item of sim.inventory.list())item.noRecipesOwner=false;
 finish();assert.equal(sim.inventory.count('plank'),4);assert.equal(sim.inventory.count('nails'),9);
 assert.equal(s.player.xp.woodwork,2.5);
});

function stoneBuild({spare=false,head=8}={}){
 for(const type of ['Splinters','Stone2','Branch_Broken'])catalog['Base.'+type]={type:'Base.'+type,name:type,properties:{ItemType:'base:weapon',ConditionMax:10,Weight:.1},components:[]};
 const f=fixture();if(!spare)f.sim.inventory.remove(f.sim.inventory.find('hammer').id);
 const stone=f.sim.inventory.create('Base.HammerStone','player',{condition:1,headCondition:head});f.sim.inventory.equip(stone.id);
 const bounds=[];f.sim.wearRandom=n=>{bounds.push(n);return bounds.length===2?0:n-1;};
 return {...f,stone,bounds};
}
test('primary stone hammer breaks before failed recipe; parts persist and broken tool is not reused',()=>{
 const {sim,stone,finish,current,bounds}=stoneBuild();assert.equal(sim.craft('barricade'),true);finish();
 assert.equal(sim.inventory.state.items[stone.id],undefined);assert.equal(sim.inventory.count('plank'),5);assert.equal(sim.inventory.count('nails'),10);assert.equal(current().barricades,undefined);
 const floor=sim.inventory.list(sim.groundContainer());assert.deepEqual(floor.map(x=>x.type),['Base.Splinters','Base.Stone2']);
 for(const piece of floor){assert.deepEqual(piece.groundOffset,{x:Math.fround(.99),y:Math.fround(.99),z:0});assert.equal(piece.worldZRotation,359);}
 assert.equal(sim.inventory.state.items[sim.inventory.state.equipment.primary].type,'Base.Branch_Broken');
 assert.deepEqual(bounds,[5,5,100,100,360,100,100,360,10]);
 const loaded=JSON.parse(sim.serialize());assert.equal(Object.values(loaded.inventory.items).filter(x=>x.groundOffset).length,2);
});
test('recipe reselects a spare hammer after primary break and completes construction',()=>{
 const {sim,finish,current}=stoneBuild({spare:true});sim.craft('barricade');finish();
 assert.equal(sim.inventory.count('plank'),4);assert.equal(sim.inventory.count('nails'),9);assert.equal(current().barricades.same.plankHealth[0],1000);
 assert.equal(sim.inventory.state.items[sim.inventory.state.equipment.primary].type,'Base.Branch_Broken');
});
test('head failure breaks once despite subsequent general damage; cancellation never applies wear',()=>{
 const {sim,stone,finish}=stoneBuild({head:1});sim.wearRandom=()=>0;sim.craft('barricade');finish();
 assert.equal(sim.inventory.list(sim.groundContainer()).length,2);assert.equal(sim.inventory.list(sim.groundContainer()).find(x=>x.type==='Base.Stone2').condition,0);assert.equal(sim.inventory.state.items[stone.id],undefined);
 const other=stoneBuild();other.sim.craft('barricade');other.sim.cancel();other.finish();assert.equal(other.stone.condition,1);assert.equal(other.stone.headCondition,8);assert.deepEqual(other.bounds,[]);
});

test('retained stone hammer may break during successful recipe processing without rolling back the build',()=>{
 const {sim,stone,finish,current}=stoneBuild();const bounds=[];
 sim.wearRandom=n=>{bounds.push(n);return bounds.length<=2?n-1:0;};
 sim.craft('barricade');finish();assert.equal(sim.inventory.state.items[stone.id],undefined);
 assert.equal(current().barricades.same.plankHealth[0],1000);assert.equal(sim.inventory.count('plank'),4);assert.equal(sim.state.player.xp.woodwork,2.5);
 assert.deepEqual(bounds.slice(0,4),[5,5,30,30]);
});
test('recipe wear applies to a retained unequipped stone hammer and uses actual primary weapon skill',()=>{
 const {sim,s,stone,finish,current}=stoneBuild();Object.assign(catalog['Base.HammerStone'].properties,{ItemType:'base:weapon',Categories:'base:smallblunt'});
 catalog['Base.BaseballBat'].properties.Categories='base:blunt';const bat=sim.inventory.create('bat');sim.inventory.equip(bat.id);
 s.player.skillLevels={woodwork:4,maintenance:3,blunt:4,smallblunt:10};const bounds=[];
 sim.wearRandom=n=>{bounds.push(n);return 0;};sim.craft('barricade');finish();
 assert.equal(bounds[0],38);assert.equal(sim.inventory.state.items[stone.id],undefined);assert.equal(s.inventory.equipment.primary,bat.id);
 assert.equal(current().barricades.same.plankHealth[0],1180);assert.equal(sim.inventory.count('plank'),4);
});

test('recipe level-up affects the same build health and retained-tool wear',()=>{
 const {sim,s,finish,current}=fixture();sim.inventory.find('hammer').condition=0;
 const stone=sim.inventory.create('Base.HammerStone','player',{condition:5,headCondition:5});
 s.player.xp={woodwork:222.5};s.player.skillLevels={woodwork:1};
 const denominators=[];sim.wearRandom=n=>{denominators.push(n);return n-1;};
 assert.equal(sim.craft('barricade'),true);finish();
 assert.equal(s.player.xp.woodwork,225);assert.equal(s.player.skillLevels.woodwork,2);
 assert.equal(current().barricades.same.plankHealth[0],1100);
 assert.deepEqual(denominators,[32,32]);assert.equal(stone.headCondition,5);
});
