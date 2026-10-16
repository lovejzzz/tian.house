import test from 'node:test';import assert from 'node:assert/strict';
import {RoofRuntime,validateRoofFloorIntersections} from '../src/roof-runtime.js';
import {profiledRoofGeometry} from '../src/profiled-roof-geometry.js';
import {World} from '../src/world.js';import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
const roof={id:'roof',vertices:[[2,2],[10,2],[10,5],[6,5],[6,10],[2,10]],profile:{axis:'X',knots:[[2,1.4],[6,2.7],[10,2.1]]},baseElevation:1},geometry=[{id:'roof',...profiledRoofGeometry(roof)}];
test('actual roof surfaces shelter below unequal eaves but not above, outside or in courtyard',()=>{
 const runtime=new RoofRuntime(geometry);
 assert.equal(runtime.shelters(3,3,1),true);assert.equal(runtime.shelters(3,3,2),false);assert.equal(runtime.shelters(3,9,2),true);assert.equal(runtime.shelters(8,8,0),false);assert.equal(runtime.shelters(1,3,0),false);
 for(const [x,y]of [[3,6],[6,3],[5.5,5.5]]){assert.ok(runtime.heights(x,y).length);assert.equal(runtime.shelters(x,y,4),false);}
});
test('world rain queries use surface height with no synthetic upper floor; removing roof clears shelter',()=>{
 const world=new World({playableBounds:[0,0,20,20]},{ground:{solidfloor:''}}),plan={version:1,squares:[{x:3,y:3,z:0,room:-1,tiles:['ground']},{x:8,y:8,z:0,room:-1,tiles:['ground']}],items:[],roofGeometry:geometry};
 world.setHousePlan(plan);assert.equal(world.hasRoof(3.5,3.5,0),true);assert.equal(world.isExterior(3.5,3.5,0),false);assert.equal(world.hasRoof(8.5,8.5,0),false);assert.equal(world.isExterior(8.5,8.5,0),true);
 assert.equal(world.hasRoof(3.5,3.5,3),false);world.setHousePlan({...plan,roofGeometry:[]});assert.equal(world.hasRoof(3.5,3.5,0),false);
});
test('floor intersection clips partial cells exactly, accepting touching triangles without shared area',()=>{
 const roofGeometry=[{id:'diagonal',slopes:[{vertices:[[0,0,1],[1,0,1],[0,1,1]]}],closures:[]}],squares=[{x:0,y:0,z:1,tiles:['floor']}],properties={floor:{solidfloor:''}};
 assert.throws(()=>validateRoofFloorIntersections({roofGeometry,squares},properties),/intersects/);
 const polygonGeometry={floors:[{x:0,y:0,z:1,tile:'floor',polygons:[[[1,1],[0,1],[1,0]]]}]};assert.doesNotThrow(()=>validateRoofFloorIntersections({roofGeometry,squares,polygonGeometry},properties));
 polygonGeometry.floors[0].polygons=[[[0,0],[1,0],[0,1]]];assert.throws(()=>validateRoofFloorIntersections({roofGeometry,squares,polygonGeometry},properties),/intersects/);
});
test('room insertion and roof profile edits reject an intersecting slab atomically in either edit order',()=>{
 const properties={floor:{solidfloor:''},n:{WallN:''},w:{WallW:''},cover:{solidfloor:''}},room=(id,z,rect)=>({type:'room.add',room:{id,name:id,levelId:'level:'+z,z,rect,floorTile:'floor',wallN:'n',wallW:'w'}});
 const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],properties);assert.equal(m.structure(room('ground',0,[2,2,12,12])).ok,true);
 const v={...roof,levelId:'level:0',elevationUnit:'storeys',surfaceTile:'cover',closureTile:'n'};assert.equal(m.structure({type:'roofVolume.add',roof:v}).ok,true);const before=m.export();
 assert.equal(m.structure(room('upper',2,[3,3,5,6])).ok,false);assert.deepEqual(m.export(),before);
 assert.equal(m.structure({type:'roofVolume.remove',id:'roof'}).ok,true);assert.equal(m.structure(room('upper',2,[3,3,5,6])).ok,true);const occupied=m.export();assert.equal(m.structure({type:'roofVolume.add',roof:v}).ok,false);assert.deepEqual(m.export(),occupied);
 assert.equal(m.structure({type:'roofVolume.add',roof:{...v,baseElevation:3,profile:{axis:'X',knots:[[2,3.2],[10,3.8]]}}}).ok,true);const high=m.export();assert.equal(m.structure({type:'roofVolume.update',id:'roof',patch:{baseElevation:1,profile:v.profile}}).ok,false);assert.deepEqual(m.export(),high);
});
