import test from 'node:test';import assert from 'node:assert/strict';
import {Inventory,inventoryState,setItemCatalog} from '../src/inventory.js';import {useFixtureCatalog} from './fixtures/catalog.mjs';
import {injury,treatWound,advanceMedical,validateMedical,ensureMedical,planTreatment} from '../src/medical.js';
const catalog={schema_version:1,items:useFixtureCatalog()};
catalog.items['Base.Bandage']={type:'Base.Bandage',name:'Bandage',properties:{CanBandage:true,BandagePower:4,ReplaceOnUse:'Base.BandageDirty',ItemType:'base:normal',Weight:.1}};
catalog.items['Base.BandageDirty']={type:'Base.BandageDirty',name:'脏Bandage',properties:{CanBandage:true,BandagePower:.5,Tags:'base:reusablebandage',ItemType:'base:normal',Weight:.1}};
catalog.items['Base.AlcoholWipes']={type:'Base.AlcoholWipes',name:'酒精湿巾',properties:{ItemType:'base:drainable',AlcoholPower:4,UseDelta:.2,Weight:.3}};setItemCatalog(catalog);
const setup=()=>({p:{hp:80,bleeding:0},inv:new Inventory(inventoryState())});
test('bandage consumes one item, suppresses bleeding without immediate HP recovery and persists',()=>{const {p,inv}=setup();injury(p,'Hand_L');injury(p,'Foot_R','cut');const b=inv.create('Base.Bandage');assert.equal(treatWound(p,inv,'Hand_L','bandage',b.id,{random:()=>0}).ok,true);assert.equal(p.bleeding,2);assert.equal(p.hp,80);assert.equal(inv.state.items[b.id],undefined);assert.equal(p.medical.parts.Hand_L.bandage.life,4.5);const restored=JSON.parse(JSON.stringify(p));validateMedical(restored);assert.deepEqual(restored,p);});
test('dirty bandage removal returns source replacement; clean bandage removal returns same type',()=>{const {p,inv}=setup();injury(p,'Hand_L');let b=inv.create('Base.Bandage');treatWound(p,inv,'Hand_L','bandage',b.id);p.medical.parts.Hand_L.bandage.life=0;treatWound(p,inv,'Hand_L','remove');assert.equal(inv.count('Base.BandageDirty'),1);assert.equal(p.bleeding,1);b=inv.create('Base.Bandage');treatWound(p,inv,'Hand_L','bandage',b.id);treatWound(p,inv,'Hand_L','remove');assert.equal(inv.count('Base.Bandage'),1);});
test('disinfect uses one wipe dose and is rejected while bandaged',()=>{const {p,inv}=setup();injury(p,'Hand_L');const wipes=inv.create('Base.AlcoholWipes');assert.equal(treatWound(p,inv,'Hand_L','disinfect',wipes.id).ok,true);assert.equal(wipes.currentUses,4);assert.equal(p.medical.parts.Hand_L.alcohol,4);const b=inv.create('Base.Bandage');treatWound(p,inv,'Hand_L','bandage',b.id);assert.equal(planTreatment(p,inv,'Hand_L','disinfect',wipes.id).ok,false);assert.equal(wipes.currentUses,4);});
test('old aggregate bleeding migrates once and wounds evolve on simulation minutes',()=>{const p={bleeding:3};ensureMedical(p);ensureMedical(p);assert.equal(Object.keys(p.medical.parts).length,1);advanceMedical(p,10);assert.equal(p.medical.parts.ForeArm_L.remaining,235);assert.equal(p.bleeding,3);assert.throws(()=>validateMedical({medical:{parts:{Invalid:{}}}}));});
test('cancelled timed treatment and lost material do not heal or consume',async()=>{const {Simulation}=await import('../src/simulation.js'),{p,inv}=setup();p.x=8500;p.y=11550;p.z=0;injury(p,'Hand_L');const b=inv.create('Base.Bandage'),state={player:p,inventory:inv.state,changes:{},builds:[],journal:[]},sim=new Simulation({},state);assert.equal(sim.treat('Hand_L','bandage',b.id),true);sim.cancel();assert.ok(inv.state.items[b.id]);assert.equal(p.bleeding,1);sim.treat('Hand_L','bandage',b.id);inv.remove(b.id);sim.action.complete();assert.equal(p.bleeding,1);assert.equal(p.medical.parts.Hand_L.bandage,null);});

test('natural recovery is slow, resource-gated, never revives death and does not bypass infection',()=>{
 const healthy={hp:20,hunger:10,thirst:10,fatigue:10,bleeding:0,infection:0,medical:{parts:{}}};
 const p=structuredClone(healthy);advanceMedical(p,60);assert.ok(Math.abs(p.hp-20.6)<1e-8);advanceMedical(p,60,{resting:true});assert.ok(Math.abs(p.hp-21.8)<1e-8);
 for(const patch of [{hp:0},{hunger:50},{thirst:50},{fatigue:80},{infection:1}]){const q={...structuredClone(healthy),...patch},before=q.hp;advanceMedical(q,60,{resting:true});assert.equal(q.hp,before);}
 const wounded=structuredClone(healthy);injury(wounded,'Hand_L','cut');advanceMedical(wounded,10);assert.equal(wounded.hp,20);
 const capped={...structuredClone(healthy),hp:99.9};advanceMedical(capped,60,{resting:true});assert.equal(capped.hp,100);
});
test('a dirty retained dressing cannot create a new infection after the wound has healed',()=>{
 const {p,inv}=setup();injury(p,'Hand_L');const b=inv.create('Base.Bandage');treatWound(p,inv,'Hand_L','bandage',b.id);
 const wound=p.medical.parts.Hand_L;wound.remaining=0;wound.bleeding=0;wound.bandage.life=0;wound.infection=0;
 advanceMedical(p,60);assert.equal(wound.infection,0);assert.equal(wound.remaining,0);
 wound.remaining=120;advanceMedical(p,10);assert.ok(wound.infection>0,'active dirty wounds must still progress');
});

test('removing dressing from closed infected wound preserves infection and recovery gate',async()=>{
 const {woundDescription}=await import('../src/medical.js');
 const {p,inv}=setup();Object.assign(p,{hunger:10,thirst:10,fatigue:10,infection:0});
 injury(p,'Hand_L');const bandage=inv.create('Base.Bandage');treatWound(p,inv,'Hand_L','bandage',bandage.id);
 const wound=p.medical.parts.Hand_L;Object.assign(wound,{remaining:0,bleeding:0,infection:2,pain:0});
 assert.match(woundDescription(wound),/^Wound closed/);
 treatWound(p,inv,'Hand_L','remove');advanceMedical(p,30);
 assert.equal(p.medical.parts.Hand_L,wound);assert.equal(wound.infection,2);assert.equal(p.hp,80);
 const saved=JSON.parse(JSON.stringify(p));validateMedical(saved);assert.equal(saved.medical.parts.Hand_L.infection,2);
 const wipes=inv.create('Base.AlcoholWipes');assert.equal(treatWound(p,inv,'Hand_L','disinfect',wipes.id).ok,true);
 advanceMedical(p,100);assert.equal(wound.infection,0);assert.ok(wound.pain>0);assert.equal(p.medical.parts.Hand_L,wound);
 advanceMedical(p,2000);assert.equal(p.medical.parts.Hand_L,undefined);
});
