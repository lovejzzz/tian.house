import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {installArchitecturalAssets} from '../src/architectural-assets.js';
import {World} from '../src/world.js';import {Simulation,newState} from '../src/simulation.js';
import {diagonalWindowSides} from '../src/diagonal-openings.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
const props={floor:{solidfloor:''},blends_natural_01_16:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},drapeN:{TianMount:'window',attachedN:''},drapeW:{TianMount:'window',attachedW:''}};
const atlas={regions:{}};installArchitecturalAssets(props,atlas);
function fixture(axis){
 const squares=[];for(let x=0;x<20;x++)for(let y=0;y<20;y++)squares.push({x,y,z:0,room:-1,tiles:['blends_natural_01_16']});
 const m=new StructuredWorkshopModel({version:1,squares,items:[]},[0,0,20,20],props);
 assert.equal(m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[5,5,13,12],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);
 const x=axis==='N'?8:5,y=axis==='N'?5:8,tile='tian_tall_steel_window_'+axis+'_0',entry={id:'tile:'+tile,parts:[{dx:0,dy:0,tile}]};
 return {m,x,y,tile,entry};
}
function finish(sim){for(let i=0;i<200&&sim.action;i++)sim.tick(.05);assert.equal(sim.action,null);}
test('N/W tall windows compile from solid material without pre-cut wall variants, restore the wall on erase, and preserve identity on replacement',()=>{
 for(const axis of ['N','W']){
  const {m,x,y,entry}=fixture(axis),before=m.export();m.begin('Window');assert.equal(m.placement(entry,x,y,0).ok,true);assert.equal(m.place(entry,x,y,0).ok,true);m.commit();
  const id=m.scene.openings[0].id,wall=m.plan.polygonGeometry.walls[0];assert.equal(wall.axis,axis);assert.equal(wall.length,1);assert.equal(wall.opening.frame,null);
  assert.ok(!m.square(x,y,0).tiles.some(t=>t.startsWith('wall_')||t.startsWith('tian_tall')));
  const saved=m.export();assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,props).export(),saved);
  assert.equal(m.place({...entry,hostWallId:wall.id},x,y,0).ok,true);assert.equal(m.scene.openings[0].id,id);
  m.undo();assert.deepEqual(m.export(),before);m.redo();assert.deepEqual(m.export(),saved);
  m.begin('Erase');m.erase(x,y,0);m.commit();assert.equal(m.scene.openings.length,0);assert.ok(m.square(x,y,0).tiles.includes(axis==='N'?'wall_1':'wall_0'));
 }
});
test('N/W tall windows allow window coverings and real two-way climbing but block walking through their sill',()=>{
 for(const axis of ['N','W']){
  const {m,x,y,entry}=fixture(axis);assert.equal(m.place(entry,x,y,0).ok,true);
  const drape={id:'drapes',parts:[{dx:0,dy:0,tile:'drape'+axis}]};assert.equal(m.placement(drape,x,y,0).ok,true);assert.equal(m.place(drape,x,y,0).ok,true);assert.equal(m.scene.objects[0].wallMounts[0].openingId,m.scene.openings[0].id);
  const spawn=axis==='N'?[x+.5,y+.65,0]:[x+.65,y+.5,0],state=newState(spawn);state.housePlan=m.export();state.spawned={'0,0,0':true};
  const world=new World({playableBounds:m.bounds,cells:[]},props),sim=new Simulation(world,state);sim.spawnNearby=()=>{};const obj=world.interactions(state.player).find(o=>o.type==='window');assert.ok(obj);
  sim.interact(obj);finish(sim);assert.equal(world.state(obj.x,obj.y,0,obj.tile).open,true);
  for(let i=0;i<2;i++){const p=state.player,s=diagonalWindowSides(obj.polygonWall,p);world.move(p,s.to.x-p.x,s.to.y-p.y);assert.ok(Math.hypot(s.to.x-p.x,s.to.y-p.y)>.3);sim.interact(obj,'climb');assert.ok(sim.action);finish(sim);assert.ok(Math.hypot(s.to.x-p.x,s.to.y-p.y)<1e-7);}
 }
});
test('profile artwork includes all gameplay states and placement rejects unowned support without destroying a legacy wall',()=>{
 for(const axis of ['N','W'])for(let i=0;i<4;i++){assert.ok(atlas.regions['tian_tall_steel_window_'+axis+'_'+i]);assert.equal(!!props['tian_tall_steel_window_'+axis+'_'+i],i===0);}
 const {m,entry}=fixture('N'),before=m.export();assert.equal(m.place(entry,1,1,0).ok,false);assert.deepEqual(m.export(),before);
 const old=new StructuredWorkshopModel({version:1,squares:[{x:1,y:1,z:0,room:-1,tiles:['floor','wall_1']}],items:[]},[0,0,20,20],props),saved=old.export();assert.equal(old.placement(entry,1,1,0).ok,false);assert.equal(old.place(entry,1,1,0).ok,false);assert.deepEqual(old.export(),saved);
});
test('white sash and removable renovation sheeting share the normal hosted-window lifecycle',()=>{
 for(const axis of ['N','W']){
  const {m,x,y}=fixture(axis),tile=`tian_white_sash_window_${axis}_0`;
  for(let i=0;i<4;i++)assert(atlas.regions[`tian_white_sash_window_${axis}_${i}`]);
  assert.equal(m.place({id:'tile:'+tile,parts:[{dx:0,dy:0,tile}]},x,y,0).ok,true);
  const cover=`tian_window_protection_${axis}_0`;
  assert.equal(m.place({id:'tile:'+cover,parts:[{dx:0,dy:0,tile:cover}]},x,y,0).ok,true);
  const object=m.scene.objects[0];assert.equal(object.wallMounts[0].openingId,m.scene.openings[0].id);
  m.begin('Remove sheeting');assert.equal(m.structure({type:'objects.remove',ids:[object.id]}).ok,true);m.commit();assert.equal(m.scene.openings.length,1);assert.equal(m.scene.objects.length,0);m.undo();assert.equal(m.scene.objects.length,1);
 }
});
test('wide operable assembly has a continuous aperture, independent states and atomic remove/restore',()=>{
 for(const axis of ['N','W']){
  const {m,x,y}=fixture(axis),entry={id:'wide-'+axis,parts:[0,1].map(i=>({dx:axis==='N'?i:0,dy:axis==='W'?i:0,tile:`tian_wide_steel_window_${axis}_${i*4}`}))};
  assert.equal(m.placement(entry,x,y,0).ok,true);m.begin('Wide window');assert.equal(m.place(entry,x,y,0).ok,true);m.commit();
  const windows=m.scene.openings;assert.equal(windows.length,2);assert(windows[0].assemblyId);assert.equal(windows[0].assemblyId,windows[1].assemblyId);
  assert.equal(JSON.parse(props[windows[0].tile].TianWindowProfile)[2],1);assert.equal(JSON.parse(props[windows[1].tile].TianWindowProfile)[0],0);
  const saved=m.export(),world=new World({playableBounds:m.bounds,cells:[]},props);world.setHousePlan(saved);
  world.change(x,y,0,windows[0].tile,{open:true});assert.equal(world.state(x,y,0,windows[0].tile).open,true);
  assert.notEqual(world.state(x+entry.parts[1].dx,y+entry.parts[1].dy,0,windows[1].tile).open,true);
  assert.equal(m.placement(entry,x,y,0).ok,true);assert.equal(m.place(entry,x,y,0).ok,true);assert.equal(m.scene.openings.length,2);
  m.begin('Erase assembly');m.erase(x+entry.parts[1].dx,y+entry.parts[1].dy,0);m.commit();assert.equal(m.scene.openings.length,0);m.undo();assert.equal(m.scene.openings.length,2);
  assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,props).export(),saved);
 }
});
test('wide catalogue groups N/W assemblies with two parts and rejects a missing wall atomically',async()=>{
 const {workshopCatalog}=await import('../src/workshop-model.js'),{orientationFamilies}=await import('../src/catalog-variants.js');
 const entries=workshopCatalog(props,atlas,{}).entries.filter(e=>e.source.startsWith('tian_wide_steel_window_'));
 assert.equal(entries.length,2);assert(entries.every(e=>e.parts.length===2));const families=orientationFamilies(entries,props);assert(entries.every(e=>families.get(e.id).length===2));
 const {m}=fixture('N'),entry=entries.find(e=>e.facing==='N'),before=m.export();assert.equal(m.placement(entry,12,5,0).ok,false);assert.equal(m.place(entry,12,5,0).ok,false);assert.deepEqual(m.export(),before);
});
