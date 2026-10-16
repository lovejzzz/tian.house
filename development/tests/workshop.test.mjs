import test from 'node:test';import assert from 'node:assert/strict';
import {WorkshopModel,validateHousePlan,workshopCatalog} from '../src/workshop-model.js';
import {prepareHouseState} from '../src/workshop-apply.js';
import {World} from '../src/world.js';import {Simulation,newState,parseSave} from '../src/simulation.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';const itemFixtures=useFixtureCatalog();
const bounds=[0,0,20,20],props={floor:{solidfloor:''},'carpentry_02_58':{solidfloor:''},'carpentry_02_98':{stairsTN:''},'carpentry_02_97':{stairsMN:''},'carpentry_02_96':{stairsBN:''},wall:{WallN:''},door:{doorN:''},chair:{solid:''}},blank=()=>({version:1,name:'Test',squares:[{x:4,y:4,z:0,room:-1,tiles:['floor']}],items:[],vehicles:[]});
test('garden stroke and vehicle placement are one undoable transaction; canceled move restores original',()=>{const m=new WorkshopModel(blank(),bounds,props);m.begin('Garden');for(let x=5;x<10;x++)m.place({parts:[{dx:0,dy:0,tile:'chair'}]},x,4,0);m.commit();assert.equal(m.plan.squares.length,6);m.undo();assert.equal(m.plan.squares.length,1);m.redo();assert.equal(m.plan.squares.length,6);const before=m.export();m.begin('Move');m.erase(5,4,0);m.cancel();assert.deepEqual(m.export(),before);for(let x=7;x<=13;x++)for(let y=8;y<=12;y++)m.place({parts:[{dx:0,dy:0,tile:'floor'}]},x,y,0);m.begin('Car');m.place({vehicle:{id:'car',extents:[1,1,3],scale:2},rotation:1},10,10,0);m.commit();assert.deepEqual(m.plan.vehicles[0].footprint,[2,6]);m.undo();assert.equal(m.plan.vehicles.length,0);});
test('custom levels replace the source lot and basement stairs connect both directions',()=>{const m=new WorkshopModel(blank(),bounds,props);m.place({parts:[{dx:0,dy:0,tile:'floor'}]},5,8,-1);m.place({stairs:true,facing:'N',parts:[{dx:0,dy:0,tile:'carpentry_02_98'},{dx:0,dy:1,tile:'carpentry_02_97'},{dx:0,dy:2,tile:'carpentry_02_96'}]},5,5,-1);const w=new World({playableBounds:bounds},props);w.setHousePlan(m.export());assert.deepEqual(w.renderLevels(0),[-1,0]);assert.equal(w.square(8,8,0),undefined);assert.equal(w.stepLayer(5.5,5.1,5.5,4.9,-1),0);assert.equal(w.stepLayer(5.5,4.9,5.5,5.1,0),-1);assert.equal(w.flags(5,4,0).floor,true);});
test('pool and parked vehicles block walking, including a rotated car footprint',()=>{const p=blank();p.squares.push({x:5,y:4,z:0,tiles:['workshop_pool_water']});p.vehicles.push({id:'car',x:4.5,y:4.5,z:0,rotation:1,footprint:[2,6]});const w=new World({playableBounds:bounds},props);w.setHousePlan(p);assert.equal(w.flags(5,4,0).solid,true);assert.equal(w.flags(4,4,0).solid,true);assert.equal(w.canStep(4,3,4,4,0),false);});
test('plan validation rejects unsupported coordinates, duplicate squares and malformed vehicles',()=>{for(const change of [p=>p.squares[0].z=-3,p=>p.squares.push({...p.squares[0]}),p=>p.vehicles.push({id:'car',x:4,y:4,z:0,rotation:.5}),p=>p.vehicles.push({id:'car',x:4,y:4,z:0,rotation:0,footprint:[-1,4]})]){const p=blank();change(p);assert.throws(()=>validateHousePlan(p,bounds));}});
test('walkthrough validates before changing live state and keeps player possessions across repeated application',()=>{const w=new World({playableBounds:bounds},props),state=newState([4.5,4.5,0]),sim=new Simulation(w,state);const original=sim.serialize(),plan=blank();plan.items.push({type:'Base.WaterBottle',x:4,y:4,z:0});const atlas={regions:{floor:{}}},next=prepareHouseState(sim,plan,bounds,atlas);assert.equal(sim.serialize(),original);assert.deepEqual(next.player.x,4.5);assert.ok(Object.values(next.inventory.items).some(i=>i.workshopPlaced));const s2=new Simulation(w,next),again=prepareHouseState(s2,plan,bounds,atlas);assert.equal(Object.values(again.inventory.items).filter(i=>i.workshopPlaced).length,1);assert.equal(Object.values(again.inventory.items).filter(i=>i.container==='player').length,Object.values(state.inventory.items).filter(i=>i.container==='player').length);assert.ok(parseSave(JSON.stringify(again),{bounds}).housePlan);plan.squares[0].tiles=['missing'];assert.throws(()=>prepareHouseState(s2,plan,bounds,atlas),/Missing tile/);});
test('multipart source pieces remain accessible through grouped entries; missing assets are disclosed',()=>{const p={seat_0:{SpriteGridPos:'0,0',CustomName:'Sofa',Facing:'S'},seat_1:{SpriteGridPos:'1,0',CustomName:'Sofa',Facing:'S'},missing:{}};const c=workshopCatalog(p,{regions:{seat_0:{},seat_1:{}}},{items:{}});assert.deepEqual(c.entries.find(e=>e.source==='seat_0').parts.map(p=>p.tile),['seat_0','seat_1']);assert.equal(c.unavailable[0].id,'missing');});

