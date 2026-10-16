import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {wallPathEdges} from '../src/scene-walls.js';
const props={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},wall_8:{WindowW:'',WallW:'',wall:''},wall_9:{WindowN:'',WallN:'',wall:''},window:{windowW:''}};
function setup(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props);m.begin('Room');m.structure({type:'room.add',room:{id:'room',name:'Test room',levelId:'level:0',z:0,rect:[1,1,12,12],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});m.commit();return m;}
const draw=(points,pathId='path')=>({type:'walls.draw',pathId,levelId:'level:0',points,wallN:'wall_1',wallW:'wall_0'});
test('orthogonal continuous walls have stable individual edges and no duplicated joints',()=>{
 assert.equal(wallPathEdges([[2,2],[5,2],[5,5],[5,2]]).length,6);assert.throws(()=>wallPathEdges([[2,2],[5,4]]));
 const m=setup();m.begin('Partition');assert.equal(m.structure(draw([[3,3],[3,6],[6,6]])).ok,true);m.commit();const walls=m.scene.walls.filter(w=>w.independent);assert.equal(walls.length,6);assert.equal(m.scene.rooms.length,1);
 const reopened=new StructuredWorkshopModel(JSON.parse(JSON.stringify(m.export())),m.bounds,props);
 assert.deepEqual(reopened.scene,m.scene);m.undo();assert.equal(m.scene.walls.some(w=>w.independent),false);
});
test('independent wall movement keeps opening hosts; removing it is undoable',()=>{
 const m=setup();m.begin('Wall');m.structure(draw([[3,3],[3,6]]));const wall=m.scene.walls.find(w=>w.independent);assert.equal(m.structure({type:'opening.add',opening:{id:'window',hostWallId:wall.id,kind:'window',tile:'window'}}).ok,true);m.commit();m.begin('Move');assert.equal(m.structure({type:'walls.move',ids:[wall.id],dx:1,dy:0}).ok,true);m.commit();assert.equal(m.scene.openings[0].hostWallId,wall.id);assert.equal(m.scene.walls.find(w=>w.id===wall.id).x,4);
 m.begin('Erase');m.erase(4,3,0,{all:true});m.commit();assert.equal(m.scene.openings.length,0);m.undo();assert.equal(m.scene.openings[0].id,'window');
});
test('unsupported paths and edits through locked rooms reject; room boundaries use room tools',()=>{
 const m=setup(),before=m.export();assert.equal(m.structure(draw([[15,15],[17,15]])).ok,false);assert.deepEqual(m.export(),before);
 assert.equal(m.structure({type:'walls.remove',ids:[m.scene.walls[0].id]}).ok,false);
 m.begin('Lock');m.structure({type:'entities.lock',ids:['room'],locked:true});m.commit();const locked=m.export();assert.equal(m.structure(draw([[3,3],[3,6]])).ok,false);assert.deepEqual(m.export(),locked);
});

test('ground terrain supports exterior walls but upper terrain and rugs do not substitute for a slab',()=>{
 for(const [z,tile,ok]of [[0,'blends_natural_01_16',true],[1,'blends_natural_01_16',false],[0,'rug',false]]){const m=new StructuredWorkshopModel({version:1,squares:[{x:3,y:3,z,tiles:[tile]}],items:[]},[0,0,20,20],{...props,rug:{FloorOverlay:'',solidfloor:''}});m.begin('Ground wall');assert.equal(m.structure({...draw([[3,3],[4,3]]),levelId:'level:'+z}).ok,ok);if(ok){assert.equal(m.commit(),true);assert.equal(m.scene.walls.length,1);}else m.cancel();}
});

 test('erasing a two-axis corner follows the visible top wall and then the remaining wall',()=>{
 const m=setup();m.begin('Corner');assert.equal(m.structure(draw([[3,5],[3,3],[5,3]])).ok,true);m.commit();const corner=m.scene.walls.filter(w=>w.independent&&w.x===3&&w.y===3);assert.equal(corner.length,2);const top=m.square(3,3,0).tiles.at(-1),topId=corner.find(w=>w.tile===top).id;
 m.begin('Erase top');m.erase(3,3,0);assert.equal(m.commit(),true);assert.equal(m.scene.walls.some(w=>w.id===topId),false);assert.equal(m.scene.walls.filter(w=>w.independent&&w.x===3&&w.y===3).length,1);
 m.begin('Erase remaining');m.erase(3,3,0);assert.equal(m.commit(),true);assert.equal(m.scene.walls.filter(w=>w.independent&&w.x===3&&w.y===3).length,0);m.undo();m.undo();assert.equal(m.scene.walls.filter(w=>w.independent&&w.x===3&&w.y===3).length,2);
});

