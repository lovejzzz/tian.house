import test from 'node:test';
import assert from 'node:assert/strict';
import {installCafeAssets} from '../src/cafe-assets.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
const props={},atlas={regions:{}};installCafeAssets(props,atlas);
test('storm drain stays an editable floor overlay without removing street support',()=>{
 const tile='tian_street_interlocking_0',drain='tian_street_drain_N_0';
 assert.ok(atlas.regions[tile]);assert.ok(atlas.regions[drain]);
 assert.ok('FloorOverlay'in props[drain]);assert.ok(!('solid'in props[drain]));
 const model=new StructuredWorkshopModel({version:1,squares:[{x:2,y:2,z:0,tiles:[tile]}],items:[]},[0,0,5,5],props);
 model.begin('Drain');assert.equal(model.place({id:'tile:'+drain,parts:[{dx:0,dy:0,tile:drain}]},2,2,0).ok,true);model.commit();
 assert.deepEqual(model.square(2,2,0).tiles,[tile,drain]);model.undo();assert.deepEqual(model.square(2,2,0).tiles,[tile]);model.redo();assert.deepEqual(model.square(2,2,0).tiles,[tile,drain]);
 assert.equal(model.placement({parts:[{dx:0,dy:0,tile:drain}]},3,3,0).ok,false);
 assert.equal(props[drain].TianVariantFamily,props.tian_street_drain_W_0.TianVariantFamily);
});

test('chamfer paving reuses atlas pixels and persists both shaped top and road base',()=>{
 const tile='tian_street_chamfer_rose_N_0',base='tian_street_interlocking_0';
 assert.deepEqual(atlas.regions[tile],atlas.regions.tian_street_platform_rose_6_0);
 const model=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,5,5],props);
 const entry={id:'tile:'+tile,parts:[{dx:0,dy:0,tile}]};
 model.begin('Chamfer');assert.equal(model.place(entry,2,2,0).ok,true);model.commit();
 assert.deepEqual(model.square(2,2,0).tiles,[base,tile]);
 model.undo();assert.equal(model.square(2,2,0),undefined);
 model.redo();assert.deepEqual(model.square(2,2,0).tiles,[base,tile]);
 const restored=new StructuredWorkshopModel(JSON.parse(JSON.stringify(model.plan)),[0,0,5,5],props);
 assert.deepEqual(restored.square(2,2,0).tiles,[base,tile]);
 for(const face of 'NESW')assert.equal(props['tian_street_chamfer_rose_'+face+'_0'].TianVariantFamily,'tian_street_chamfer_rose');
});
