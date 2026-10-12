import {ensureMedical,injury,advanceMedical,validateMedical,planTreatment,treatWound,BODY_PARTS} from './medical.js';
import {buildingRecipes,planBuilding,planBuildingMaterials,commitBuilding,validateBuildings} from './building.js';
import {advanceCooking,ensureAppliance,isCookingAppliance,validateCookingState} from './cooking.js';
import {craftingRecipes,planCraft,commitCraft} from './crafting.js';
import {completeReadingKnowledge} from './recipe-knowledge.js';
import {consumeCraftInputs} from './craft-consumption.js';
import {readingSound,readingPageFlips} from './reading-sounds.js';
import {ordinaryLiterature,applyLiteratureEffects,isLiteratureRead,addReadLiterature,advanceReadingClock,skillBook,readingComprehension,prepareBookReading,bookReadingDuration,updateBookPages,validateReadingState} from './reading.js';
import {transferDuration} from './item-transfer.js';
import {groundDropPlacement} from './ground-placement.js';
import {damageCheck} from './item-wear.js';
import {breakCarriedStoneHammer} from './item-breakage.js';
import {weaponSprite} from './item-model-state.js';
import {recipeWearModifier} from './recipe-wear.js';
import {selectBarricadeInputs,barricadeInputsValid,barricadeInputScripts} from './recipe-inputs.js';
import {awardWoodworkXp,validateWoodworkProgression} from './progression.js';
import {startWindowTurn,advanceWindowTurn} from './window-turn.js';
import {doorToggle} from './doors.js';
import {canAddBarricadePlank,addBarricadePlank,woodBarricadeDuration} from './barricades.js';
import {findTilePath} from './pathfinding.js';
import {Inventory,inventoryState,definition,itemType,validateInventory} from './inventory.js';
import {canToggleWindow,canClimbWindow,windowLanding,hasWindowBarricade,windowBarricadeSide} from './windows.js';
import {windowTogglePhase,advanceWindowOpening,OPEN_STAGES} from './window-toggle.js';
import {WINDOW_FINISH_TIME,windowPhase,advanceWindowPosition,windowRootDelta} from './window-traversal.js';
// Browser implementation under development. Values below are provisional design
// values, not claimed PZ-compatible until source-runtime differential validation.
export const ITEMS={
 water:{name:'瓶装水',weight:1,thirst:45,icon:'Item_WaterBottleFull'},
 beans:{name:'罐装豆子',weight:.8,hunger:35,icon:'Item_TinnedBeans'},
 cereal:{name:'麦片',weight:.5,hunger:22,icon:'Item_Cereal'},
 bandage:{name:'绷带',weight:.1,heal:12,icon:'Item_Bandage'},
 bat:{name:'棒球棍',weight:2,damage:28,icon:'Item_BaseballBat'},
 axe:{name:'斧头',weight:3,damage:40,icon:'Item_Axe'},
 knife:{name:'厨房刀',weight:.3,damage:18,icon:'Item_KitchenKnife'},
 plank:{name:'木板',weight:3,icon:'Item_Plank'},nails:{name:'钉子',weight:.1,icon:'Item_Nails'},
 hammer:{name:'锤子',weight:1,damage:16,icon:'Item_Hammer'},
 rag:{name:'布条',weight:.05,icon:'Item_RippedSheets'},
 seeds:{name:'种子',weight:.05,icon:'Item_Seeds'},
 book:{name:'木工书',weight:.8,icon:'Item_Book'},
 lighter:{name:'打火机',weight:.1,icon:'Item_Lighter'},
 rawfood:{name:'生鲜食材',weight:.4,hunger:10,icon:'Item_Steak'},
 meal:{name:'熟食',weight:.4,hunger:32,icon:'Item_Steak'},
};
export const RECIPES=[
 {id:'bandage',name:'制作简易绷带',needs:{rag:2},gives:{bandage:1},seconds:3},
 {id:'barricade',name:'加固门窗',needs:{plank:1,nails:1},tool:'hammer',gives:{},seconds:5},
 {id:'meal',name:'烹饪食材',needs:{rawfood:1},tool:'lighter',gives:{meal:1},seconds:6,near:'stove'},
];
export const clamp=(v,min=0,max=100)=>Math.min(max,Math.max(min,v));
export function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function weight(bag){return Object.entries(bag).reduce((sum,[id,n])=>sum+(ITEMS[id]?.weight||0)*n,0);}
export function transfer(from,to,id,capacity=20){if(!ITEMS[id]||!Number.isInteger(from[id])||from[id]<1)return {ok:false,reason:'物品不存在'};
 if(weight(to)+ITEMS[id].weight>capacity+1e-8)return {ok:false,reason:'负重已满'};
 from[id]--;if(!from[id])delete from[id];to[id]=(to[id]||0)+1;return {ok:true};}
