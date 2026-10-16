import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
const props={blends_ground:{solidfloor:''},floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},wall_10:{DoorWallW:''},wall_11:{DoorWallN:''},door:{doorW:''},chair:{solid:''},shelf:{container:'shelves'}};
const bounds=[0,0,20,20];
function setup(){const squares=[];for(let x=0;x<20;x++)for(let y=0;y<20;y++)squares.push({x,y,z:0,room:-1,tiles:['blends_ground']});return new StructuredWorkshopModel({version:1,squares,items:[],vehicles:[]},bounds,props);}
const room=(id,rect)=>({type:'room.add',room:{id,name:id,rect,z:0,levelId:'level:0',floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});
const place=tile=>({parts:[{dx:0,dy:0,tile}]});
test('canvas model roundtrip preserves structured rooms alongside placed furniture and inventory',()=>{
 const m=setup();m.begin('Rooms');assert.equal(m.structure(room('a',[2,2,6,6])).ok,true);assert.equal(m.structure(room('b',[6,2,10,6])).ok,true);assert.equal(m.commit(),true);
 m.begin('Furnish');m.place(place('chair'),3,3,0);m.place(place('shelf'),4,3,0);m.place({itemType:'Base.WaterBottle',storeInContainer:true},4,3,0);assert.equal(m.commit(),true);
 const saved=m.export(),reopened=new StructuredWorkshopModel(JSON.parse(JSON.stringify(saved)),bounds,props);assert.equal(reopened.scene.rooms.length,2);assert.ok(reopened.square(3,3,0).tiles.includes('chair'));assert.equal(reopened.plan.items[0].storageTile,'shelf');
 m.begin('Door');assert.equal(m.place(place('door'),6,3,0).ok,true);assert.equal(m.commit(),true);const id=m.scene.openings[0].id;
 m.begin('Resize');assert.equal(m.structure({type:'room.resize',roomId:'a',side:'east',coordinate:7}).ok,true);assert.equal(m.commit(),true);assert.equal(m.scene.openings[0].id,id);assert.ok(m.square(7,3,0).tiles.includes('door'));assert.ok(m.square(3,3,0).tiles.includes('chair'));
 m.undo();assert.ok(m.square(6,3,0).tiles.includes('door'));m.redo();assert.ok(m.square(7,3,0).tiles.includes('door'));
});
test('unsupported destructive edit rolls back and new house undo restores structured identity',()=>{
 const m=setup();m.begin('Room');m.structure(room('a',[2,2,6,6]));m.commit();const before=m.export();m.begin('Erase');m.erase(2,3,0,{all:true});assert.equal(m.commit(),false);assert.deepEqual(m.export(),before);assert.match(m.lastError,/Edit rooms/);
 m.blank('New');assert.equal(m.scene,undefined);m.undo();assert.deepEqual(m.export(),before);
});
test('legacy-only houses retain original model behavior',()=>{
 const m=setup();m.begin('Chair');m.place(place('chair'),3,3,0);m.commit();assert.equal(m.scene,undefined);m.undo();assert.deepEqual(m.square(3,3,0).tiles,['blends_ground']);
});
test('adding a basement floor retains structured rooms and creates an explicit level',()=>{
 const m=setup();m.begin('Room');m.structure(room('a',[2,2,6,6]));m.commit();m.begin('Basement floor');m.place(place('floor'),3,3,-1);assert.equal(m.commit(),true);assert.ok(m.scene.levels.some(l=>l.index===-1));assert.ok(m.square(3,3,-1).tiles.includes('floor'));
});
test('replacing a hosted door preserves its opening identity',()=>{
 const m=setup();m.begin('Room');m.structure(room('a',[2,2,6,6]));m.commit();m.begin('Door');m.place(place('door'),2,3,0);m.commit();const id=m.scene.openings[0].id;
 m.begin('Same door');m.place(place('door'),2,3,0);m.commit();assert.equal(m.scene.openings[0].id,id);
});
test('blank plot clears derived polygon walls and stair geometry, while undo restores the old house',()=>{
 const m=setup(),op=room('chamfer',[2,2,8,8]);
 m.begin('Chamfer');assert.equal(m.structure(op).ok,true);assert.equal(m.structure({type:'room.chamfer',roomId:'chamfer',corner:'SE',distance:2}).ok,true);assert.equal(m.commit(),true);
 assert.ok(m.plan.polygonGeometry.walls.some(w=>w.axis.startsWith('D')));
 // Derived data can also arrive from a legacy exported plan without a scene document.
 const derived=m.export();delete derived.sceneDocument;derived.returnStairs=[{id:'old-derived-link'}];
 const legacy=new StructuredWorkshopModel(derived,bounds,props),before=legacy.export();
 for(const model of [m,legacy]){const old=model.export();model.blank('Empty');assert.equal(model.plan.polygonGeometry,undefined);assert.equal(model.plan.returnStairs,undefined);assert.equal(model.scene,undefined);assert.ok(model.plan.squares.every(s=>s.tiles.length===1&&s.tiles[0]==='blends_natural_01_16'));const blank=model.export();assert.equal(model.undo(),true);assert.deepEqual(model.export(),old);assert.equal(model.redo(),true);assert.deepEqual(model.export(),blank);}
 assert.ok(before.polygonGeometry);
});
