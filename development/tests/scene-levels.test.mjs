import test from 'node:test';import assert from 'node:assert/strict';import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
const props={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},wall_10:{DoorWallW:''},wall_11:{DoorWallN:''},door:{doorN:''},chair:{solid:''}};
function setup(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props);for(const [id,rect]of [['a',[2,2,6,8]],['b',[6,2,10,8]]])assert.equal(m.structure({type:'room.add',room:{id,name:id,levelId:'level:0',z:0,rect,floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);const w=m.scene.walls.find(w=>w.axis==='N'&&w.x===3&&w.y===2);m.structure({type:'opening.add',opening:{id:'door',hostWallId:w.id,kind:'door',tile:'door'}});m.place({id:'chair',parts:[{dx:0,dy:0,tile:'chair'}]},3,4,0);return m;}
test('floor layout copies shared walls and hosted openings with independent identities and undo',()=>{const m=setup(),before=m.export();m.begin('Copy');assert.equal(m.structure({type:'level.copyLayout',fromLevelId:'level:0',toIndex:1,copyId:'up'}).ok,true);m.commit();assert.equal(m.scene.rooms.length,4);assert.equal(m.scene.walls.length,before.sceneDocument.walls.length*2);assert.equal(m.scene.openings[1].hostWallId,'up:'+m.scene.openings[0].hostWallId);assert.equal(m.scene.objects.length,1);assert.equal(m.scene.rooms[2].wallIds.filter(id=>m.scene.rooms[3].wallIds.includes(id)).length,6);assert.equal(m.square(3,4,1).tiles.includes('chair'),false);m.undo();assert.deepEqual(m.export(),before);m.redo();assert.equal(m.scene.rooms.length,4);});
test('copy rejects overlapping destination, invalid levels and duplicate identity atomically',()=>{const m=setup();assert.equal(m.structure({type:'level.copyLayout',fromLevelId:'level:0',toIndex:1,copyId:'up'}).ok,true);const before=m.export();for(const op of [{fromLevelId:'level:0',toIndex:1,copyId:'again'},{fromLevelId:'level:0',toIndex:2,copyId:'up'},{fromLevelId:'level:0',toIndex:99,copyId:'bad'},{fromLevelId:'missing',toIndex:2,copyId:'bad'},{fromLevelId:'level:0',toIndex:0,copyId:'bad'}]){assert.equal(m.structure({type:'level.copyLayout',...op}).ok,false);assert.deepEqual(m.export(),before);}});
test('add upper room raises roof atomically, reuses landing level, preserves footprint and undo',()=>{
 const m=setup();assert.equal(m.structure({type:'roof.set',roomId:'a',roof:{id:'roof-a',kind:'flat',tile:'floor'}}).ok,true);
 const level=m.scene.levels.find(l=>l.index===1).id,before=m.export();m.begin('Add upper room');
 assert.deepEqual(m.structure({type:'room.addAbove',roomId:'a',id:'upper'}),{ok:true});m.commit();
 const upper=m.scene.rooms.find(r=>r.id==='upper');assert.equal(upper.levelId,level);assert.deepEqual(upper.rect,[2,2,6,8]);assert.equal(upper.roof.id,'roof-a');assert.equal(m.scene.rooms[0].roof,undefined);
 assert(m.square(3,4,1).tiles.includes('floor'));assert(m.square(3,4,2).tiles.includes('floor'));assert.equal(m.scene.openings.length,1);assert.equal(m.scene.objects.length,1);
 assert.doesNotThrow(()=>new StructuredWorkshopModel(m.export(),m.bounds,props));m.undo();assert.deepEqual(m.export(),before);m.redo();assert.equal(m.scene.rooms.length,3);
 const current=m.export();assert.equal(m.structure({type:'room.addAbove',roomId:'a',id:'again'}).ok,false);assert.deepEqual(m.export(),current);
});
test('upper shell preserves chamfer geometry and refuses changes to locked source roofs',()=>{
 const m=setup();assert.equal(m.structure({type:'room.outline',roomId:'a',vertices:[[2,2],[6,2],[6,7],[5,8],[2,8]]}).ok,true);
 assert.equal(m.structure({type:'roof.set',roomId:'a',roof:{id:'r',kind:'flat',tile:'floor'}}).ok,true);
 const source=structuredClone(m.scene.rooms[0]);assert.equal(m.structure({type:'room.addAbove',roomId:'a',id:'upper'}).ok,true);
 assert.deepEqual(m.scene.rooms.find(r=>r.id==='upper').polygon,source.polygon);
 assert(m.plan.polygonGeometry.floors.some(f=>f.roomId==='upper'&&!f.full));
 const locked=setup();locked.structure({type:'roof.set',roomId:'a',roof:{id:'r',kind:'flat',tile:'floor'}});
 assert.equal(locked.structure({type:'entities.lock',ids:['a'],locked:true}).ok,true);
 const before=locked.export();assert.equal(locked.structure({type:'room.addAbove',roomId:'a',id:'upper'}).ok,false);assert.deepEqual(locked.export(),before);
});
