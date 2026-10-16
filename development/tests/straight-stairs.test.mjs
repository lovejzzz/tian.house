import test from 'node:test';import assert from 'node:assert/strict';
import {straightStairPath,ReturnStairPath} from '../src/return-stair-path.js';
import {straightStairEntry} from '../src/scene-return-stairs.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {installCafeAssets} from '../src/cafe-assets.js';
import {World} from '../src/world.js';
const props={floor:{solidfloor:''},n:{WallN:''},w:{WallW:''}},atlas={regions:{}};installCafeAssets(props,atlas);
function setup(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,30,30],props);for(const z of [0,1])assert.equal(m.structure({type:'room.add',room:{id:'r'+z,name:'Floor',levelId:'level:'+z,z,rect:[1,1,28,28],floorTile:'floor',wallN:'n',wallW:'w'}}).ok,true);return m;}
test('all delivered straight stair lengths/directions agree on tread height, ports and guarded sides',()=>{
 for(const run of [3,4,5,6])for(const axis of ['N','W','E','S']){
  const entry=straightStairEntry(axis,run),route=new ReturnStairPath({x:0,y:0,z:0,shape:'straight',axis,run});
  assert.equal(entry.parts.length,run);
  for(const [i,c]of route.cells.entries()){
   const part=entry.parts[i],p=props[part.tile];assert.ok(atlas.regions[part.tile]);assert.deepEqual([part.dx,part.dy],[c.x,c.y]);
   assert.equal(+p.TianStairLow,c.low);assert.equal(+p.TianStairHigh,c.high);assert.equal(p.TianStairGradient,[c.gx,c.gy].join(','));
   assert.ok(Math.abs(route.height(c.x+.5,c.y+.5,0)-(i+.5)/run)<1e-8);
   for(const edge of JSON.parse(p.TianStairGuards)){const [a,b]=[edge.a,edge.b],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
    assert.equal(route.transition(c.x+.5,c.y+.5,c.x+.5+2*(mx-.5),c.y+.5+2*(my-.5),0)?.allowed,false);
   }
  }
 }
});
test('straight stairs place, ascend/descend, rotate, move and reopen through the shared editor',()=>{
 for(const axis of ['N','W','E','S']){
  const m=setup(),entry=straightStairEntry(axis,5);m.begin('Place');const placed=m.place(entry,8,8,0);assert.equal(placed.ok,true,placed.reason);m.commit();
  const saved=m.export(),id=m.scene.verticalLinks[0].id;assert.equal(m.plan.returnStairs[0].shape,'straight');
  const world=new World({playableBounds:m.bounds},props);world.setHousePlan(saved);const route=world.returnStairs[0].path,actor={x:route.bottom.x+.5,y:route.bottom.y+.5,z:0};
  for(const c of [...route.cells,route.top])world.move(actor,c.x+.5-actor.x,c.y+.5-actor.y);assert.equal(actor.z,1);assert.ok(Math.hypot(actor.x-route.top.x-.5,actor.y-route.top.y-.5)<.01);
  for(const c of [...route.cells].reverse().concat(route.bottom))world.move(actor,c.x+.5-actor.x,c.y+.5-actor.y);assert.equal(actor.z,0);assert.ok(Math.hypot(actor.x-route.bottom.x-.5,actor.y-route.bottom.y-.5)<.01);
  m.begin('Rotate and move');assert.equal(m.place({...straightStairEntry(axis==='N'?'E':'N',4),moveLinkId:id},15,15,0).ok,true);m.commit();assert.equal(m.scene.verticalLinks[0].run,4);
  assert.deepEqual(new StructuredWorkshopModel(m.export(),m.bounds,props).export(),m.export());m.undo();assert.deepEqual(m.export(),saved);
 }
});
test('straight stair invalid lengths and unsupported landings reject atomically',()=>{
 for(const run of [0,2,13,4.5])assert.throws(()=>straightStairPath({x:0,y:0,z:0,axis:'E',run}));
 const m=setup(),before=m.export();assert.equal(m.place(straightStairEntry('E',5),24,8,0).ok,false);assert.deepEqual(m.export(),before);
});
test('stair landings reject a solid boundary even when both landing floors exist',()=>{
 for(const [levelId,points]of [['level:0',[[8,8],[8,9]]],['level:1',[[13,8],[13,9]]]]){
  const m=setup();assert.equal(m.structure({type:'walls.draw',pathId:'block',levelId,points,wallN:'n',wallW:'w'}).ok,true);const before=m.export();
  const result=m.place(straightStairEntry('E',5),8,8,0);assert.equal(result.ok,false);assert.match(result.reason,/landing/);assert.deepEqual(m.export(),before);
 }
});
