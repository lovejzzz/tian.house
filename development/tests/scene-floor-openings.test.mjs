import {World} from '../src/world.js';
import test from 'node:test';import assert from 'node:assert/strict';import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
const props={floor:{solidfloor:''},stone:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},chair:{solid:''}};
function setup(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props);m.structure({type:'room.add',room:{id:'r',name:'Atrium',levelId:'level:1',z:1,rect:[2,2,12,12],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});return m;}
const opening={type:'floorOpening.add',roomId:'r',opening:{id:'void',rect:[5,5,7,7]}};
test('floor opening is editable, persisted, refloored and reversible without filling the void',()=>{const m=setup(),before=m.export();m.begin('Opening');assert.equal(m.structure(opening).ok,true);m.commit();assert.deepEqual(m.square(5,5,1).tiles,[]);assert.equal(m.square(4,5,1).tiles[0],'floor');const reloaded=new StructuredWorkshopModel(m.export(),m.bounds,props);assert.equal(reloaded.scene.rooms[0].floorOpenings[0].id,'void');assert.equal(m.structure({type:'room.floor',roomId:'r',tile:'stone'}).ok,true);assert.deepEqual(m.square(5,5,1).tiles,[]);assert.equal(m.structure({type:'floorOpening.remove',roomId:'r',id:'void'}).ok,true);assert.equal(m.square(5,5,1).tiles[0],'stone');m.undo();assert.deepEqual(m.export(),before);});
test('openings reject occupied cells, outside bounds and overlap atomically',()=>{const m=setup();m.place({id:'chair',parts:[{dx:0,dy:0,tile:'chair'}]},5,5,1);const before=m.export();assert.equal(m.structure(opening).ok,false);assert.deepEqual(m.export(),before);const n=setup();for(const rect of [[1,5,7,7],[5,5,5,7]])assert.equal(n.structure({...opening,opening:{id:'bad',rect}}).ok,false);assert.equal(n.structure(opening).ok,true);const saved=n.export();assert.equal(n.structure({...opening,opening:{id:'other',rect:[6,6,8,8]}}).ok,false);assert.deepEqual(n.export(),saved);});
test('split, merge and floor copy preserve opening identities without silently filling holes',()=>{const m=setup();m.structure(opening);assert.equal(m.structure({type:'room.split',roomId:'r',axis:'x',coordinate:6,newRoomId:'bad'}).ok,false);assert.equal(m.structure({type:'room.split',roomId:'r',axis:'x',coordinate:8,newRoomId:'right'}).ok,true);assert.equal(m.scene.rooms[0].floorOpenings[0].id,'void');assert.equal(m.structure({type:'room.merge',roomId:'r',otherRoomId:'right'}).ok,true);assert.equal(m.scene.rooms[0].floorOpenings[0].id,'void');assert.equal(m.structure({type:'level.copyLayout',fromLevelId:'level:1',toIndex:2,copyId:'upper'}).ok,true);assert.equal(m.scene.rooms[1].floorOpenings[0].id,'upper:void');assert.deepEqual(m.square(5,5,2).tiles,[]);});

test('walkthrough blocks unsupported floor openings and furniture cannot be placed over them',()=>{const m=setup();m.structure(opening);const w=new World({playableBounds:m.bounds},props);w.setHousePlan(m.export());const actor={x:4.8,y:5.5,z:1};w.move(actor,.5,0);assert.ok(actor.x<5);const before=m.export();assert.equal(m.place({id:'chair',parts:[{dx:0,dy:0,tile:'chair'}]},5,5,1).ok,false);assert.deepEqual(m.export(),before);});

test('supported structural edges may guard a void without filling it; internal walls remain rejected',()=>{
 const m=setup();assert.equal(m.structure(opening).ok,true);const before=m.export();
 const draw=points=>({type:'walls.draw',pathId:'guard',levelId:'level:1',points,wallN:'wall_1',wallW:'wall_0'});
 m.begin('Guard atrium');const result=m.structure(draw([[5,7],[5,5],[7,5],[7,7],[5,7]]));
 assert.equal(result.ok,true,result.reason);assert.equal(m.commit(),true);
 assert.deepEqual(m.square(5,5,1).tiles.sort(),['wall_0','wall_1']);
 assert.ok(!m.square(6,6,1).tiles.includes('floor'));
 const reopened=new StructuredWorkshopModel(m.export(),m.bounds,props);assert.deepEqual(reopened.export(),m.export());
 const guarded=m.export();assert.equal(m.structure({...draw([[6,5],[6,7]]),pathId:'inside'}).ok,false);assert.deepEqual(m.export(),guarded);
 const world=new World({playableBounds:m.bounds},props);world.setHousePlan(m.export());
 assert.equal(world.canStep(4.8,5.5,5.2,5.5,1),false);
 m.undo();assert.deepEqual(m.export(),before);m.redo();assert.deepEqual(m.export(),guarded);
});
