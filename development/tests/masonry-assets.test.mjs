import test from 'node:test';import assert from 'node:assert/strict';
import {installMasonryAssets} from '../src/masonry-assets.js';
import {installArchitecturalAssets} from '../src/architectural-assets.js';
import {doorOpening,windowOpening} from '../src/wall-joins.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {workshopCatalog} from '../src/workshop-model.js';
import {orientationFamilies,collapseOrientations} from '../src/catalog-variants.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
const props={floor:{solidfloor:''},doorN:{doorN:''},doorW:{doorW:''}},atlas={regions:{}};installMasonryAssets(props,atlas);installArchitecturalAssets(props,atlas);
test('original masonry has matching N/W surrounds and orientation groups retain distinct materials without exposing generated surrounds',()=>{
 for(const style of ['navy','chalk','weathered','umber','ivory','ribbed','weathered_1','weathered_2','weathered_3','stripped_0','stripped_1','stripped_2','stripped_3','navy_lintel'])for(const [axis,n]of [['N',1],['W',0]]){
  const tile=`tian_masonry_${style}_${n}`;
  assert.equal(doorOpening(tile,axis,props),`tian_masonry_${style}_${n+10}`);
  assert.equal(windowOpening(tile,axis,props),`tian_masonry_${style}_${n+8}`);
  for(const offset of [0,8,10])assert.ok(atlas.regions[`tian_masonry_${style}_${n+offset}`]);
 }
 const entries=workshopCatalog(props,atlas,{}).entries.filter(e=>e.source.startsWith('tian_masonry_')),families=orientationFamilies(entries,props);
 assert.equal(entries.length,28);assert.equal(collapseOrientations(entries,families).length,14);
 for(const e of entries){const family=families.get(e.id);assert.equal(family.length,2);assert.equal(new Set(family.map(v=>props[v.source].TianVariantFamily)).size,1);}
});
test('changing masonry preserves doors, tall windows and original opening identities through undo and export',()=>{
 for(const axis of ['N','W']){
  const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props);
  assert.equal(m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[4,4,12,12],floorTile:'floor',wallN:'tian_masonry_chalk_1',wallW:'tian_masonry_chalk_0'}}).ok,true);
  const hosts=m.scene.walls.filter(w=>w.axis===axis).slice(2,4);
  for(const [i,w]of hosts.entries())assert.equal(m.structure({type:'opening.add',opening:{id:'opening'+i,hostWallId:w.id,kind:i?'window':'door',tile:i?`tian_tall_steel_window_${axis}_0`:'door'+axis}}).ok,true);
  const before=m.export();m.begin('Repaint');for(const w of hosts)assert.equal(m.structure({type:'wall.material',id:w.id,tile:`tian_masonry_navy_${axis==='N'?1:0}`}).ok,true);m.commit();
  assert.deepEqual(m.scene.openings,before.sceneDocument.openings);
  const window=m.plan.polygonGeometry.walls.find(w=>w.opening);assert.ok(window.tile.startsWith('tian_masonry_navy'));assert.equal(window.opening.id,'opening1');
  const door=m.square(hosts[0].x,hosts[0].y,0);assert.ok(door.tiles.includes(`tian_masonry_navy_${axis==='N'?11:10}`));assert.ok(door.tiles.includes('door'+axis));
  const changed=m.export();assert.deepEqual(new StructuredWorkshopModel(changed,m.bounds,props).export(),changed);m.undo();assert.deepEqual(m.export(),before);m.redo();assert.deepEqual(m.export(),changed);
 }
});
