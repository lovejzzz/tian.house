import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorkshopScene} from '../src/workshop-scene-queries.js';
const setup=()=>({revision:9,bounds:[0,0,20,20],plan:{},scene:{id:'house',levels:[{id:'g',index:0},{id:'u',index:1}],rooms:[{id:'room',levelId:'g',rect:[2,2,8,8],wallIds:['north','south']}],walls:[{id:'north',levelId:'g',axis:'N',x:2,y:2},{id:'south',levelId:'g',axis:'N',x:2,y:8}],openings:[{id:'window',hostWallId:'south'}],objects:[{id:'table',levelId:'g',x:3,y:3,parts:[{dx:0,dy:0},{dx:1,dy:0}]},{id:'cup',hostId:'table',levelId:'g',x:4,y:3,parts:[{dx:0,dy:0}]},{id:'remote',levelId:'u',x:12,y:12}],verticalLinks:[{id:'stairs',fromLevelId:'g',toLevelId:'u',axis:'N',x:3,y:4}],legacy:{squares:[{id:'tile',value:{x:3,y:3,z:0}},{id:'upper-tile',value:{x:3,y:3,z:1}}],items:[],vehicles:[]}}});
test('scoped reads retain full room boundaries, openings, host families and stair endpoint levels',()=>{
 const model=setup(),before=structuredClone(model),result=readWorkshopScene(model,{level:0,bounds:[3,3,4,4]});
 assert.equal(result.partial,true);assert.deepEqual(result.scene.walls.map(e=>e.id),['north','south']);assert.equal(result.scene.openings[0].id,'window');assert.deepEqual(result.scene.objects.map(e=>e.id),['table','cup']);assert.equal(result.scene.verticalLinks.length,1);assert.equal(result.scene.levels.length,2);assert.equal(result.scene.legacy.squares.length,1);assert.ok(result.dependencyIds.includes('cup'));
 result.scene.objects[0].x=99;assert.deepEqual(model,before);
 const child=readWorkshopScene(model,{level:0,bounds:[4,3,5,4]});assert.equal(child.scene.objects.length,2);
});
test('whole reads include legacy records; empty regions do not invent entities; invalid filters reject',()=>{
 const model=setup();assert.equal(readWorkshopScene(model).partial,false);assert.equal(readWorkshopScene(model).scene.legacy.squares.length,2);
 const empty=readWorkshopScene(model,{level:1,bounds:[18,18,19,19]});assert.equal(empty.scene.rooms.length,0);assert.equal(empty.scene.objects.length,0);
 for(const query of [null,[],{floor:0},{level:2},{level:0.5},{bounds:[3,3,2,2]},{bounds:[0,0,NaN,2]}])assert.throws(()=>readWorkshopScene(model,query));
 const legacy={revision:0,bounds:[0,0,10,10],plan:{squares:[{x:2,y:2,z:0,tiles:['floor']}],items:[]}};assert.equal(readWorkshopScene(legacy,{level:0}).scene.legacy.squares.length,1);
});

test('scoped wall reads include attached fixtures and every wall supporting a wide fixture',()=>{
 const model=setup();model.scene.rooms=[];model.scene.objects=[{id:'drapes',levelId:'g',x:2,y:2,parts:[{dx:0,dy:0},{dx:0,dy:6}],wallMounts:[{part:0,wallId:'north'},{part:1,wallId:'south',openingId:'window'}]}];const result=readWorkshopScene(model,{level:0,bounds:[2,2,3,3]});assert.deepEqual(result.scene.walls.map(w=>w.id),['north','south']);assert.equal(result.scene.objects[0].id,'drapes');assert.equal(result.scene.openings[0].id,'window');assert.ok(result.dependencyIds.includes('south'));
});

test('full and scoped reads include freestanding roofs, physical dimensions and roof reference bindings',()=>{
 const model=setup(),s=model.scene;
 s.physicalDimensions={storeyHeight:3,wallHeight:2.8,wallThickness:.2,slabThickness:.2,evidence:'approximate'};
 s.roofVolumes=[{id:'roof-g',levelId:'g',vertices:[[2,2],[8,2],[8,8],[2,8]],profile:{axis:'X',knots:[[2,1],[8,1.1]]}}, {id:'roof-u',levelId:'u',vertices:[[12,12],[15,12],[15,15],[12,15]]}];
 s.references=[{id:'photo',annotations:[{entityId:'roof-g',text:'Visible eave'}]}];
 const whole=readWorkshopScene(model);assert.equal(whole.scene.roofVolumes.length,2);assert.deepEqual(whole.scene.physicalDimensions,s.physicalDimensions);
 const local=readWorkshopScene(model,{level:0,bounds:[3,3,4,4]});assert.deepEqual(local.scene.roofVolumes.map(r=>r.id),['roof-g']);assert.equal(local.scene.references[0].annotations[0].bindingStatus,'linked');
 assert.equal(readWorkshopScene(model,{bounds:[17,17,18,18]}).scene.roofVolumes.length,0);
 whole.scene.roofVolumes[0].vertices[0][0]=99;assert.equal(s.roofVolumes[0].vertices[0][0],2);
 whole.scene.physicalDimensions.wallHeight=99;assert.equal(s.physicalDimensions.wallHeight,2.8);
});
