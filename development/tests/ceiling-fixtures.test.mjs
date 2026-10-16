import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {installCafeAssets} from '../src/cafe-assets.js';import {installMasonryAssets} from '../src/masonry-assets.js';
import {WorkshopModel,workshopCatalog} from '../src/workshop-model.js';import {World} from '../src/world.js';
const props={floor:{solidfloor:''}},atlas={regions:{}};installCafeAssets(props,atlas);installMasonryAssets(props,atlas);
const catalog=workshopCatalog(props,atlas,{}).entries,lamp=catalog.find(e=>e.source==='tian_cafe_pendant_0');
function setup(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props,catalog);assert.equal(m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[2,2,10,10],floorTile:'floor',wallN:'tian_masonry_ivory_1',wallW:'tian_masonry_ivory_0'}}).ok,true);return m;}
test('hanging fixtures require upper support; roof removal fails until fixtures are removed',()=>{
 const m=setup(),before=m.export();assert.equal(m.place(lamp,5,5,0).ok,false);assert.deepEqual(m.export(),before);
 assert.equal(m.structure({type:'roof.set',roomId:'r',roof:{id:'top',kind:'flat',tile:'floor'}}).ok,true);
 m.begin('Hanging lamp');assert.equal(m.place(lamp,5,5,0).ok,true);m.commit();const saved=m.export();
 assert.equal(m.scene.objects.length,1);assert.equal(m.scene.objects[0].assetId,lamp.id);
 assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,props,catalog).export(),saved);
 assert.equal(m.structure({type:'roof.remove',roomId:'r'}).ok,false);assert.deepEqual(m.export(),saved);
 const world=new World({playableBounds:m.bounds},props);world.setHousePlan(saved);assert.equal(world.canStep(5.5,5.2,5.5,5.8,0),true);
 m.undo();assert.equal(m.scene.objects.length,0);m.redo();assert.deepEqual(m.export(),saved);
 assert.equal(m.structure({type:'objects.remove',ids:[m.scene.objects[0].id]}).ok,true);assert.equal(m.structure({type:'roof.remove',roomId:'r'}).ok,true);
});
test('ceiling fixture cannot move beyond its support',()=>{
 const m=setup();m.structure({type:'roof.set',roomId:'r',roof:{id:'top',kind:'flat',tile:'floor'}});m.place(lamp,5,5,0);
 const saved=m.export();const result=m.structure({type:'objects.move',ids:[m.scene.objects[0].id],dx:8,dy:0});assert.equal(result.ok,false);assert.match(result.reason,/ceiling|floor above/);assert.deepEqual(m.export(),saved);
});
test('a partial upper floor is not accepted as full mounting support',()=>{
 const plan={version:1,squares:[{x:5,y:5,z:1,tiles:['floor']}],items:[],polygonGeometry:{version:1,walls:[],floors:[{x:5,y:5,z:1,tile:'floor',full:false,polygons:[[[0,0],[1,0],[0,1]]]}]}};
 const m=new WorkshopModel(plan,[0,0,20,20],props);assert.equal(m.placement(lamp,5,5,0).ok,false);
});
test('ceiling conduit families retain physical rotations and share upper-support validation',async()=>{
 const {orientationFamilies,collapseOrientations}=await import('../src/catalog-variants.js');
 const entries=catalog.filter(e=>e.source.startsWith('tian_cafe_ceiling_conduit_'));
 assert.equal(entries.length,10);assert.equal(collapseOrientations(entries,orientationFamilies(entries,props)).length,3);
 const m=setup();for(const e of entries)assert.equal(m.place(e,6,6,0).ok,false);
 m.structure({type:'roof.set',roomId:'r',roof:{id:'top',kind:'flat',tile:'floor'}});
 for(const e of entries){m.begin('Conduit');assert.equal(m.place(e,6,6,0).ok,true);m.commit();assert.equal(m.scene.objects.at(-1).assetId,e.id);m.undo();}
});