test('stocked supplies roundtrip into real shelf containers without duplication',()=>{const p=blank();p.squares.push({x:5,y:4,z:0,tiles:['floor','shelf']});const properties={...props,shelf:{container:'shelves',CustomName:'Shelves',solid:''}},m=new WorkshopModel(p,bounds,properties);assert.equal(m.place({itemType:'Base.WaterBottle',storeInContainer:true},4,4,0).ok,false);m.begin('Stock');m.place({itemType:'Base.WaterBottle',storeInContainer:true},5,4,0);m.commit();assert.equal(m.plan.items[0].storageTile,'shelf');m.undo();assert.equal(m.plan.items.length,0);m.redo();const w=new World({playableBounds:bounds},properties),sim=new Simulation(w,newState([4.5,4.5,0])),atlas={regions:{floor:{},shelf:{}}};const next=prepareHouseState(sim,m.export(),bounds,atlas),stock=Object.values(next.inventory.items).filter(i=>i.workshopPlaced);assert.ok(parseSave(JSON.stringify(next),{bounds}).housePlan);assert.equal(stock.length,1);assert.equal(stock[0].container,'world:5,4,0:shelf');const again=prepareHouseState(new Simulation(w,next),m.export(),bounds,atlas);assert.equal(Object.values(again.inventory.items).filter(i=>i.workshopPlaced).length,1);const invalid=m.export();invalid.squares.find(s=>s.x===5).tiles=['floor'];assert.throws(()=>validateHousePlan(invalid,bounds),/Invalid house item/);});
test('reflooring preserves furniture as the top selectable layer',()=>{const m=new WorkshopModel(blank(),bounds,props);m.place({parts:[{dx:0,dy:0,tile:'chair'}]},4,4,0);m.place({parts:[{dx:0,dy:0,tile:'carpentry_02_58'}]},4,4,0);assert.deepEqual(m.square(4,4,0).tiles,['carpentry_02_58','chair']);});
test('a desk computer is reachable while an intervening wall still blocks it',()=>{const p=blank();p.squares.push({x:5,y:4,z:0,tiles:['floor','chair','computer']});const properties={...props,computer:{CustomName:'Computer'}},w=new World({playableBounds:bounds},properties);w.setHousePlan(p);assert.ok(w.interactions({x:4.7,y:4.5,z:0}).some(o=>o.type==='computer'));p.squares[1].tiles.push('westWall');properties.westWall={WallW:''};w.setHousePlan(p);assert.equal(w.interactions({x:4.7,y:4.5,z:0}).some(o=>o.type==='computer'),false);});

