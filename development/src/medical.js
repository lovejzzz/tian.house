import {definition} from './inventory.js';
import {drainableUses} from './drainable.js';
export const BODY_PARTS=Object.freeze({Hand_L:'Left hand',Hand_R:'Right hand',ForeArm_L:'Left forearm',ForeArm_R:'Right forearm',UpperArm_L:'Left upper arm',UpperArm_R:'Right upper arm',Torso_Upper:'Upper torso',Torso_Lower:'Lower torso',Head:'Head',Neck:'Neck',Groin:'Groin',UpperLeg_L:'Left thigh',UpperLeg_R:'Right thigh',LowerLeg_L:'Left shin',LowerLeg_R:'Right shin',Foot_L:'Left foot',Foot_R:'Right foot'});
export const WOUND_NAMES={scratch:'Scratch',cut:'Laceration',bite:'Bite'};
// Gameplay scaffolding: wound duration and evolution are provisional, not native BodyPart parity.
const durations={scratch:240,cut:720,bite:2880};
export function ensureMedical(player){
 if(!player.medical){player.medical={parts:{}};if(player.bleeding>0)player.medical.parts.ForeArm_L={kind:'scratch',remaining:240,bleeding:player.bleeding,bandage:null,alcohol:0,infection:0,pain:10};}
 return player.medical;
}
export function injury(player,part,kind='scratch'){
 if(!BODY_PARTS[part]||!WOUND_NAMES[kind])throw Error('Unknown wound type');const medical=ensureMedical(player),old=medical.parts[part];
 medical.parts[part]={kind,remaining:Math.max(durations[kind],old?.remaining??0),bleeding:kind==='scratch'?1:kind==='cut'?2:3,bandage:null,alcohol:0,infection:old?.infection??0,pain:kind==='scratch'?10:25};syncBleeding(player);return medical.parts[part];
}
export function syncBleeding(player){player.bleeding=Object.values(ensureMedical(player).parts).reduce((n,w)=>n+(w.bandage?0:w.bleeding),0);}
export function medicalItems(inventory,action){return Object.values(inventory.state.items).filter(item=>{
 if(inventory.root(item.container)!=='player')return false;const p=definition(item.type).properties;
 if(action==='bandage')return !!p.CanBandage;
 return p.ItemType==='base:drainable'&&Number(p.AlcoholPower)>0&&drainableUses(item,p)>0||item.fluid?.type==='RubbingAlcohol'&&item.fluid.amount>=.15;
 });}
export function planTreatment(player,inventory,part,action,itemId){
 const wound=ensureMedical(player).parts[part];if(!wound)return {ok:false,reason:'There is no wound on this body part'};
 if(action==='remove')return wound.bandage?{ok:true,wound}:{ok:false,reason:'There is no bandage to remove'};
 if(!['bandage','disinfect'].includes(action))return {ok:false,reason:'Unknown treatment action'};
 if(wound.bandage)return {ok:false,reason:'Remove the bandage first'};
 const item=medicalItems(inventory,action).find(i=>i.id===itemId);if(!item)return {ok:false,reason:action==='bandage'?'Requires a usable bandage or ripped sheets':'Requires alcohol wipes or rubbing alcohol'};
 return {ok:true,wound,item};
}
export function treatWound(player,inventory,part,action,itemId,{random=Math.random}={}){
 const plan=planTreatment(player,inventory,part,action,itemId);if(!plan.ok)return plan;const {wound,item}=plan,doctor=Math.max(0,Math.min(10,player.skillLevels?.doctor??0));
 if(action==='remove'){
  const {type,life}=wound.bandage,p=definition(type).properties;
  const reusable=String(p.Tags??'').split(';').includes('base:reusablebandage');
  const output=life<=0&&!reusable?p.ReplaceOnUse:null;
  if(life>0||reusable||output){const target=output?(output.includes('.')?output:`Base.${output}`):type;definition(target);inventory.create(target);}
  wound.bandage=null;
 }else if(action==='bandage'){
  const p=definition(item.type).properties,life=item.type.includes('Dirty')?0:(doctor+1)*(.5+random()*.5)+Number(p.BandagePower??0);
  wound.bandage={type:item.type,life};inventory.remove(item.id);
  if(p.Alcoholic)wound.alcohol+=1;
 }else{
  const p=definition(item.type).properties,power=item.fluid?.type==='RubbingAlcohol'?4:Number(p.AlcoholPower);
  if(item.fluid)item.fluid.amount=Math.max(0,item.fluid.amount-.15);else inventory.useCraftItem(item.id,1);
  wound.alcohol+=power;wound.pain=Math.max(0,wound.pain+power*13-doctor/2);
 }
 syncBleeding(player);return {ok:true};
}
export function advanceMedical(player,minutes,{resting=false}={}){
 const medical=ensureMedical(player);for(const [part,w]of Object.entries(medical.parts)){
  const clean=w.bandage&&w.bandage.life>0;
  if(w.bandage)w.bandage.life=Math.max(0,w.bandage.life-minutes/120);
  if(w.alcohol>0){w.infection=Math.max(0,w.infection-minutes*.02);w.alcohol=Math.max(0,w.alcohol-minutes*.01);}
  else if(w.remaining>0&&w.bandage&&!clean)w.infection=Math.min(100,w.infection+minutes*.005);
  w.pain=Math.max(0,w.pain-minutes*.03);
  w.remaining=Math.max(0,w.remaining-minutes*(clean?1:.5)*(w.infection>0?.5:1));
  if(w.remaining===0){w.bleeding=0;if(!w.bandage&&w.infection===0&&w.pain===0)delete medical.parts[part];}
 }syncBleeding(player);
 // Tian House recovery tuning, not claimed native PZ parity. Survival resources
 // gate gradual recovery; bandaging itself never grants immediate HP.
 if(player.hp>0&&player.hp<100&&player.bleeding===0&&(player.hunger??100)<50&&(player.thirst??100)<50&&(player.fatigue??100)<80&&!(player.infection>0)&&Object.values(medical.parts).every(w=>w.infection===0))player.hp=Math.min(100,player.hp+Math.max(0,minutes)*(resting?.02:.01));
}
export function woundDescription(w){return `${w.remaining>0?WOUND_NAMES[w.kind]:(w.infection>0||w.pain>0?'Wound closed':'Wound healed')} · ${w.bandage?(w.bandage.life>0?'Bandaged':'Dirty bandage'):(w.bleeding?'Bleeding':'Unbandaged')}${w.infection>0?' · Wound infected':''}${w.alcohol>0?' · Disinfected':''}`;}
export function validateMedical(player){
 if(player.medical===undefined)return;
 const m=player.medical;if(!m||!m.parts||typeof m.parts!=='object'||Array.isArray(m.parts))throw Error('Invalid saved medical data');
 for(const [part,w]of Object.entries(m.parts)){
  if(!BODY_PARTS[part]||!w||!WOUND_NAMES[w.kind]||!['remaining','bleeding','alcohol','infection','pain'].every(k=>Number.isFinite(w[k])&&w[k]>=0&&w[k]<=100000))throw Error('Invalid saved wound data');
  if(w.bandage!==null&&(!w.bandage||!Number.isFinite(w.bandage.life)||w.bandage.life<0||w.bandage.life>1000||!definition(w.bandage.type).properties.CanBandage))throw Error('Invalid saved bandage data');
 }
}
