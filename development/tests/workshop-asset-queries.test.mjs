import test from 'node:test';import assert from 'node:assert/strict';import {WorkshopAssetQueries} from '../src/workshop-asset-queries.js';
const entries=Array.from({length:67},(_,i)=>({id:'asset:'+i,name:'Chair '+i,category:'Furniture',source:'chair_'+i,parts:[{dx:0,dy:0,tile:'chair_'+i}],facing:'N'}));
test('asset search reaches every result with stable pages and resets for a new query',()=>{const api=new WorkshopAssetQueries(entries,{}),ids=[];let offset=0;do{const page=api.search({query:'chair',offset});ids.push(...page.assets.map(e=>e.id));offset=page.nextOffset;}while(offset!==null);assert.deepEqual(ids,entries.map(e=>e.id));assert.equal(api.search({query:'absent'}).nextOffset,null);assert.equal(api.search({query:'asset:66'}).assets[0].id,'asset:66');assert.throws(()=>api.search({limit:101}));assert.throws(()=>api.search({offset:-1}));});
test('descriptions expose actual footprint and source mounting properties without leaking mutable catalog data',()=>{const entry={id:'tabletop',source:'tea',name:'Tea',category:'Items',parts:[{dx:0,dy:0,tile:'tea'},{dx:1,dy:0,tile:'cup'}]},api=new WorkshopAssetQueries([entry],{tea:{TianMount:'table',Surface:'34'},cup:{}}),result=api.describe('tabletop');assert.equal(result.units,'source-grid');assert.equal(result.footprint.width,2);assert.equal(result.parts[0].properties.TianMount,'table');result.parts[0].tile='changed';assert.equal(entry.parts[0].tile,'tea');assert.throws(()=>api.describe('unknown'));});
test('descriptions trace each prefab sprite to its selected imported page without inventing unknown provenance',()=>{
 const entry={id:'panel',source:'panel_0',name:'Panel',category:'Walls & roofs',parts:[{dx:0,dy:0,tile:'panel_0'},{dx:1,dy:0,tile:'unknown'}]},atlas={packs:[{file:'Tiles2x.pack',sha256:'pack-hash',pages:[{file:'page.png',sha256:'page-hash'}]}],regions:{panel_0:{page:'page.png',x:4,y:8,w:32,h:64,ox:-1,oy:2,ow:64,oh:128,scale:2}}};
 const api=new WorkshopAssetQueries([entry],{},atlas),result=api.describe('panel');
 assert.equal(result.provenance[0].pack,'Tiles2x.pack');assert.equal(result.provenance[0].pageSha256,'page-hash');assert.equal(result.provenance[0].region.offsetX,-1);assert.equal(result.provenance[0].region.scale,2);
 assert.equal(result.provenance[1].available,false);assert.equal(result.provenance[1].sourceKind,null);assert.equal(result.provenance[1].region,null);
 result.provenance[0].region.width=999;assert.equal(atlas.regions.panel_0.w,32);
});
test('generated art retains its recipe and does not pretend to come from an installed pack',()=>{
 const api=new WorkshopAssetQueries([{id:'symbol',source:'symbol',parts:[{dx:0,dy:0,tile:'symbol'}]}],{symbol:{TianRecipe:'cafe'}},{regions:{symbol:{page:'original-cafe.webp',x:0,y:0,w:96,h:160}}});
 const p=api.describe('symbol').provenance[0];assert.equal(p.sourceKind,'procedural');assert.equal(p.recipe,'cafe');assert.equal(p.pack,null);assert.equal(p.pageSha256,null);
});
