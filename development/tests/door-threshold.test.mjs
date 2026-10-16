import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';import {installCafeAssets} from '../src/cafe-assets.js';import {installMasonryAssets} from '../src/masonry-assets.js';
import {thresholdGeometry,thresholdHeight} from '../src/door-threshold.js';import {World} from '../src/world.js';
const props={floor:{solidfloor:''}},atlas={regions:{}};installCafeAssets(props,atlas);installMasonryAssets(props,atlas);
function setup(axis='N'){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props);m.begin('Room');m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[2,2,12,12],floorTile:'floor',wallN:'tian_masonry_ivory_1',wallW:'tian_masonry_ivory_0'}});m.structure({type:'walls.draw',pathId:'p',levelId:'level:0',points:axis==='N'?[[5,5],[6,5]]:[[5,5],[5,6]],wallN:'tian_masonry_ivory_1',wallW:'tian_masonry_ivory_0'});m.structure({type:'opening.add',opening:{id:'d',hostWallId:'p:0',kind:'door',tile:'tian_cafe_service_door_'+(axis==='N'?1:0)}});m.commit();return m;}
const threshold={height:8,depth:.4,color:'#444744'};
test('N/W raised doors compile once with shared step height; open passage preserves floor index and closed leaf blocks',()=>{
 for(const axis of ['N','W']){const m=setup(axis),before=m.export();m.begin('Threshold');assert.equal(m.structure({type:'opening.threshold',id:'d',threshold}).ok,true);m.commit();const plan=m.export(),w=plan.polygonGeometry.walls.find(w=>w.opening?.id==='d'),world=new World({playableBounds:m.bounds},props);world.setHousePlan(plan);assert.ok(w);assert.equal(plan.squares.find(s=>s.x===5&&s.y===5).tiles.some(t=>t.startsWith('tian_cafe_service_door')),false);
 const a=axis==='N'?{x:5.5,y:5.7,z:0}:{x:5.7,y:5.5,z:0};assert.equal(world.apparentZ(a),0);const delta=axis==='N'?[0,-.4]:[-.4,0];world.move(a,...delta);assert.ok(Math.abs(world.apparentZ(a)-8/96)<1e-8);world.move(a,...delta);assert.ok(axis==='N'?a.y>=5:a.x>=5);
 world.change(w.x,w.y,w.z,w.opening.stateTile,{open:true});world.move(a,...delta);assert.ok(axis==='N'?a.y<5:a.x<5);assert.equal(a.z,0);world.move(a,...delta);assert.equal(world.apparentZ(a),0);
 assert.deepEqual(new StructuredWorkshopModel(plan,m.bounds,props).export(),plan);m.undo();assert.deepEqual(m.export(),before);m.redo();assert.deepEqual(m.export(),plan);}
});
test('invalid thresholds and unsupported floor fail atomically; replacement preserves and explicit removal clears height',()=>{
 const m=setup(),before=m.export();for(const t of [{...threshold,height:40},{...threshold,depth:-1},{...threshold,color:'red'}]){assert.equal(m.structure({type:'opening.threshold',id:'d',threshold:t}).ok,false);assert.deepEqual(m.export(),before);}
 assert.equal(m.structure({type:'opening.threshold',id:'d',threshold}).ok,true);assert.equal(m.structure({type:'opening.replace',opening:{id:'d',hostWallId:'p:0',kind:'door',tile:'tian_cafe_service_door_1'}}).ok,true);assert.deepEqual(m.scene.openings[0].threshold,threshold);
 assert.equal(m.structure({type:'opening.threshold',id:'d',threshold:null}).ok,true);assert.equal(m.plan.polygonGeometry,undefined);
 const wall=m.scene.walls.find(w=>w.axis==='N'&&w.y===2);m.structure({type:'opening.add',opening:{id:'outer',hostWallId:wall.id,kind:'door',tile:'tian_cafe_service_door_1'}});const outer=m.export();assert.equal(m.structure({type:'opening.threshold',id:'outer',threshold}).ok,false);assert.deepEqual(m.export(),outer);
});
test('diagonal threshold geometry uses opening width, not whole diagonal length',()=>{const wall={a:[0,0],b:[1,1],opening:{width:1,threshold}};const g=thresholdGeometry(wall);assert.equal(g.width,1);assert.equal(thresholdHeight(wall,.5,.5),8);assert.equal(thresholdHeight(wall,0,0),0);assert.equal(thresholdHeight(wall,1,0),0);});
test('replacing a raised door does not mutate a reusable caller command',async()=>{
 const {replaceSceneOpenings}=await import('../src/scene-openings.js');
 const scene={openings:[{id:'d',hostWallId:'w',kind:'door',threshold}]};
 const input=[{id:'d',hostWallId:'w',kind:'door',tile:'next'}],before=structuredClone(input);
 replaceSceneOpenings(scene,input);assert.deepEqual(input,before);assert.deepEqual(scene.openings[0].threshold,threshold);
});
test('raised sidewalk meets a door threshold through public edits and actual world movement',()=>{
 const local={...props,raised:{solidfloor:'',TianGroundHeight:'6'}},base=setup(),m=new StructuredWorkshopModel(base.export(),base.bounds,local);
 assert.equal(m.placeFloorBatch({parts:[{dx:0,dy:0,tile:'floor'}]},[{x:5,y:1,z:0}]).ok,true);
 const wall=m.scene.walls.find(w=>w.axis==='N'&&w.x===5&&w.y===2);
 assert.equal(m.structure({type:'opening.add',opening:{id:'street',hostWallId:wall.id,kind:'door',tile:'tian_cafe_service_door_1'}}).ok,true);
 const raised={parts:[{dx:0,dy:0,tile:'raised'}]},before=m.export();
 assert.equal(m.placement(raised,5,1,0).ok,false);assert.equal(m.place(raised,5,1,0).ok,false);assert.deepEqual(m.export(),before);
 assert.equal(m.structure({type:'opening.threshold',id:'street',threshold}).ok,true);
 const placed=m.place(raised,5,1,0);assert.equal(placed.ok,true,placed.reason);const plan=m.export(),world=new World({playableBounds:m.bounds},local);world.setHousePlan(plan);
 const a={x:5.5,y:1.5,z:0};assert.equal(world.apparentZ(a),6/96);world.move(a,0,.25);assert.equal(world.apparentZ(a),8/96);
 world.move(a,0,.4);assert.ok(a.y<2,'closed door must still block');const w=plan.polygonGeometry.walls.find(w=>w.opening?.id==='street');world.change(w.x,w.y,w.z,w.opening.stateTile,{open:true});
 world.move(a,0,.4);world.move(a,0,.4);assert.ok(a.y>2.4);assert.equal(world.apparentZ(a),0);assert.equal(a.z,0);
 assert.equal(m.structure({type:'opening.threshold',id:'street',threshold:null}).ok,false);assert.deepEqual(m.export(),plan);
 assert.deepEqual(new StructuredWorkshopModel(plan,m.bounds,local).export(),plan);
});