test('moving a wall run preserves its opening and rejects occupied destinations atomically',()=>{
 const m=setup();m.begin('Partitions');m.structure(draw([[3,3],[3,6]],'a'));m.structure(draw([[5,3],[5,6]],'b'));const ids=m.scene.walls.filter(w=>w.id.startsWith('a:')).map(w=>w.id);m.structure({type:'opening.add',opening:{id:'pane',hostWallId:ids[1],kind:'window',tile:'window'}});m.commit();
 const original=m.export();m.begin('Collision');assert.equal(m.structure({type:'walls.move',ids,dx:2,dy:0}).ok,false);m.cancel();assert.deepEqual(m.export(),original);
 m.begin('Move run');assert.equal(m.structure({type:'walls.move',ids,dx:1,dy:0}).ok,true);assert.equal(m.commit(),true);assert.equal(m.scene.openings[0].hostWallId,ids[1]);assert.ok(m.square(4,4,0).tiles.includes('window'));assert.ok(!m.square(3,4,0).tiles.includes('window'));
 const reopened=new StructuredWorkshopModel(m.export(),m.bounds,props);assert.deepEqual(reopened.export(),m.export());m.undo();assert.deepEqual(m.export(),original);
});

test('changing wall finish preserves the window; missing matching frames reject instead of deleting it',()=>{
 const m=setup();Object.assign(m.properties,{finish_0:{WallW:''},finish_8:{WindowW:'',WallW:'',wall:''},plain:{WallW:''}});m.begin('Wall');m.structure(draw([[3,3],[3,5]]));const wall=m.scene.walls.find(w=>w.independent);m.structure({type:'opening.add',opening:{id:'pane',hostWallId:wall.id,kind:'window',tile:'window'}});m.commit();
 m.begin('Finish');assert.equal(m.place({parts:[{dx:0,dy:0,tile:'finish_0'}]},3,3,0).ok,true);m.commit();assert.equal(m.scene.openings[0].id,'pane');assert.ok(m.square(3,3,0).tiles.includes('finish_8'));assert.ok(m.square(3,3,0).tiles.includes('window'));
 const before=m.export();assert.equal(m.place({parts:[{dx:0,dy:0,tile:'plain'}]},3,3,0).ok,false);assert.deepEqual(m.export(),before);
});

test('independent diagonal paths compile, preserve reversal and remain editable',()=>{
 for(const points of [[[3,3],[6,6]],[[6,3],[3,6]]]){
  const edges=wallPathEdges(points),reverse=wallPathEdges([...points].reverse());assert.deepEqual(edges,reverse.reverse());
  const m=setup(),before=m.export();m.begin('Diagonal');let result=m.structure(draw(points,'diagonal'));assert.equal(result.ok,true,result.reason);m.commit();
  assert.equal(m.plan.polygonGeometry.walls.length,3);const ids=m.scene.walls.filter(w=>w.independent).map(w=>w.id);
  assert.equal(m.structure({type:'walls.move',ids,dx:1,dy:0}).ok,true);
  assert.deepEqual(new StructuredWorkshopModel(m.export(),m.bounds,props).export(),m.export());
  m.undo();assert.deepEqual(m.export(),before);
 }
 const m=setup(),before=m.export();assert.equal(m.structure(draw([[15,15],[17,17]])).ok,false);assert.deepEqual(m.export(),before);
});

test('independent diagonal wall blocks crossing without blocking movement along its side',async()=>{
 const {World}=await import('../src/world.js');const m=setup();m.begin('Diagonal');assert.equal(m.structure(draw([[3,3],[6,6]])).ok,true);assert.equal(m.commit(),true);
 const world=new World({playableBounds:m.bounds,cells:[]},props);world.setHousePlan(m.export());
 assert.equal(world.canStep(4.2,4.8,4.8,4.2,0),false);
 assert.equal(world.canStep(3.2,4.8,3.4,4.8,0),true);
});
