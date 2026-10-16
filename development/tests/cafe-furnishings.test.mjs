import test from 'node:test';import assert from 'node:assert/strict';
import {installOriginalAssets} from '../src/original-assets.js';
import {workshopCatalog} from '../src/workshop-model.js';
import {orientationFamilies} from '../src/catalog-variants.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {World} from '../src/world.js';
import {objectFootprint} from '../src/object-footprints.js';
import {polygonSignedArea} from '../src/polygon-footprint.js';
import {furnishingLift} from '../src/furnishing.js';
const props={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''}},atlas={regions:{}};installOriginalAssets(props,atlas);
const catalog=workshopCatalog(props,atlas,{}).entries,counter=face=>catalog.find(e=>e.id===`tile:tian_cafe_counter_${face}_0`),device=kind=>catalog.find(e=>e.id===`tile:tian_cafe_${kind}_N_0`);
function model(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props,catalog);assert.equal(m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[1,1,18,18],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);return m;}
test('sparse L counters retain five parts in all four catalog orientations and convex collision area',()=>{
 const families=orientationFamilies(catalog,props);
 for(const face of 'NESW'){const entry=counter(face);assert.equal(entry.parts.length,5);assert.equal(families.get(entry.id).length,4);let area=0;for(const part of entry.parts){const poly=objectFootprint(props[part.tile]);assert.ok(poly,part.tile);area+=Math.abs(polygonSignedArea(poly));}assert.ok(Math.abs(area-(4+Math.PI/4))<.001);}
 assert.equal(catalog.filter(e=>e.source?.startsWith('tian_cafe_counter')).length,4);
});
test('counter equipment stays supported through four rotations, undo and serialized reopening',()=>{
 const m=model();m.begin('Furnish');assert.equal(m.place(counter('N'),7,7,0).ok,true);assert.equal(m.place(device('espresso'),7,7,0).ok,true);assert.equal(m.place(device('grinder'),8,7,0).ok,true);assert.equal(m.place(device('brewkit'),9,7,0).ok,true);assert.equal(m.place(device('cups'),9,8,0).ok,true);m.commit();const before=m.export(),host=m.scene.objects[0];
 for(let n=0;n<4;n++){m.begin('Rotate counter');const result=m.structure({type:'objects.rotate',ids:[host.id],turns:1});assert.equal(result.ok,true,result.reason);m.commit();for(const item of m.scene.objects.slice(1)){const h=m.scene.objects.find(o=>o.id===item.hostId);assert.equal(h.id,host.id);assert.ok(h.parts.some(p=>h.x+p.dx===item.x&&h.y+p.dy===item.y));assert.equal(furnishingLift(item.parts[0].tile,m.square(item.x,item.y,0),props),35);}}
 assert.deepEqual(m.scene.objects,before.sceneDocument.objects);const saved=m.export();assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,props,catalog).export(),saved);m.undo();m.redo();assert.deepEqual(m.export(),saved);
 const previous=m.export();assert.equal(m.place(device('espresso'),5,5,0).ok,false);assert.deepEqual(m.export(),previous);
});
test('world uses rounded geometry rather than a full-cell invisible corner in every orientation',()=>{
 const rotate=(x,y,n)=>{for(let i=0;i<n;i++)[x,y]=[3-y,x];return [x+7,y+7];};
 for(const [n,face] of [...'NESW'].entries()){const m=model();assert.equal(m.place(counter(face),7,7,0).ok,true);const w=new World({playableBounds:m.bounds,cells:[]},props);w.setHousePlan(m.export());const free=rotate(2.92,.08,n),solid=rotate(2.4,.6,n);assert.equal(w.objectOverlap(...free,0),0);assert.ok(w.objectOverlap(...solid,0)>.12);assert.equal(w.canStep(...free,...free,0),true);assert.equal(w.canStep(...free,...solid,0),false);
 const staff=rotate(1.4,1.6,n),actor={x:staff[0],y:staff[1],z:0},target=rotate(1.4,.4,n);w.move(actor,target[0]-actor.x,target[1]-actor.y);assert.equal(w.objectOverlap(actor.x,actor.y,0),0);assert.ok(Math.hypot(actor.x-target[0],actor.y-target[1])>.5);
 }
});
test('invalid or concave footprint metadata preserves legacy solid-cell collision',()=>{
 for(const input of ['oops','[[0,0],[1,1],[0,0]]','[[0,0],[1,0],[0.3,0.3],[1,1],[0,1]]','[[0,0],[2,0],[1,1]]']){const p={solid:'',TianCollisionPolygon:input};assert.equal(objectFootprint(p),null);const w=new World({playableBounds:[0,0,3,3],cells:[]},{floor:props.floor,bad:p});w.setHousePlan({squares:[{x:1,y:1,z:0,tiles:['floor','bad']}]});assert.equal(w.flags(1,1,0).solid,true);}
});
test('reverse-counter details retain mount requirements and editable direction families',()=>{
 const families=orientationFamilies(catalog,props),m=model();
 for(const kind of ['framed_menu','display_cabinet','ceiling_spot'])for(const face of 'NESW')assert.equal(families.get(`tile:tian_cafe_${kind}_${face}_0`).length,4);
 const menu=device('framed_menu'),spot=device('ceiling_spot');
 assert.equal(m.place(menu,7,7,0).ok,false);assert.equal(m.place(spot,7,7,0).ok,false);
 assert.equal(m.place(counter('N'),7,7,0).ok,true);assert.equal(m.place(menu,7,7,0).ok,true);
 assert.equal(furnishingLift(menu.source,m.square(7,7,0),props),35);
 assert.equal(m.place({id:'tile:floor',parts:[{tile:'floor',dx:0,dy:0}]},7,7,1).ok,true);
 assert.equal(m.place(spot,7,7,0).ok,true);
 const before=m.export();assert.deepEqual(new StructuredWorkshopModel(before,m.bounds,props,catalog).export(),before);
 for(const face of 'NESW')assert.ok(Math.abs(polygonSignedArea(objectFootprint(props[`tian_cafe_display_cabinet_${face}_0`]))-.47*.94)<1e-9);
});
test('circular display pair follows cabinet support through rotation and reload',()=>{
 const m=model(),cabinet=device('display_cabinet'),display=device('round_display_pair');
 assert.equal(m.place(display,7,7,0).ok,false);
 assert.equal(m.place(cabinet,7,7,0).ok,true);assert.equal(m.place(display,7,7,0).ok,true);
 const host=m.scene.objects.find(o=>o.assetId===cabinet.id),child=m.scene.objects.find(o=>o.assetId===display.id);
 assert.equal(child.hostId,host.id);assert.equal(furnishingLift(display.source,m.square(7,7,0),props),52);
 for(let i=0;i<4;i++){m.begin('Turn cabinet');assert.equal(m.structure({type:'objects.rotate',ids:[host.id],turns:1}).ok,true);m.commit();const saved=m.export();assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,props,catalog).export(),saved);assert.equal(m.scene.objects.find(o=>o.id===child.id).hostId,host.id);}
});
