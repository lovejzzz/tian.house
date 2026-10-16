import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {orientationFamilies,collapseOrientations,entryFacing} from '../src/catalog-variants.js';
import {workshopCatalog} from '../src/workshop-model.js';
const p=JSON.parse(fs.readFileSync(new URL('../private-assets/world/properties.json',import.meta.url))),atlas=JSON.parse(fs.readFileSync(new URL('../private-assets/atlas.json',import.meta.url)));
const entries=workshopCatalog(p,atlas,{}).entries,families=orientationFamilies(entries,p);
const group=tile=>families.get('tile:'+tile)?.map(e=>e.source);
test('verified window directions collapse without merging shape or damage state',()=>{
 assert.deepEqual(group('fixtures_windows_01_48'),['fixtures_windows_01_48','fixtures_windows_01_50']);
 assert.deepEqual(group('fixtures_windows_01_49'),['fixtures_windows_01_49','fixtures_windows_01_51']);
 assert.notEqual(families.get('tile:fixtures_windows_01_48'),families.get('tile:fixtures_windows_01_52'));
 assert.deepEqual(group('fixtures_doors_01_0'),['fixtures_doors_01_0','fixtures_doors_01_1']);
 assert.notEqual(families.get('tile:fixtures_doors_01_0'),families.get('tile:fixtures_doors_01_4'));
});
test('catalog consolidation retains every source and only one representative per family',()=>{
 const collapsed=collapseOrientations(entries,families);assert.ok(collapsed.length<entries.length);
 assert.equal(new Set(collapsed.flatMap(e=>families.get(e.id).map(v=>v.id))).size,entries.length);
 for(const e of collapsed){const g=families.get(e.id);if(g.length>1){assert.equal(new Set(g.map(v=>entryFacing(v,p))).size,g.length);assert.equal(new Set(g.map(v=>v.category)).size,1);}}
 assert.equal(families.get('stairs:N'),families.get('stairs:W'));
});

import {installHouseDetails} from '../src/house-detail-assets.js';

test('authored fixture direction declarations consolidate real drapes and lights without merging different fixtures',()=>{
 const props={},atlas={regions:{}};installHouseDetails(props,atlas);const entries=workshopCatalog(props,atlas,{}).entries,families=orientationFamilies(entries,props);
 for(const tile of ['tian_curtain_N','tian_wall_sconce_N','tian_wall_strip_N','tian_art_botanical_N']){const entry=entries.find(e=>e.source===tile),family=families.get(entry.id);assert.equal(family.length,2);assert.ok(family.every(e=>props[e.source].TianVariantFamily===props[tile].TianVariantFamily));}
 const ns=entries.filter(e=>['tian_curtain_N','tian_curtain_W'].includes(e.source));assert.equal(collapseOrientations(ns,families).length,1);
});
test('reviewed standing sink retains all four rotations across source index ranges',()=>{
 const ids=[12,13,28,29].map(n=>'fixtures_sinks_01_'+n);assert.deepEqual(group(ids[0]),ids);for(const id of ids)assert.equal(families.get('tile:'+id),families.get('tile:'+ids[0]));
});
test('installing authored details preserves all declared wall-face variants',async()=>{
 const {installHouseDetails}=await import('../src/house-detail-assets.js');const props={},atlas={regions:{}};installHouseDetails(props,atlas);const entries=workshopCatalog(props,atlas,{}).entries,families=orientationFamilies(entries,props);
 for(const family of ['mirror','towel'])assert.equal(families.get('tile:tian_bath_'+family+'_N').length,4);
});