export function newState(spawn){const inventory=inventoryState(), inv=new Inventory(inventory);for(const[type,n]of Object.entries({water:2,beans:2,bandage:2,bat:1}))for(let i=0;i<n;i++){const item=inv.create(type);if(item.fluid)item.fluid.amount=item.fluid.capacity;}inv.equip(inv.find('bat').id);return {version:2,inventory,time:9*60,elapsed:0,player:{x:spawn[0],y:spawn[1],z:spawn[2],angle:0,hp:100,hunger:5,thirst:5,fatigue:0,endurance:100,bleeding:0,infection:0,capacity:12,weapon:'bat',kills:0,skills:{carpentry:0,cooking:0,combat:0}},containers:{},zombies:[],spawned:{},corpses:[],builds:[],journal:['你醒在 Rosewood 的一间住宅里。找到补给，活下去。'],changes:{},weather:'clear',seed:25485521};}
export class Simulation{
 constructor(world,state,animationData=null){this.animationData=animationData;this.world=world;this.state=state;this.inventory=new Inventory(state.inventory);this.action=null;this.paused=false;this.speed=1;this.attackCooldown=0;world.changes=state.changes;world.builds=state.builds??=[];world.reindexBuilds?.();world.revision++;this.events=[];this.soundEvents=[];}
 log(message){this.state.journal.unshift(message);this.state.journal.length=Math.min(30,this.state.journal.length);this.events.push(message);}
 container(obj){const id='world:'+obj.id;if(this.state.inventory.containers[id]){if(isCookingAppliance(obj))ensureAppliance(this.state.inventory.containers[id],obj.props.container);return id;}const inv=this.inventory;inv.container(id,obj.name,Number(obj.props.ContainerCapacity)||50);
  const rng=random(hash(obj.id)),kind=obj.props.container||'';if(isCookingAppliance(obj))ensureAppliance(inv.state.containers[id],kind);
  let pool=['rag','book','bandage','lighter','pen'];
  if(/fridge|freezer|stove/.test(kind))pool=['rawfood','water','beans'];
  else if(/counter|crate|shelves|metal/.test(kind))pool=['beans','cereal','water','nails','hammer','plank','seeds','knife','opener','backpack'];
  for(let i=0,n=2+Math.floor(rng()*4);i<n;i++){const item=inv.create(pool[Math.floor(rng()*pool.length)],id);if(item.fluid)item.fluid.amount=item.fluid.capacity;}
  return id;
 }
 setAppliance(obj,changes){
  if(!isCookingAppliance(obj)||!this.world.interactions(this.state.player).some(o=>o.id===obj.id))return false;
  const a=ensureAppliance(this.inventory.state.containers[this.container(obj)],obj.props.container);
  if(changes.on!==undefined)a.on=!!changes.on;
  if(changes.targetTemperature!==undefined&&Number.isFinite(changes.targetTemperature))a.targetTemperature=Math.max(50,Math.min(300,changes.targetTemperature));
  this.log(a.on?'炉灶开始加热':'炉灶已关闭');return true;
 }
 startAction(name,seconds,complete,{target=null}={}){if(this.action||this.state.player.hp<=0)return false;this.action={name,duration:seconds,left:seconds,complete,target,origin:[this.state.player.x,this.state.player.y,this.state.player.z]};return true;}
 cancel(){if(this.state.player.windowMotion)return; if(this.action){if(this.action.reading)this.soundEvents.push(readingSound(this.action.reading.item.type,'Close'));delete this.state.player.windowToggle;delete this.state.player.windowApproach;delete this.state.player.windowTurn;delete this.state.player.buildMotion;delete this.state.player.readMotion;this.log(`${this.action.name}已取消`);this.action=null;}}
 treat(part,action,itemId){
  const p=this.state.player,plan=planTreatment(p,this.inventory,part,action,itemId);if(!plan.ok){this.log(plan.reason);return false;}
  const name=({bandage:'包扎',remove:'拆除绷带',disinfect:'消毒'})[action]+BODY_PARTS[part];
  return this.startAction(name,Math.max(1,(120-4*(p.skillLevels?.doctor??0))/30),()=>{const result=treatWound(p,this.inventory,part,action,itemId);this.log(result.ok?name+'完成':result.reason);});
 }
 consume(id,fraction=1){const inv=this.inventory,item=inv.state.items[id]||inv.find(id);if(!item)return false;const d=definition(item.type),p=d.properties;
  if(p.ItemType==='base:weapon'||p.ItemType==='base:container'){const r=inv.equip(item.id,p.CanBeEquipped==='base:back'?'back':'primary');this.log(r.ok?`装备${d.name}`:r.reason);return r.ok;}
  if(skillBook(p)||ordinaryLiterature(p))return this.readBook(item.id);
  if(p.CanBandage){const part=Object.entries(ensureMedical(this.state.player).parts).find(([,w])=>!w.bandage&&w.remaining>0)?.[0];if(!part){this.log('没有需要包扎的伤口');return false;}return this.treat(part,'bandage',item.id);}
  if(p.CantEat){this.log('需要先开罐，不能直接食用');return false;}
  if(!p.HungerChange&&!item.fluid?.amount&&!p.CanBandage)return false;
  return this.startAction(`使用${d.name}`,2,()=>{
   if(!inv.state.items[item.id]||item.container!=='player')return;const player=this.state.player;
   if(item.fluid?.amount){const amount=Math.min(item.fluid.amount,.25);item.fluid.amount-=amount;player.thirst=clamp(player.thirst-amount*45);}
   else {const result=inv.consumeFood(item.id,fraction);if(result.ok)player.hunger=clamp(player.hunger-result.hunger);else this.log(result.reason);}
   this.log(`已使用${d.name}`);
  });
 }
 readBook(id){
  const item=this.inventory.state.items[id],p=this.state.player;
  if(this.action||!item||this.inventory.root(item.container)!=='player'||p.hp<=0)return false;
  const d=definition(item.type),book=skillBook(d.properties)||ordinaryLiterature(d.properties);if(!book)return false;
  const valid=()=>this.inventory.state.items[id]===item&&this.inventory.root(item.container)==='player'&&(book.pages<0||(item.alreadyReadPages??0)<=book.pages)&&!p.tooDarkToRead&&!(p.driving&&p.vehicleEngineRunning&&p.vehicleSpeed!==0);
  if(!valid()){this.log('当前无法阅读');return false;}
  const start=book.ordinary?0:prepareBookReading(p,item,book);
  const tags=String(d.properties.Tags??'').split(';');
  let units=bookReadingDuration(book,p,{minutesPerPage:this.state.sandbox?.minutesPerPage??2,minutesPerDay:this.state.sandbox?.minutesPerDay??60,fastRead:tags.includes('base:fastread'),instant:!!p.timedActionInstant});
  if(units>1)units*=(1+(p.moodles?.unhappy??0)/4)*(1+(p.moodles?.drunk??0)/4)*(p.timedActionTimeModifier??1);
  if(!this.startAction(`阅读${item.displayName??d.name}`,units/48,()=>{
   if(book.ordinary){
    const title=item.modData?.literatureTitle,day=this.state.nightsSurvived??0,cooldown=this.state.sandbox?.literatureCooldown??45;
    const recent=title!==undefined&&isLiteratureRead(p,title,day,cooldown);
    if(!recent)applyLiteratureEffects(p,d.properties,item.alreadyRead===true);
    completeReadingKnowledge(p,item,d.properties,!recent);
    if(title!==undefined)addReadLiterature(p,title,day,cooldown);
    item.alreadyReadPages=book.pages;
   }else{
   completeReadingKnowledge(p,item,d.properties,false);
   updateBookPages(p,item,book,1);
   p.xpMultipliers??={};p.xpMultipliers[book.perk]={multiplier:book.maxMultiplier,minLevel:book.minLevel,maxLevel:book.maxLevel};
   }
   this.soundEvents.push(readingSound(item.type,'Close'));delete p.readMotion;this.log('阅读完成');
  }))return false;
  this.soundEvents.push(readingSound(item.type,'Open'));
  p.readMotion={elapsed:0,handModels:{primary:null,secondary:d.properties.StaticModel??null}};
  this.action.valid=valid;
  this.action.reading={item,book,elapsed:book.ordinary?0:this.action.duration*(start/book.pages),pageTimer:0,unhappiness:p.unhappiness??0};
  this.action.left=Math.max(0,this.action.duration-this.action.reading.elapsed);
  return true;
 }
 openCan(id){const inv=this.inventory,item=inv.state.items[id];if(!item||item.type!=='Base.TinnedBeans'||item.container!=='player')return false;
  if(!inv.list().some(i=>String(definition(i.type).properties.Tags||'').split(';').includes('base:canopener'))){this.log('需要开罐器');return false;}
  return this.startAction('打开罐头',3,()=>{if(inv.state.items[id]&&item.container==='player'&&inv.list().some(i=>String(definition(i.type).properties.Tags||'').split(';').includes('base:canopener'))){inv.remove(id);inv.create('Base.OpenBeans');}});
 }
 build(id,x,y,z,rotation=0){
  const recipe=buildingRecipes().find(r=>r.id===id),player=this.state.player;
  const placement=planBuilding(this.world,player,recipe,x,y,z,rotation);if(!placement.ok){this.log(placement.reason);return false;}
  const plan=planBuildingMaterials(recipe,this.inventory,player);if(!plan.ok){this.log(plan.reason);return false;}
  return this.startAction('建造'+recipe.name,Math.max(.5,recipe.time/30),()=>{
   const result=commitBuilding(this.world,this.inventory,player,recipe,x,y,z,rotation);if(!result.ok){this.log(result.reason);return;}
   awardWoodworkXp(Number(String(recipe.properties.xpAward).split(':')[1])||0,player,this.state.sandbox);this.log(recipe.name+'建造完成');
  });
 }
 craftCatalog(id,count=1){
  const recipe=craftingRecipes().find(r=>r.id===id);if(!recipe||this.action)return false;
  count=Math.max(1,Math.min(100,Math.trunc(count)||1));if(!recipe.allowBatchCraft)count=1;
  const next=remaining=>{const plan=planCraft(recipe,this.inventory,this.state.player);if(!plan.ok){this.log(plan.reason);return false;}
   const started=this.startAction(`${recipe.name} · 剩余 ${remaining}`,Math.max(.5,recipe.time/30),()=>{
    const result=commitCraft(recipe,this.inventory,this.state.player);if(!result.ok){this.log(result.reason);return;}
    this.log(`${recipe.name}完成`);if(remaining>1)next(remaining-1);
   });if(started)this.action.craftRemaining=remaining;return started;
  };return next(count);
 }
 craft(id){const recipe=RECIPES.find(r=>r.id===id);if(!recipe)return false;const inv=this.inventory;
  const valid=()=>Object.entries(recipe.needs).every(([i,n])=>inv.count(i)>=n)&&(!recipe.tool||inv.count(recipe.tool));
  if(id!=='barricade'&&!valid()){this.log('材料或工具不足');return false;}
  if(recipe.near&&!this.world.interactions(this.state.player).some(o=>o.props.container===recipe.near)){this.log('需要靠近炉灶');return false;}
  const barrier=id==='barricade'?this.world.interactions(this.state.player).find(o=>o.type==='door'||o.type==='window'):null;
  if(id==='barricade'&&!barrier){this.log('需要靠近门窗');return false;}
  if(barrier?.type==='window')return this.barricadeWindow(barrier);
  if(!valid()){this.log('材料或工具不足');return false;}
  return this.startAction(recipe.name,recipe.seconds,()=>{
   if(!valid())return;
   for(const[type,n]of Object.entries(recipe.needs))for(let i=0;i<n;i++)inv.remove(inv.find(type).id);
   for(const[type,n]of Object.entries(recipe.gives))for(let i=0;i<n;i++)inv.create(type);
   if(barrier)this.world.change(barrier.x,barrier.y,barrier.z,barrier.tile,{barricade:100,open:false}); // Door construction still uses the legacy state.
   this.state.player.skills[id==='meal'?'cooking':'carpentry']+=2;this.log(`${recipe.name}完成`);
  },{target:barrier?.id});
 }
 barricadeWindow(obj){
  if(this.action||this.state.player.hp<=0)return false;
  const inv=this.inventory,p=this.state.player,side=windowBarricadeSide(obj,p);
  const current=()=>this.world.state(obj.x,obj.y,obj.z,obj.tile);
  const {hammer}=selectBarricadeInputs(inv,p);
  const valid=()=>this.world.interactions(p).some(o=>o.id===obj.id)&&windowBarricadeSide(obj,p)===side&&!current().barricade&&canAddBarricadePlank(current().barricades?.[side]);
  if(!valid()){this.log('无法添加木板：检查本侧封堵');return false;}
  const duration=woodBarricadeDuration(p.skillLevels?.woodwork??0,!!p.traits?.includes('Handy'));
  // Approach and equipment preparation timing remain provisional.
  if(!this.startAction('添加封窗木板',duration,()=>{
   delete p.buildMotion;
   if(!valid()){this.log('封窗状态已变化，建造中止');return;}
   // ISBuildAction performs primary-hand crude-tool wear before recipe create.
   // The StoneHammer route is integrated here; other CRUDE tools and recipe
   // callbacks still require their own integration and source comparisons.
   this.wearBuildStoneHammer();
   // Entity placement/action validity differs from final recipe consumption.
   // Automatic input selection runs again at commit, including changed marks.
   const inputs=selectBarricadeInputs(inv,p),{material,nail}=inputs;
   if(!barricadeInputsValid(inv,inputs,p)){this.log('封窗配方消费失败：没有可用材料或工具');return;}
   // CraftRecipeData.perform awards XP before keep-input processing and
   // the entity's later barricade creation callback.
   awardWoodworkXp(10,p,this.state.sandbox);
   const previous=current(),built=addBarricadePlank(previous.barricades?.[side],material.condition,Number(definition(material.type).properties.ConditionMax)||10,p.skillLevels?.woodwork??0);
   if(!built)return;
   // Successful recipe input processing independently wears its retained tool.
   // It is not an eligibility check: a tool breaking here does not undo build.
   const primary=inv.state.items[inv.state.equipment.primary];
   consumeCraftInputs(inv,[
    {input:barricadeInputScripts.hammer,itemIds:[inputs.hammer.id]},
    {input:barricadeInputScripts.material,itemIds:[material.id]},
    {input:barricadeInputScripts.nail,itemIds:[nail.id]},
   ],{onKeepInput:item=>this.wearStoneHammer(item,{scale:6,addedChance:recipeWearModifier(p,definition(item.type).properties,primary?definition(primary.type).properties:null,['woodwork'])})});
   this.world.change(obj.x,obj.y,obj.z,obj.tile,{barricades:{...previous.barricades,[side]:built}});
   this.log('添加封窗木板完成');
  },{target:obj.id}))return false;
  // Entity Prop1 is a visual action prop, not ToolRight or actual equipment.
  this.action.valid=valid;
  const landing=windowLanding(obj,p),facing=landing?Math.atan2(landing.y-(Math.floor(p.y)+.5),landing.x-(Math.floor(p.x)+.5)):p.angle;
  const hp=hammer?definition(hammer.type).properties:{};
  const handModel=hammer?weaponSprite(hammer,hp)??hp.StaticModel:null;
  p.buildMotion={elapsed:0,turn:startWindowTurn(this.animationData,p.angle,facing),handModels:{primary:handModel??null,secondary:null}};
  if(!p.buildMotion.turn)p.angle=facing;
  return true;
 }
 wearBuildStoneHammer(){
  const inv=this.inventory,item=inv.state.items[inv.state.equipment.primary];
  return this.wearStoneHammer(item);
 }
 wearStoneHammer(item,{scale=1,addedChance=0}={}){
  const inv=this.inventory;
  if(item?.type!=='Base.HammerStone'||item.container!=='player')return false;
  const p=definition(item.type).properties,nextInt=this.wearRandom??(n=>n>0?Math.floor(Math.random()*n):0);
  const breakIfNeeded=()=>{
   if(item.condition>0||item.broken)return;
   item.broken=true;
   breakCarriedStoneHammer(inv,item,{nextInt,drop:(type,offset)=>{
    const created=inv.create(type,this.groundContainer());
    // OnBreak handlers supply square-relative offsets and literal z=0, not
    // ISTransferAction's apparent-height/centering calculation.
    const yaw=(created.worldZRotation??-1)<0?nextInt(360):created.worldZRotation;
    let x=Math.fround(offset.x),y=Math.fround(offset.y);
    if(x===0)x=Math.fround(nextInt(1000)/1000);
    if(y===0)y=Math.fround(nextInt(1000)/1000);
    Object.assign(created,{groundOffset:{x,y,z:0},worldXRotation:0,worldYRotation:0,worldZRotation:yaw});
    return created;
   }});
   this.log('石锤损坏，部件掉落在地面');
  };
  const changed=damageCheck({lowerChance:Number(p.ConditionLowerChanceOneIn??5),scale,addedChance,
   head:p.HeadCondition===undefined?null:{lowerChanceMultiplier:Number(p.HeadConditionLowerChanceMultiplier??1),reduce:()=>{
    item.headCondition=Math.max(0,(item.headCondition??Number(p.HeadCondition))-1);
    if(item.headCondition===0){item.condition=0;breakIfNeeded();}
   }},reduceCondition:()=>{item.condition=Math.max(0,item.condition-1);breakIfNeeded();}},nextInt);
  // StoneHammer's break callback equips a positive-condition handle. Source
  // ItemUtils.checkWeapon returns immediately in this state, keeping the handle.
  return changed;
 }
 interact(obj,action){if(!obj||this.state.player.windowMotion||this.state.player.windowToggle)return;const p=this.state.player;
  if(!this.world.interactions(p).some(o=>o.id===obj.id))return;
  const s=this.world.state(obj.x,obj.y,obj.z,obj.tile);
  if(obj.type==='door'){const result=doorToggle(this.world,obj,p,this.inventory);if(result.patch)this.world.change(obj.x,obj.y,obj.z,obj.tile,result.patch);if(!result.ok){this.log(result.reason);return;}this.log(s.open?'关门':'开门');}
  if(obj.type==='water')this.startAction('饮水',2,()=>{p.thirst=0;this.log('已补充水分');},{target:obj.id});
  if(obj.type==='bed'){
   if(this.state.zombies.some(z=>z.hp>0&&Math.hypot(z.x-p.x,z.y-p.y)<8)){this.log('附近有危险，无法入睡');return;}
   this.startAction('休息',8,()=>{p.fatigue=clamp(p.fatigue-65);p.endurance=100;this.state.time+=120;p.hunger=clamp(p.hunger+8);p.thirst=clamp(p.thirst+12);this.log('你休息了两个小时');},{target:obj.id});
  }
  if(obj.type==='window'){
   if(this.action)return;
   const stand=this.world.windowApproach(obj,p);
   if(!stand){this.log('窗边没有可站立的位置');return;}
   if(Math.floor(p.x)!==stand.x||Math.floor(p.y)!==stand.y){
    const route=findTilePath(this.world,p,stand);
    if(route.status!=='found'){this.log(route.status==='search-limit'?'尚未找到通往窗边的路线':'无法走到窗边');return;}
    const duration=route.path.length/1.6;
    if(this.startAction('走到窗边',duration,()=>{delete p.windowApproach;this.interact(obj,action);},{target:obj.id})){
     p.windowApproach={path:route.path,index:0,stalled:0};this.action.windowState=()=>this.world.state(obj.x,obj.y,obj.z,obj.tile);
    }return;
   }
   const current=()=>this.world.state(obj.x,obj.y,obj.z,obj.tile);
   if(action==='climb'||!action&&s.smashed){
    if(!canClimbWindow(obj.props,s)){this.log('窗户尚未打开或已被封堵');return;}
    const landing=windowLanding(obj,p);if(!landing){this.log('需要站在窗户的一侧');return;}
    const flags=this.world.flags(landing.x,landing.y,landing.z);
    if(!flags.floor||flags.solid){this.log('落点无法通行');return;}
    if(!this.startAction('翻越窗户',WINDOW_FINISH_TIME,()=>{delete p.windowMotion;},{target:obj.id}))return;
    const from={x:Math.floor(p.x)+.5,y:Math.floor(p.y)+.5,z:p.z};
    p.angle=Math.atan2(landing.y-from.y,landing.x-from.x);
    p.windowMotion={elapsed:0,from,to:landing};
    this.action.windowState=current;return;
   }
   if(s.smashed||Number.isFinite(s.health)&&s.health<=0){this.log('窗户玻璃已损坏');return;}
   if(!canToggleWindow(obj.props,s,obj,p)){this.log('窗户被锁住或封堵');return;}
   const landing=windowLanding(obj,p);if(!landing){this.log('需要站在窗户的一侧');return;}
   const facing=Math.atan2(landing.y-(Math.floor(p.y)+.5),landing.x-(Math.floor(p.x)+.5));
   const turning=startWindowTurn(this.animationData,p.angle,facing);
   if(turning){
    if(this.startAction('转向窗户',1,()=>{delete p.windowTurn;this.interact(obj,action);},{target:obj.id})){
     p.windowTurn=turning;this.action.windowState=current;this.action.windowBlocked=()=>hasWindowBarricade(current(),obj,p);
    }return;
   }
   const open=!s.open,phase=windowTogglePhase(open,0);
   if(!this.startAction(open?'开窗':'关窗',phase.duration,()=>{delete p.windowToggle;},{target:obj.id}))return;
   p.angle=Math.atan2(landing.y-(Math.floor(p.y)+.5),landing.x-(Math.floor(p.x)+.5));
   p.windowToggle={open,elapsed:0,committed:false,...(open?{stage:'start',stageElapsed:0,attempts:0}:{})};
   this.action.windowState=current;this.action.windowBlocked=()=>hasWindowBarricade(current(),obj,p);this.action.openContext={state:current,exterior:()=>this.world.isExterior(p.x,p.y,p.z),strength:p.skills.strength??5,fitness:p.skills.fitness??5,burglar:!!p.traits?.includes('Burglar'),nextInt:max=>{this.state.windowRng=(Math.imul(this.state.windowRng??this.state.seed,1664525)+1013904223)>>>0;return Math.floor(this.state.windowRng/4294967296*max);}};this.action.breakLock=()=>this.world.change(obj.x,obj.y,obj.z,obj.tile,{permaLocked:true});this.action.commitWindow=()=>{if(current().permaLocked)return;this.world.change(obj.x,obj.y,obj.z,obj.tile,{open,locked:false});this.log(open?'开窗':'关窗');};
  }
 }
 loot(obj,id,take=true,destination='player'){if(!this.world.interactions(this.state.player).some(o=>o.id===obj.id)||this.action)return false;const container=this.container(obj),inv=this.inventory,item=inv.state.items[id];
  if(!item||item.container!==(take?container:destination))return false;
  return this.moveItem(id,take?destination:container,obj.id);
 }
 groundContainer(){
  const p=this.state.player,x=Math.floor(p.x),y=Math.floor(p.y),z=p.z;
  const id=`ground:${x},${y},${z}`;
  const container=this.inventory.container(id,'地面',50);container.ground={x,y,z};return id;
 }
 dropItem(id){
  const item=this.inventory.state.items[id];
  if(!item||this.inventory.root(item.container)!=='player')return false;
  return this.moveItem(id,this.groundContainer());
 }
 takeGroundItem(id,destination='player'){
  const item=this.inventory.state.items[id];
  if(!item||item.container!==this.groundContainer()||this.inventory.root(destination)!=='player')return false;
  return this.moveItem(id,destination);
 }
 moveItem(id,dest,target=null){const inv=this.inventory,r=inv.canTransfer(id,dest);if(!r.ok){this.log(r.reason);return false;}const source=inv.state.items[id].container;
  const duration=transferDuration({weight:inv.actualWeight(inv.state.items[id]),sourceDirect:source==='player',sourceCarried:inv.root(source)==='player',destinationCarried:inv.root(dest)==='player',destinationFloor:!!inv.state.containers[dest].ground,destinationWeight:inv.weight(dest),destinationCapacity:inv.state.containers[dest].capacity,traits:this.state.player.traits,awkwardGloves:!!this.state.player.awkwardGloves});
  return this.startAction('转移物品',duration,()=>{if(inv.state.items[id]?.container!==source){this.log('物品位置已改变');return;}const result=inv.transfer(id,dest);if(!result.ok){this.log(result.reason);return;}const item=inv.state.items[id],tile=inv.state.containers[dest].ground;if(tile)Object.assign(item,groundDropPlacement(item,tile,(x,y)=>this.world.apparentZ({x:tile.x+x,y:tile.y+y,z:tile.z}),{center:!!this.state.dropItemsOnSquareCenter,random:this.groundRandom??Math.random}));else delete item.groundOffset;},{target});
 }
 spawnNearby(){const p=this.state.player,cx=Math.floor(p.x/32),cy=Math.floor(p.y/32);
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
   const id=`${cx+dx},${cy+dy},${p.z}`;if(this.state.spawned[id])continue;
   if(!this.world.square((cx+dx)*32+16,(cy+dy)*32+16,p.z))continue;
   this.state.spawned[id]=true;const rng=random(hash(id));
   for(let i=0;i<8;i++){const x=(cx+dx)*32+rng()*32,y=(cy+dy)*32+rng()*32;const f=this.world.flags(x,y,p.z);if(f.floor&&!f.solid&&Math.hypot(x-p.x,y-p.y)>12)this.state.zombies.push({id:`${id}:${i}`,x,y,z:p.z,hp:70,angle:rng()*6.28,cooldown:0,alert:0});}
  }
 }
 attack(){const p=this.state.player;if(this.attackCooldown>0||this.action||p.hp<=0||p.endurance<5)return false;this.attackCooldown=.7;p.endurance=clamp(p.endurance-5);
  const weapon=this.inventory.state.items[this.inventory.state.equipment.primary];const damage=weapon?Number(definition(weapon.type).properties.MaxDamage||.08)*25:8;let hit=false;
  for(const z of this.state.zombies){if(z.hp<=0||z.z!==p.z)continue;const dx=z.x-p.x,dy=z.y-p.y,d=Math.hypot(dx,dy);const facing=Math.cos(p.angle)*dx+Math.sin(p.angle)*dy;
   if(d<1.55&&facing>-.15&&this.world.lineClear(p,z)){z.hp-=damage;z.alert=10;this.world.move(z,dx*.25,dy*.25);p.skills.combat+=1;hit=true;if(z.hp<=0){p.kills++;this.state.corpses.push({x:z.x,y:z.y,z:z.z});this.log('击倒一只僵尸');}break;}
  }this.events.push(hit?'hit':'swing');return true;
 }
 tick(dt,input={}){if(this.paused||this.state.player.hp<=0)return;dt=Math.min(dt,.1)*this.speed;const s=this.state,p=s.player;s.elapsed+=dt;const previousTime=s.time;s.time+=dt*.7;advanceReadingClock(s,previousTime,s.time);advanceMedical(p,s.time-previousTime);advanceCooking(this.inventory,s.time-previousTime,{electricity:s.utilities?.electricity!==false,onEvent:message=>this.log(message)});this.attackCooldown=Math.max(0,this.attackCooldown-dt);
  let autoMoving=false;const traversing=!!p.windowMotion,move=!!(input.x||input.y)&&!traversing;if(move&&this.action)this.cancel();
  if(this.action){const a=this.action;
   if(a.reading){
    const r=a.reading;
    if(!a.valid())this.cancel();
    else {
     if(this.speed===1){const flips=readingPageFlips(p.readMotion.elapsed,p.readMotion.elapsed+dt,this.animationData?.animationMetadata?.readBook);for(let i=0;i<flips;i++)this.soundEvents.push(readingSound(r.item.type,'PageFlip'));}
     p.readMotion.elapsed+=dt;r.elapsed+=dt;r.pageTimer+=dt*48;a.left=Math.max(0,a.duration-r.elapsed);
     if(r.book.ordinary){
      if(Number(definition(r.item.type).properties.UnhappyChange)<0)p.unhappiness=Math.min(p.unhappiness??0,r.unhappiness);
     }else updateBookPages(p,r.item,r.book,Math.min(1,r.elapsed/a.duration));
     if(!r.book.ordinary&&readingComprehension(p,r.book)!=='understood'&&r.pageTimer>=200){
      p.readPages[r.item.type]=0;this.cancel();this.log('无法从这本书学到内容');
     }else if(a.left<=0){this.action=null;a.complete();}
    }
   }else if(p.buildMotion){const motion=p.buildMotion;
    if(!a.valid())this.cancel();
    else if(motion.turn){if(advanceWindowTurn(this.animationData,p,motion.turn,dt))motion.turn=null;}
    else {motion.elapsed+=dt;a.left=Math.max(0,a.duration-motion.elapsed);if(a.left<=0){this.action=null;a.complete();}}
   }else if(p.windowApproach){const motion=p.windowApproach,point=motion.path[motion.index];
    if(a.windowState().destroyed||p.z!==point.z){this.cancel();}
    else {const dx=point.x-p.x,dy=point.y-p.y,d=Math.hypot(dx,dy),speed=this.inventory.encumbrance()>p.capacity*.8?1.12:1.6,step=Math.min(d,speed*dt);
     if(d>1e-6){p.angle=Math.atan2(dy,dx);autoMoving=this.world.move(p,dx/d*step,dy/d*step);}
     const remaining=Math.hypot(point.x-p.x,point.y-p.y);motion.stalled=remaining<d-1e-6?0:motion.stalled+dt;
     if(remaining<1e-6)motion.index++;
     a.left=Math.max(0,(motion.path.length-motion.index-1+Math.min(1,remaining))/speed);
     if(motion.index===motion.path.length){this.action=null;a.complete();autoMoving=false;}
     else if(motion.stalled>.5){this.cancel();this.log('通往窗边的路线被阻挡');}
    }
   }else if(p.windowTurn){const motion=p.windowTurn,state=a.windowState();
    if(state.destroyed||state.smashed||a.windowBlocked()||!this.world.interactions(p).some(o=>o.id===a.target))this.cancel();
    else {const done=advanceWindowTurn(this.animationData,p,motion,dt);a.left=Math.abs(motion.remaining)/Math.PI;if(done){this.action=null;a.complete();}}
   }else if(p.windowMotion){const motion=p.windowMotion;
    if(!windowPhase(motion.elapsed).started&&!canClimbWindow({},a.windowState())){delete p.windowMotion;this.action=null;this.log('窗户已关闭，翻越中止');}
    else {const previous=motion.elapsed;motion.elapsed+=dt;if(this.animationData){const delta=windowRootDelta(this.animationData,previous,motion.elapsed,p.angle);p.x=Math.fround(p.x+delta.x);p.y=Math.fround(p.y+delta.y);}a.left=Math.max(0,a.duration-motion.elapsed);const phase=advanceWindowPosition(p,motion,dt);if(phase.finished){this.action=null;a.complete();}}
   }else if(p.windowToggle){const motion=p.windowToggle,state=a.windowState();
    if(state.destroyed||state.smashed||a.windowBlocked()){this.cancel();}
    else if(motion.open){const finished=advanceWindowOpening(motion,dt,a.openContext,{commit:a.commitWindow,breakLock:a.breakLock,exert:value=>{p.endurance=clamp(p.endurance-value*100);}});a.duration=OPEN_STAGES[motion.stage].duration/.8;a.left=Math.max(0,a.duration-motion.stageElapsed);if(finished){if(motion.stage==='fail')this.log('窗锁已卡死，无法打开');this.action=null;a.complete();}}
    else {motion.elapsed+=dt;const phase=windowTogglePhase(motion.open,motion.elapsed);a.left=Math.max(0,a.duration-motion.elapsed);
     if(phase.commit&&!motion.committed){a.commitWindow();motion.committed=true;}
     if(phase.finished){this.action=null;a.complete();}
    }
   }else {a.left-=dt;if(a.valid&&!a.valid()||a.target&&!this.world.interactions(p).some(o=>o.id===a.target))this.cancel();else if(a.left<=0){this.action=null;a.complete();}}
  }
  let speed=input.run&&p.endurance>8?3.6:1.6;if(input.sneak)speed=.85;if(this.inventory.encumbrance()>p.capacity*.8)speed*=.7;
  p.moving=autoMoving;p.running=false;
  if(move){const len=Math.hypot(input.x,input.y);p.angle=Math.atan2(input.y,input.x);p.moving=this.world.move(p,input.x/len*speed*dt,input.y/len*speed*dt);p.running=p.moving&&!!input.run;if(p.running)p.endurance=clamp(p.endurance-dt*4);}
  else p.endurance=clamp(p.endurance+dt*3);
  p.hunger=clamp(p.hunger+dt*.018);p.thirst=clamp(p.thirst+dt*.029);p.fatigue=clamp(p.fatigue+dt*.009);
  if(p.bleeding)p.hp=clamp(p.hp-dt*p.bleeding*.04);if(p.hunger>=100||p.thirst>=100)p.hp=clamp(p.hp-dt*.15);
  this.spawnNearby();
  for(const z of s.zombies){if(z.hp<=0||z.z!==p.z)continue;const d=Math.hypot(z.x-p.x,z.y-p.y);if(d>45)continue;z.cooldown=Math.max(0,z.cooldown-dt);
   if(d<(input.run?16:input.sneak?4:9)&&this.world.lineClear(z,p))z.alert=8;else z.alert=Math.max(0,z.alert-dt);
   if(z.alert>0){z.angle=Math.atan2(p.y-z.y,p.x-z.x);if(d>.75)this.world.move(z,Math.cos(z.angle)*.75*dt,Math.sin(z.angle)*.75*dt);z.moving=d>.75;
    if(d<1&&!z.cooldown&&this.world.lineClear(z,p)){p.hp=clamp(p.hp-8);injury(p,Object.keys(BODY_PARTS)[Math.floor(random(hash(z.id+':'+Math.floor(s.elapsed)))()*17)],'scratch');z.cooldown=2;this.cancel();this.log('你受伤了，拉开距离并包扎！');}
   }else z.moving=false;
  }
  if(p.hp<=0){delete p.windowMotion;delete p.windowToggle;delete p.windowApproach;delete p.windowTurn;delete p.buildMotion;delete p.readMotion;this.action=null;this.log('你死了。这个存档的旅程已经结束。');}
 }
 serialize(){const {windowMotion,windowToggle,windowApproach,windowTurn,buildMotion,readMotion,...player}=this.state.player;return JSON.stringify({...this.state,player,changes:this.world.changes});}
}
export function parseSave(text,{bounds=[7680,11008,8960,12800]}={}){const s=JSON.parse(text);if(![1,2].includes(s.version)||!s.player||!Array.isArray(s.zombies)||!s.changes)throw new Error('不支持的存档格式');
 for(const field of['x','y','z','hp','hunger','thirst','fatigue','endurance'])if(!Number.isFinite(s.player[field]))throw new Error('存档角色数据无效');
 if(s.player.x<bounds[0]||s.player.x>=bounds[2]||s.player.y<bounds[1]||s.player.y>=bounds[3])throw new Error('存档位置超出当前地图范围，请使用对应地图的存档');
 if(s.version===1){const inventory=inventoryState(),inv=new Inventory(inventory);for(const[type,n]of Object.entries(s.bag||{})){if(!Number.isInteger(n)||n<0||n>10000)throw Error('存档物品数据无效');for(let i=0;i<n;i++){const item=inv.create(type);if(item.fluid)item.fluid.amount=item.fluid.capacity;}}
  for(const[id,bag]of Object.entries(s.containers||{})){inv.container('world:'+id,id,50);for(const[type,n]of Object.entries(bag)){if(!Number.isInteger(n)||n<0||n>10000)throw Error('存档容器物品数据无效');for(let i=0;i<n;i++)inv.create(type,'world:'+id);}}
  const weapon=inv.find(s.player.weapon);if(weapon)inv.equip(weapon.id);s.inventory=inventory;s.version=2;delete s.bag;s.containers={};
 }
 s.builds??=[];validateBuildings(s.builds);
 validateInventory(s.inventory);validateCookingState(s.inventory);
 validateMedical(s.player);
 validateWoodworkProgression(s.player);
 validateReadingState(s.player,s.inventory.items,s);
 return s;
}
