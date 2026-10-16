import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {installCafeAssets} from '../src/cafe-assets.js';import {installMasonryAssets} from '../src/masonry-assets.js';import {installArchitecturalAssets} from '../src/architectural-assets.js';
import {workshopCatalog} from '../src/workshop-model.js';import {orientationFamilies,collapseOrientations} from '../src/catalog-variants.js';import {World} from '../src/world.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
const props={floor:{solidfloor:''},doorN:{doorN:''},doorW:{doorW:''}},atlas={regions:{}};installCafeAssets(props,atlas);installMasonryAssets(props,atlas);installArchitecturalAssets(props,atlas);
const catalog=workshopCatalog(props,atlas,{}).entries,entry=(kind,axis)=>catalog.find(e=>e.id===`tile:tian_cafe_${kind}_${axis}_0`);
function setup(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props,catalog);assert.equal(m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[4,4,12,12],floorTile:'floor',wallN:'tian_masonry_chalk_1',wallW:'tian_masonry_chalk_0'}}).ok,true);return m;}
test('sills and usable wall shelves collapse into two families with appropriate catalog categories',()=>{
 const entries=catalog.filter(e=>/tian_cafe_(sill|wall_shelves)/.test(e.id));assert.equal(entries.length,6);assert.equal(collapseOrientations(entries,orientationFamilies(entries,props)).length,2);for(const axis of ['N','W']){assert.equal(entry('wall_shelves',axis).category,'Furniture');assert.equal(entry('sill',axis).category,'Decoration & tiles');}
});
test('sills support solid walls and profiled windows, reject doorways and preserve window IDs',()=>{
 for(const axis of ['N','W']){const m=setup(),wall=m.scene.walls.find(w=>w.axis===axis),before=m.export();assert.equal(m.place(entry('sill',axis),6,6,0).ok,false);assert.deepEqual(m.export(),before);
 assert.equal(m.structure({type:'opening.add',opening:{id:'w',hostWallId:wall.id,kind:'window',tile:`tian_tall_steel_window_${axis}_0`}}).ok,true);assert.equal(m.place(entry('sill',axis),wall.x,wall.y,0).ok,true);assert.equal(m.scene.openings[0].id,'w');assert.equal(m.scene.objects[0].wallMounts[0].wallId,wall.id);
 const saved=m.export();assert.equal(m.structure({type:'opening.replace',opening:{id:'d',hostWallId:wall.id,kind:'door',tile:'door'+axis}}).ok,false);assert.deepEqual(m.export(),saved);
 assert.equal(m.structure({type:'opening.remove',id:'w'}).ok,true);assert.ok(m.scene.objects.some(o=>o.assetId===entry('sill',axis).id));assert.deepEqual(new StructuredWorkshopModel(m.export(),m.bounds,props,catalog).export(),m.export());}
});
test('wall shelving keeps floor walkable, follows its wall with stored supplies and releases stock on removal',()=>{
 const m=setup(),wall=m.scene.walls.find(w=>w.axis==='N'&&w.y===4&&w.x===6);m.begin('Stock shelf');assert.equal(m.place(entry('wall_shelves','N'),6,4,0).ok,true);const fixture=m.scene.objects[0];assert.equal(m.place({id:'item:Base.Coffee2',itemType:'Base.Coffee2',parts:[],storeInContainer:true},6,4,0).ok,true);m.commit();const before=m.export();
 const world=new World({playableBounds:m.bounds,cells:[]},props);world.setHousePlan(before);assert.equal(world.canStep(6.5,5.1,6.5,4.5,0),true);
 m.begin('Move stocked wall');let result=m.structure({type:'room.edgeMove',roomId:'r',wallId:wall.id,coordinate:3});assert.equal(result.ok,true,result.reason);m.commit();assert.equal(m.plan.items[0].y,3);assert.equal(m.scene.objects[0].y,3);m.undo();assert.deepEqual(m.export(),before);m.redo();
 assert.equal(m.structure({type:'objects.remove',ids:[fixture.id]}).ok,true);assert.equal(m.plan.items[0].storageTile,undefined);assert.equal(m.plan.items[0].y,3);
});

