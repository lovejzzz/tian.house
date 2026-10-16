import test from 'node:test';import assert from 'node:assert/strict';
import {installCafeAssets} from '../src/cafe-assets.js';import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';import {World} from '../src/world.js';
const props={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},wall_10:{DoorWallW:''},wall_11:{DoorWallN:''},door:{doorW:''}},atlas={regions:{}};installCafeAssets(props,atlas);
test('canopy stays on its door wall without blocking the doorway and stool exposes rest',()=>{
 const m=new StructuredWorkshopModel({version:1,squares:Array.from({length:12},(_,x)=>({x,y:4,z:0,tiles:['floor']})),items:[]},[0,0,15,15],props);
 assert.equal(m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[4,5,8,9],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);
 const wall=m.wallAt(8,6,0,'W');assert.equal(m.structure({type:'opening.add',opening:{id:'d',hostWallId:wall.id,kind:'door',tile:'door'}}).ok,true);
 for(const face of ['N','W','S','E'])assert(atlas.regions[`tian_street_canopy_${face}_0`]);
 const canopy='tian_street_canopy_E_0';assert.equal(m.place({id:'tile:'+canopy,parts:[{dx:0,dy:0,tile:canopy}]},8,6,0).ok,true);assert.equal(m.scene.objects[0].wallMounts[0].wallId,wall.id);assert(!('solid'in props[canopy]));
 assert.equal(m.place({id:'tile:tian_street_stool_0',parts:[{dx:0,dy:0,tile:'tian_street_stool_0'}]},5,4,0).ok,true);
 const world=new World({playableBounds:m.bounds,cells:[]},props);world.setHousePlan(m.export());assert(world.interactions({x:5.5,y:3.5,z:0}).some(o=>o.tile==='tian_street_stool_0'&&o.type==='bed'));
});
test('mixed pavement then semantic furniture keeps painted terrain through structural recompilation',async()=>{
 const {WorkshopCommands}=await import('../src/workshop-commands.js');
 const m=new StructuredWorkshopModel({version:1,squares:[{x:2,y:2,z:0,tiles:['floor']}],items:[]},[0,0,15,15],{...props,paving:{solidfloor:''}});
 assert.equal(m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[4,5,8,9],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);
 const entry=tile=>({id:tile,parts:[{dx:0,dy:0,tile}]}),catalog=new Map(['paving','tian_street_stool_0'].map(t=>[t,entry(t)])),cmd=new WorkshopCommands(m,catalog),before=m.export();
 assert.equal(cmd.commit({requestId:'mixed',baseRevision:m.revision,operations:[{type:'place',assetId:'paving',x:2,y:2,z:0},{type:'place',assetId:'tian_street_stool_0',x:2,y:2,z:0}]}).ok,true);
 assert(m.square(2,2,0).tiles.includes('paving'));assert(!m.square(2,2,0).tiles.includes('floor'));const saved=m.export();assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,m.properties).export(),saved);m.undo();assert.deepEqual(m.export(),before);
});
test('floor batches reconcile once and atomically reject protected room flooring',()=>{
 const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,15,15],{...props,paving:{solidfloor:''}});m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[4,5,8,9],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});
 let reconciles=0;const original=m.reconcile.bind(m);m.reconcile=()=>{reconciles++;return original();};const entry={parts:[{dx:0,dy:0,tile:'paving'}]},points=Array.from({length:30},(_,i)=>({x:i%10,y:Math.floor(i/10),z:0}));
 assert.equal(m.placeFloorBatch(entry,points).ok,true);assert.equal(reconciles,1);assert(points.every(p=>m.square(p.x,p.y,p.z).tiles.includes('paving')));
 const before=m.export();assert.equal(m.placeFloorBatch(entry,[{x:2,y:4,z:0},{x:5,y:6,z:0}]).ok,false);assert.deepEqual(m.export(),before);
 assert.equal(m.placeFloorBatch(entry,[{x:2,y:4,z:0},{x:16,y:4,z:0}]).ok,false);assert.deepEqual(m.export(),before);
});
test('painting terrain at a chamfer retains the clipped indoor floor and changes only its ground base',()=>{
 const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,15,15],{...props,paving:{solidfloor:''}});
 m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[4,5,8,9],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});assert.equal(m.structure({type:'room.chamfer',roomId:'r',corner:'SE',distance:2}).ok,true);
 const part=m.plan.polygonGeometry.floors.find(f=>!f.full),geometry=structuredClone(part),entry={parts:[{dx:0,dy:0,tile:'paving'}]};m.begin('Terrain');assert.equal(m.placeFloorBatch(entry,[part]).ok,true);m.commit();
 assert.deepEqual(m.square(part.x,part.y,0).tiles.filter(t=>['floor','paving'].includes(t)),['paving','floor']);assert.deepEqual(m.plan.polygonGeometry.floors.find(f=>f.x===part.x&&f.y===part.y),geometry);
 const saved=m.export();assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,m.properties).export(),saved);
 const inside=m.plan.polygonGeometry.floors.find(f=>f.full);assert.equal(m.placeFloorBatch(entry,[inside]).ok,false);assert.deepEqual(m.export(),saved);
});
test('solid stair parts cannot enter the terrain batch optimization',()=>{
 const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,15,15],props),before=m.export();
 assert.equal(m.placeFloorBatch({stairs:true,parts:[{dx:0,dy:0,tile:'floor'}]},[{x:2,y:2,z:0}]).ok,false);assert.deepEqual(m.export(),before);
});
test('low facade pipe mounts beneath a window but rejects an obstructed door opening',()=>{
 const properties={...props,window:{windowN:'',TianWindowProfile:'[0.1,0.1,0.9,0.75]'},doorN:{doorN:''}};
 const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,15,15],properties);m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[4,5,8,9],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});
 const host=m.wallAt(5,5,0,'N');m.structure({type:'opening.add',opening:{id:'window',hostWallId:host.id,kind:'window',tile:'window'}});
 const tile='tian_street_pipe_straight_N_0',entry={id:tile,parts:[{dx:0,dy:0,tile}]};assert.equal(m.place(entry,5,5,0).ok,true);
 const doorHost=m.wallAt(6,5,0,'N');assert.equal(m.structure({type:'opening.add',opening:{id:'door',hostWallId:doorHost.id,kind:'door',tile:'doorN'}}).ok,true);
 const before=m.export();assert.equal(m.place(entry,6,5,0).ok,false);assert.deepEqual(m.export(),before);
 assert('solidfloor'in properties.tian_street_pavers_grey_0);assert.equal(properties.tian_street_pipe_meter_N_0.TianMaterial,'painted metal');
});
test('diagonal fixtures bind an editable host, reject freestanding placement and persist through undo',()=>{
 const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,15,15],props);
 m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[4,5,8,9],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});
 assert.equal(m.structure({type:'room.chamfer',roomId:'r',corner:'SE',distance:2}).ok,true);
 const wall=m.scene.walls.find(w=>w.axis==='D-'),tile='tian_street_pipe_straight_DM_0',entry={id:'tile:'+tile,parts:[{dx:0,dy:0,tile}]};
 const before=m.export();assert.equal(m.place(entry,2,2,0).ok,false);assert.deepEqual(m.export(),before);
 m.begin('Diagonal fixture');const result=m.place(entry,wall.x,wall.y,0);assert.equal(result.ok,true,result.reason);m.commit();
 assert.equal(m.scene.objects[0].wallMounts[0].wallId,wall.id);
 const saved=m.export();assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,m.properties).export(),saved);
 m.undo();assert.deepEqual(m.export(),before);m.redo();assert.deepEqual(m.export(),saved);
});
test('pipe ports meet exactly across a chamfer and a storey boundary',()=>{
 const ports=(tile,x,y,z)=>JSON.parse(props[tile].TianPipePorts).map(([u,v,h])=>[x+u,y+v,z*96+h]);
 const n=ports('tian_street_pipe_elbow_N_0',5,11,1),d=ports('tian_street_pipe_straight_DM_0',6,10,1),w=ports('tian_street_pipe_straight_W_0',9,7,1);
 assert.deepEqual(n[1],d[0]);assert.deepEqual(ports('tian_street_pipe_straight_DM_0',8,8,1)[1],w[1]);
 assert.deepEqual(n[2],ports('tian_street_pipe_riser_N_0',5,11,0)[1]);
 assert.match(props.tian_street_pipe_elbow_N_0.CustomName,/tee branch/);
});
test('straight pipes group four wall directions and auto-align to a diagonal host',async()=>{
 const {workshopCatalog}=await import('../src/workshop-model.js');
 const {orientationFamilies,collapseOrientations}=await import('../src/catalog-variants.js');
 const {resolveOrientedPlacement,wallFacePolygon}=await import('../src/workshop-placement.js');
 const entries=workshopCatalog(props,atlas,{}).entries.filter(e=>e.source.startsWith('tian_street_pipe_straight_')),families=orientationFamilies(entries,props);
 assert.equal(entries.length,4);assert.equal(collapseOrientations(entries,families).length,1);
 const selected=entries.find(e=>props[e.source].Facing==='N'),variants=families.get(selected.id);assert.equal(variants.length,4);
 const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,15,15],props);
 m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[4,5,8,9],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});m.structure({type:'room.chamfer',roomId:'r',corner:'SE',distance:2});
 const wall=m.scene.walls.find(w=>w.axis==='D-'),renderer={zoom:1,screen:(x,y,z)=>({x:(x-y)*32,y:(x+y)*16-z*96})};
 const face=wallFacePolygon(renderer.screen,wall.x,wall.y,0,wall.axis),point=face.reduce((v,p)=>({x:v.x+p.x/4,y:v.y+p.y/4}),{x:0,y:0}),args={entry:selected,model:m,renderer,px:point.x,py:point.y,z:0};
 const auto=resolveOrientedPlacement(args,variants,true);assert.equal(props[auto.entry.source].Facing,'D-');assert.equal(auto.target.placementProblem,null);assert.equal(m.place(auto.entry,auto.target.x,auto.target.y,0).ok,true);
 const manual=resolveOrientedPlacement(args,variants,false);assert.equal(manual.entry.id,selected.id);assert.match(manual.target.placementProblem,/Press R/);
});
test('wide canopy is one four-way prefab with both wall supports and reversible rehosting',async()=>{
 const {workshopCatalog}=await import('../src/workshop-model.js'),{orientationFamilies}=await import('../src/catalog-variants.js');
 const catalog=workshopCatalog(props,atlas,{}).entries,entry=catalog.find(e=>e.source==='tian_street_wide_canopy_E_0');
 assert.equal(entry.parts.length,2);assert.equal(orientationFamilies(catalog,props).get(entry.id).length,4);
 const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,15,15],props,catalog);
 m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[4,5,8,9],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});
 m.begin('Wide canopy');assert.equal(m.place(entry,8,6,0).ok,true);m.commit();
 const fixture=m.scene.objects[0];assert.equal(fixture.wallMounts.length,2);assert.equal(new Set(fixture.wallMounts.map(x=>x.wallId)).size,2);
 for(const part of fixture.parts)assert(!('solid'in props[part.tile]));
 const saved=m.export();m.begin('Rotate and move');assert.equal(m.structure({type:'objects.rehost',id:fixture.id,assetId:'tile:tian_street_wide_canopy_N_0',x:5,y:5,levelId:'level:0'}).ok,true);m.commit();
 assert.equal(m.scene.objects[0].id,fixture.id);assert.equal(m.scene.objects[0].wallMounts.length,2);
 m.undo();assert.deepEqual(m.export(),saved);m.redo();const moved=m.export();
 assert.equal(m.structure({type:'objects.rehost',id:fixture.id,assetId:entry.id,x:8,y:8,levelId:'level:0'}).ok,false);assert.deepEqual(m.export(),moved);
 assert.deepEqual(new StructuredWorkshopModel(moved,m.bounds,props,catalog).export(),moved);
});
test('preparation sink is reachable water, preserves saves and does not advertise table support',()=>{
 for(const facing of ['N','E','S','W']){
  const tile=`tian_cafe_prep_sink_${facing}_0`;
  assert(atlas.regions[tile]);assert('waterPiped' in props[tile]);assert(!('IsTable' in props[tile]));
  const m=new StructuredWorkshopModel({version:1,squares:Array.from({length:9},(_,i)=>({x:4+i%3,y:4+Math.floor(i/3),z:0,tiles:['floor']})),items:[]},[0,0,12,12],props);
  m.begin('Sink');assert.equal(m.place({id:'tile:'+tile,parts:[{dx:0,dy:0,tile}]},5,5,0).ok,true);m.commit();
  const saved=m.export();assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,props).export(),saved);
  const w=new World({playableBounds:m.bounds,cells:[]},props);w.setHousePlan(saved);
  assert(w.interactions({x:6.5,y:5.5,z:0}).some(o=>o.tile===tile&&o.type==='water'));
  assert(!w.interactions({x:9.5,y:5.5,z:0}).some(o=>o.tile===tile));
  m.undo();assert(!m.square(5,5,0).tiles.includes(tile));m.redo();assert.deepEqual(m.export(),saved);
 }
});
test('raised paving reuses exact texture regions and is exposed in the platform catalog',async()=>{
 const {workshopCatalog}=await import('../src/workshop-model.js'),{catalogFacet,windowConditions}=await import('../src/catalog-navigation.js');
 const catalog=workshopCatalog(props,atlas,{}).entries;
 for(const style of ['grey','rose'])for(const h of [2,4,6,8,12,16]){
  const tile=`tian_street_platform_${style}_${h}_0`,entry=catalog.find(e=>e.source===tile);
  assert.ok(entry);assert.equal(entry.category,'Floors & terrain');assert.equal(catalogFacet(entry,props,windowConditions(props)).type,'Platforms');
  assert.deepEqual(atlas.regions[tile],atlas.regions[`tian_street_pavers_${style}_0`]);assert.equal(Number(props[tile].TianGroundHeight),h);
 }
});
