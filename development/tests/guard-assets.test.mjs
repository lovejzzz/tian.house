import test from 'node:test';
import assert from 'node:assert/strict';
import {installMasonryAssets} from '../src/masonry-assets.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {World} from '../src/world.js';
import {Visibility} from '../src/visibility.js';
import {category} from '../src/workshop-categories.js';
import {catalogFacet} from '../src/catalog-navigation.js';

test('guard families remain transparent to sight, block movement and persist on supported void edges',()=>{
 const props={floor:{solidfloor:''}},atlas={regions:{}};installMasonryAssets(props,atlas);
 for(const style of ['mesh','bars'])for(const axis of ['N','W']){
  const tile=`tian_guard_${style}_${axis}`,p=props[tile];assert.ok(atlas.regions[tile]);
  assert.equal(p.TianVariantFamily,`tian_guard_${style}`);
  assert.equal(category(tile,p),'Walls & roofs');
  const facet=catalogFacet({name:p.CustomName,source:tile,category:category(tile,p)},props,new Map());
  assert.equal(facet.type,'Guards & railings');
  const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props);
  assert.equal(m.structure({type:'room.add',room:{id:'r',name:'Gallery',levelId:'level:1',z:1,rect:[2,2,10,10],floorTile:'floor',wallN:'tian_masonry_ivory_1',wallW:'tian_masonry_ivory_0'}}).ok,true);
  assert.equal(m.structure({type:'floorOpening.add',roomId:'r',opening:{id:'void',rect:[5,5,7,7]}}).ok,true);
  m.begin('Guard');const result=m.structure({type:'walls.draw',pathId:'guard',levelId:'level:1',points:axis==='N'?[[5,5],[7,5]]:[[5,5],[5,7]],wallN:`tian_guard_${style}_N`,wallW:`tian_guard_${style}_W`});
  assert.equal(result.ok,true,result.reason);assert.equal(m.commit(),true);
  const world=new World({playableBounds:m.bounds},props);world.setHousePlan(m.export());
  const a=axis==='N'?[5.5,4.5]:[4.5,5.5],b=[5.5,5.5],v=new Visibility(world);
  assert.equal(v.lineTo({x:a[0],y:a[1],z:1},...b),true);
  assert.equal(world.canStep(...a,...b,1),false);
  // Isolate guard collision from the missing-floor barrier.
  const supported=m.export();for(const s of supported.squares)if(s.z===1&&s.x>=5&&s.x<7&&s.y>=5&&s.y<7)s.tiles.unshift('floor');
  world.setHousePlan(supported);assert.equal(world.canStep(...a,...b,1),false);
  for(const s of supported.squares)s.tiles=s.tiles.filter(t=>!t.startsWith('tian_guard_'));
  world.setHousePlan(supported);assert.equal(world.canStep(...a,...b,1),true);
  assert.deepEqual(m.square(5,5,1).tiles,[tile]);
  assert.deepEqual(new StructuredWorkshopModel(m.export(),m.bounds,props).export(),m.export());
 }
});