test('a footprint straddling parallel stair lanes can leave the upper landing',()=>{const p=blank();for(let x=5;x<=6;x++){p.squares.push({x,y:5,z:0,tiles:['carpentry_02_98']},{x,y:4,z:1,tiles:['floor']});}const w=new World({playableBounds:bounds},props);w.setHousePlan(p);const actor={x:5.86,y:4.99,z:1};assert.equal(w.move(actor,0,-.5),true);assert.ok(actor.y<4.6);assert.equal(actor.z,1);assert.equal(w.move(actor,0,.6),true);assert.equal(actor.z,0);});

test('rug overlays retain structural support and floor replacement keeps furniture and textiles',()=>{
 const p={...props,floors_rugs_01_28:{MoveType:'FloorRug'},tian_rug:{FloorOverlay:''},replacement:{solidfloor:''}};
 const m=new WorkshopModel(blank(),bounds,p);m.begin('Furnish');
 for(const tile of ['chair','floors_rugs_01_28','tian_rug'])m.place({parts:[{dx:0,dy:0,tile}]},4,4,0);
 m.commit();assert.deepEqual(m.square(4,4,0).tiles,['floor','floors_rugs_01_28','tian_rug','chair']);
 m.place({parts:[{dx:0,dy:0,tile:'replacement'}]},4,4,0);
 assert.deepEqual(m.square(4,4,0).tiles,['replacement','floors_rugs_01_28','tian_rug','chair']);
 const w=new World({playableBounds:bounds},p);w.setHousePlan(m.export());assert.equal(w.flags(4,4,0).floor,true);
 m.undo();assert.deepEqual(m.square(4,4,0).tiles,['floor']);
});

test('placing empty cookware does not conjure drinking water',()=>{
 itemFixtures['Base.Pot']={type:'Base.Pot',name:'Pot',properties:{Weight:1,ItemType:'base:normal'},components:[{header:'component FluidContainer',values:['Capacity = 1.5']}]};
 const p=blank();p.items=[{type:'Base.Pot',x:4,y:4,z:0},{type:'Base.WaterBottle',x:4,y:4,z:0}];
 const sim=new Simulation(new World({playableBounds:bounds},props),newState([4.5,4.5,0]));
 const next=prepareHouseState(sim,p,bounds,{regions:{floor:{}}});const stocked=Object.values(next.inventory.items).filter(i=>i.workshopPlaced);
 assert.equal(stocked.find(i=>i.type==='Base.Pot').fluid.amount,0);
 assert.equal(stocked.find(i=>i.type==='Base.WaterBottle').fluid.amount,1);
});

test('resident edits preserve depleted and partly used stock and add only newly authored supplies',()=>{
 const w=new World({playableBounds:bounds},props),p=blank(),atlas={regions:{floor:{}}};
 p.items.push({type:'Base.WaterBottle',x:4,y:4,z:0},{type:'Base.WaterBottle',x:4,y:4,z:0});
 const sim=new Simulation(w,prepareHouseState(new Simulation(w,newState([4.5,4.5,0])),p,bounds,atlas));
 const stocked=Object.values(sim.inventory.state.items).filter(i=>i.workshopPlaced);sim.inventory.remove(stocked[0].id);stocked[1].fluid.amount=250;
 const next=prepareHouseState(sim,p,bounds,atlas,{preserveStock:true}),remaining=Object.values(next.inventory.items).filter(i=>i.workshopPlaced);
 assert.equal(remaining.length,1);assert.equal(remaining[0].id,stocked[1].id);assert.equal(remaining[0].fluid.amount,250);
 const edited=structuredClone(p);edited.items.push({...p.items[0]});
 const added=prepareHouseState(new Simulation(w,next),edited,bounds,atlas,{preserveStock:true});
 assert.equal(Object.values(added.inventory.items).filter(i=>i.workshopPlaced).length,2);
 const reapplied=prepareHouseState(new Simulation(w,added),edited,bounds,atlas,{preserveStock:true});
 assert.equal(Object.values(reapplied.inventory.items).filter(i=>i.workshopPlaced).length,2);
});