test('shelf display slots place actual inventory on all three tiers without fabricating packages',async()=>{
 const {shelfDisplay}=await import('../src/shelf-display.js');const items=Array.from({length:7},(_,i)=>({id:i,type:'Base.Coffee2'}));
 for(const axis of ['N','W']){const rows=shelfDisplay(items,entry('wall_shelves',axis).source,props);assert.equal(rows.length,6);assert.deepEqual(rows.map(d=>d.item.id),[0,1,2,3,4,5]);assert.equal(rows[0].size,14);assert.ok(Math.abs(rows[2].y-rows[0].y-22)<1e-9);assert.ok(Math.abs(rows[4].y-rows[2].y-22)<1e-9);assert.ok(axis==='N'?rows[0].x>0:rows[0].x<0);assert.deepEqual(shelfDisplay([],entry('wall_shelves',axis).source,props),[]);}
 assert.equal(shelfDisplay(items,'old',{}).length,1);assert.equal(shelfDisplay(items,'bad',{bad:{TianDisplaySlots:'[[1,4,20]]'}}).length,1);
});
test('a mixed public command batch does not lose stocked items when a structural edit follows',async()=>{
 const {WorkshopCommands}=await import('../src/workshop-commands.js');const m=setup();assert.equal(m.place(entry('wall_shelves','N'),6,4,0).ok,true);const assets=new Map(catalog.map(e=>[e.id,e]));assets.set('item:Base.Coffee2',{id:'item:Base.Coffee2',itemType:'Base.Coffee2',parts:[]});
 const result=new WorkshopCommands(m,assets).commit({requestId:'stock-and-paint',baseRevision:m.revision,operations:[{type:'place',assetId:'item:Base.Coffee2',x:6,y:4,z:0,storeInContainer:true},{type:'room.finish',roomId:'r',side:'room',wallN:'tian_masonry_navy_1',wallW:'tian_masonry_navy_0'}]});assert.equal(result.ok,true,result.error);assert.equal(m.plan.items.length,1);assert.equal(m.scene.legacy.items.length,1);assert.equal(m.plan.items[0].storageTile,'tian_cafe_wall_shelves_N_0');
});
test('conduit mounts above doors, survives replacement and follows its wall',()=>{
 for(const axis of ['N','W']){
 const m=setup(),wall=m.scene.walls.find(w=>w.axis===axis),fixture=entry('conduit_straight',axis);
 assert.equal(m.place(fixture,7,7,0).ok,false);
 assert.equal(m.structure({type:'opening.add',opening:{id:'d',hostWallId:wall.id,kind:'door',tile:'tian_cafe_service_door_'+(axis==='N'?1:0)}}).ok,true);
 m.begin('Conduit');assert.equal(m.place(fixture,wall.x,wall.y,0).ok,true);m.commit();const before=m.export();
 assert.equal(m.scene.objects[0].wallMounts[0].wallId,wall.id);
 assert.equal(m.structure({type:'opening.replace',opening:{id:'d',hostWallId:wall.id,kind:'door',tile:'door'+axis}}).ok,true);
 assert.equal(m.scene.objects.length,1);assert.deepEqual(new StructuredWorkshopModel(m.export(),m.bounds,props,catalog).export(),m.export());
 const result=m.structure({type:'room.edgeMove',roomId:'r',wallId:wall.id,coordinate:3});assert.equal(result.ok,true,result.reason);
 assert.equal(axis==='N'?m.scene.objects[0].y:m.scene.objects[0].x,3);
 assert.deepEqual(new StructuredWorkshopModel(before,m.bounds,props,catalog).export(),before);assert.equal(fixture.category,'Decoration & tiles');
 }
});
test('raised-door geometry supplies lintel support without introducing a collision',()=>{
 const m=setup();m.structure({type:'walls.draw',pathId:'inner',levelId:'level:0',points:[[7,7],[8,7]],wallN:'tian_masonry_ivory_1',wallW:'tian_masonry_ivory_0'});
 m.structure({type:'opening.add',opening:{id:'raised',hostWallId:'inner:0',kind:'door',tile:'tian_cafe_service_door_1'}});
 assert.equal(m.structure({type:'opening.threshold',id:'raised',threshold:{height:8,depth:.4,color:'#444744'}}).ok,true);
 assert.equal(m.place(entry('conduit_straight','N'),7,7,0).ok,true);
 const world=new World({playableBounds:m.bounds},props);world.setHousePlan(m.export());
 assert.equal(world.canStep(7.5,7.2,7.5,6.8,0),false);
 world.change(7,7,0,'scene-opening:raised',{open:true});assert.equal(world.canStep(7.5,7.2,7.5,6.8,0),true);
});

