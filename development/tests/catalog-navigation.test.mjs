import test from 'node:test';import assert from 'node:assert/strict';import {openingType} from '../src/catalog-navigation.js';
test('window browser excludes source wall holes and separates curtains and doors',()=>{
 const e=source=>({id:'tile:'+source,source,name:source});
 assert.equal(openingType(e('fixtures_windows_wood_0'),{}),'Windows');
 assert.equal(openingType(e('fixtures_windows_curtains_01_0'),{}),'Curtains');
 assert.equal(openingType(e('walls_commercial_03_9'),{walls_commercial_03_9:{WindowN:''}}),'Parts');
 assert.equal(openingType(e('fixtures_doors_01_0'),{}),'Doors');
 assert.equal(openingType(e('tian_glazing_N_2_0'),{}),'Windows');
});
import {windowConditions,catalogFacet,catalogWindow} from '../src/catalog-navigation.js';
import fs from 'node:fs';
test('real window offsets distinguish intact, broken and removed glass',()=>{
 const p=JSON.parse(fs.readFileSync(new URL('../private-assets/world/properties.json',import.meta.url))),states=windowConditions(p);
 for(const [n,expected]of [[0,'Intact'],[48,'Intact'],[56,'Broken'],[88,'Glass removed']])assert.equal(states.get('fixtures_windows_wood_'+n),expected);
 assert.equal(catalogFacet({source:'fixtures_windows_wood_56',category:'Doors & windows'},p,states).condition,'Broken');
 assert.equal(catalogFacet({source:'unknown',category:'Doors & windows'},p,states).condition,'Unspecified');
});
test('semantic subtypes do not drop uncategorized entries',()=>{
 const facet=(category,name)=>catalogFacet({category,name,source:''},{},new Map()).type;
 assert.equal(facet('Furniture','Wooden Chair'),'Seating');assert.equal(facet('Appliances','Wooden Toilet'),'Bathroom');assert.equal(facet('Garden','Oak Tree'),'Trees');assert.equal(facet('Furniture','Unidentified Object'),'Other');
});
test('continuous window covers every item at row boundaries with bounded DOM',()=>{
 for(const columns of [1,2])for(const total of [0,1,61,32758]){
 const covered=new Set();for(let top=0;top<Math.max(1,Math.ceil(total/columns)*126);top+=252){const r=catalogWindow(total,top,356,columns);assert.ok(r.end-r.start<=20);for(let i=r.start;i<r.end;i++)covered.add(i);assert.equal(r.height,Math.ceil(total/columns)*126);}
 assert.equal(covered.size,total);
 }
});
test('composite tree prefabs and readable item types use meaningful facets',()=>{
 assert.equal(catalogFacet({tree:true,name:'Virginia pine',source:'e_virginiapine_1_0',category:'Garden'},{},new Map()).type,'Trees');
 assert.equal(catalogFacet({itemType:'Base.Bandage',itemCategory:'FirstAid',category:'Items'},{},new Map()).type,'Medical supplies');
});

test('mixed tile-and-wood atlas does not classify named ceramic tiles as wood',()=>{const e={category:'Floors & terrain',source:'floors_interior_tilesandwood_01_0',name:'Grey Diagonal Tiles'};assert.equal(catalogFacet(e,{},new Map()).type,'Tile & stone');assert.equal(catalogFacet({...e,name:'Wooden Floor'}, {},new Map()).type,'Wood');});

import {category} from '../src/workshop-categories.js';
import {installCafeAssets} from '../src/cafe-assets.js';
test('plumbed preparation sinks use kitchen appliances, with outdoor and bathroom meanings retained',()=>{
 const properties={};installCafeAssets(properties,{regions:{}});
 const classify=(tile,p)=>{const c=category(tile,p);return [c,catalogFacet({source:tile,name:p.CustomName,category:c},{[tile]:p},new Map()).type];};
 for(const face of ['N','E','S','W']){
  const tile=`tian_cafe_prep_sink_${face}_0`;
  assert.deepEqual(classify(tile,properties[tile]),['Appliances','Kitchen']);
 }
 assert.deepEqual(classify('custom_basin_0',{CustomName:'Kitchen sink',IsMoveAble:'',waterPiped:''}),['Appliances','Kitchen']);
 assert.deepEqual(classify('fixtures_bathroom_01_4',{CustomName:'Toilet',IsMoveAble:'',waterPiped:''}),['Appliances','Bathroom']);
 assert.deepEqual(classify('outdoor_pipe_0',{CustomName:'Standpipe',IsMoveAble:'',waterPiped:''}),['Outdoor','Water & farming']);
 assert.equal(category('curtain_0',{CustomName:'Curtain',TianMount:'window',waterPiped:''}),'Doors & windows');
});
