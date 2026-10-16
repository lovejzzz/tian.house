import test from 'node:test';import assert from 'node:assert/strict';
import {migrateHousePlan} from '../src/scene-document.js';
import {addRectangularRoom,compileStructuralScene,validateStructure} from '../src/scene-structure.js';
const properties={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},wall_8:{WindowW:'',WallW:'',wall:''},wall_9:{WindowN:'',WallN:'',wall:''},wall_10:{DoorWallW:''},wall_11:{DoorWallN:''},door:{doorW:''},window:{windowN:''}};
const blank=()=>{const s=migrateHousePlan({version:1,squares:[],items:[]},[0,0,20,20]);s.levels.push({id:'ground',index:0,height:null,elevation:null});return s;};
const room=(id,rect)=>({id,name:id,rect,levelId:'ground',floorTile:'floor',wallN:'wall_1',wallW:'wall_0'});
test('adjacent rooms share stable walls and compile each shared edge only once',()=>{
 const one=addRectangularRoom(blank(),room('a',[2,2,6,6])),two=addRectangularRoom(one,room('b',[6,2,10,6]));
 assert.equal(one.walls.length,16);assert.equal(two.walls.length,28);
 const shared=two.rooms[0].wallIds.filter(id=>two.rooms[1].wallIds.includes(id));assert.equal(shared.length,4);
 two.openings.push({id:'door',hostWallId:shared[1],kind:'door',tile:'door'});
 const plan=compileStructuralScene(two,properties),cell=plan.squares.find(s=>s.x===6&&s.y===3);
 assert.deepEqual(cell.tiles,['floor','wall_10','door']);assert.equal(two.walls.find(w=>w.id===shared[1]).tile,'wall_0');
 assert.equal(one.rooms.length,1);assert.equal(one.openings.length,0);
});
test('missing frames and incorrect opening directions fail without destroying source walls',()=>{
 const scene=addRectangularRoom(blank(),room('a',[2,2,6,6])),wall=scene.walls.find(w=>w.axis==='N');scene.openings.push({id:'o',hostWallId:wall.id,kind:'window',tile:'window'});
 const p=compileStructuralScene(scene,properties);assert.ok(p.squares.some(s=>s.tiles.includes('wall_9')&&s.tiles.includes('window')));
 const missing={...properties};delete missing.wall_9;assert.throws(()=>compileStructuralScene(scene,missing),/matching opening/);
 scene.openings[0].tile='door';assert.throws(()=>compileStructuralScene(scene,properties),/match its wall/);assert.equal(wall.tile,'wall_1');
});
test('overlap, duplicate edges, missing boundary and overlapping openings are rejected',()=>{
 const scene=addRectangularRoom(blank(),room('a',[2,2,6,6]));assert.throws(()=>addRectangularRoom(scene,room('b',[3,3,7,7])),/overlap/);
 for(const mutate of [s=>s.walls.push({...s.walls[0],id:'dup'}),s=>s.rooms[0].wallIds.pop(),s=>s.openings.push({id:'o',hostWallId:'missing',kind:'door',tile:'door'})]){const copy=structuredClone(scene);mutate(copy);assert.throws(()=>validateStructure(copy));}
});
test('compiled shared door preserves gameplay collision on both sides',async()=>{
 const {World}=await import('../src/world.js');
 const one=addRectangularRoom(blank(),room('a',[2,2,6,6])),scene=addRectangularRoom(one,room('b',[6,2,10,6]));
 const wall=scene.walls.find(w=>w.axis==='W'&&w.x===6&&w.y===3);scene.openings.push({id:'door',hostWallId:wall.id,kind:'door',tile:'door'});
 const world=new World({playableBounds:[0,0,20,20]},properties);world.setHousePlan(compileStructuralScene(scene,properties));
 assert.equal(world.canStep(5.5,3.5,6.5,3.5),false);assert.equal(world.canStep(6.5,3.5,5.5,3.5),false);
 world.changes['6,3,0:door']={open:true};
 assert.equal(world.canStep(5.5,3.5,6.5,3.5),true);assert.equal(world.canStep(6.5,3.5,5.5,3.5),true);
 assert.equal(world.canStep(5.5,4.5,6.5,4.5),false);
});