test('opposite-face shelf rehosting preserves supplies and only exposes its reachable side',async()=>{
 const {shelfDisplay}=await import('../src/shelf-display.js');const m=setup();
 assert.equal(m.structure({type:'walls.draw',pathId:'divider',levelId:'level:0',points:[[8,6],[8,10]],wallN:'tian_masonry_chalk_1',wallW:'tian_masonry_chalk_0'}).ok,true);
 m.begin('Shelf');assert.equal(m.place(entry('wall_shelves','W'),4,7,0).ok,true);
 assert.equal(m.place({id:'item:Base.Coffee2',itemType:'Base.Coffee2',parts:[],storeInContainer:true},4,7,0).ok,true);m.commit();const shelf=m.scene.objects[0],before=m.export();
 m.begin('Rehost');const result=m.structure({type:'objects.rehost',id:shelf.id,assetId:entry('wall_shelves','E').id,x:8,y:7,levelId:'level:0'});assert.equal(result.ok,true,result.reason);m.commit();
 assert.equal(m.plan.items[0].storageTile,'tian_cafe_wall_shelves_E_0');assert.equal(m.plan.items[0].x,8);
 const world=new World({playableBounds:m.bounds,cells:[]},props);world.setHousePlan(m.export());
 const hasShelf=p=>world.interactions({...p,z:0}).some(o=>o.tile==='tian_cafe_wall_shelves_E_0');
 assert.equal(hasShelf({x:7.5,y:7.5}),true);assert.equal(hasShelf({x:8.5,y:7.5}),false);
 const slots=shelfDisplay([{id:'coffee'}],'tian_cafe_wall_shelves_E_0',props);assert.equal(slots[0].custom,true);assert.ok(slots[0].x<0);
 m.undo();assert.deepEqual(m.export(),before);m.redo();assert.equal(m.plan.items[0].x,8);
});
test('utility batch uses real wall support and border overlays retain structural ground',()=>{
 const m=setup(),find=id=>catalog.find(e=>e.id==='tile:'+id);
 for(const kind of ['cooling_unit','outlet_low','outlet_worktop']){
  const e=find(`tian_wall_${kind}_N_0`);assert.ok(e);assert.equal(m.place(e,6,6,0).ok,false);assert.equal(m.place(e,6,4,0).ok,true);
 }
 const border=find('tian_material_stone_border_N_0');assert.equal(m.place(border,2,2,0).ok,false);assert.equal(m.place(border,6,4,0).ok,true);
 assert.ok(m.square(6,4,0).tiles.includes('floor'));assert.ok(m.square(6,4,0).tiles.includes(border.source));
 const saved=m.export();assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,props,catalog).export(),saved);
});

test('multi-panel wall graphics require every segment and retain independent support identities',()=>{
 for(const span of [2,3])for(const [axis,suffix,points,x,y] of [['N','N',[[6,6],[6+span,6]],6,6],['W','W',[[6,6],[6,6+span]],6,6],['D-','DM',[[6,6+span],[6+span,6]],6,6],['D+','DP',[[6,6],[6+span,6+span]],6,6]]){
  const m=setup(),e=catalog.find(e=>e.id===`tile:tian_wall_symbol_${span}_${suffix}_0`);assert.ok(e);assert.equal(e.parts.length,span);
  assert.equal(m.place(e,x,y,0).ok,false);
  assert.equal(m.structure({type:'walls.draw',pathId:'graphic-host',levelId:'level:0',points,wallN:'tian_masonry_chalk_1',wallW:'tian_masonry_chalk_0'}).ok,true);
  m.begin('Graphic');const placed=m.place(e,x,y,0);assert.equal(placed.ok,true,`${axis}/${span}: ${placed.reason}; ${JSON.stringify(e.parts)}`);assert.equal(m.commit(),true);
  const graphic=m.scene.objects.find(o=>o.assetId===e.id);assert.equal(graphic.wallMounts.length,span);assert.equal(new Set(graphic.wallMounts.map(h=>h.wallId)).size,span);
  const before=m.export();m.begin('Move entire support');const result=m.structure({type:'walls.move',ids:graphic.wallMounts.map(h=>h.wallId),dx:1,dy:0});assert.equal(result.ok,true,result.reason);assert.equal(m.commit(),true);assert.equal(m.scene.objects.find(o=>o.id===graphic.id).x,x+1);m.undo();assert.deepEqual(m.export(),before);
  assert.deepEqual(new StructuredWorkshopModel(m.export(),m.bounds,props,catalog).export(),m.export());
 }
});
