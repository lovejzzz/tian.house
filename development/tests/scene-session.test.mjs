import test from 'node:test';import assert from 'node:assert/strict';
import {migrateHousePlan} from '../src/scene-document.js';
import {SceneSession} from '../src/scene-session.js';
const properties={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},wall_8:{WindowW:'',wall:''},wall_9:{WindowN:'',wall:''},wall_10:{DoorWallW:''},wall_11:{DoorWallN:''},door:{doorW:''}};
class Repository{
 data=new Map();fail=false;
 async load(id){return structuredClone(this.data.get(id));}
 async save(snapshot,revision){if(this.fail)throw Error('Storage full');const existing=this.data.get(snapshot.scene.id);if(revision===null?!!existing:existing?.scene.revision!==revision)throw Error('Scene changed');this.data.set(snapshot.scene.id,structuredClone(snapshot));}
}
const add=(id,rect)=>({type:'room.add',room:{id,name:id,rect,levelId:'ground',floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});
const request=(s,id,operations,action='commit')=>({sceneId:s.read().id,baseRevision:s.read().revision,requestId:id,operations,action});
async function setup(){const repository=new Repository(),scene=migrateHousePlan({version:1,squares:[],items:[]},[0,0,20,20]);scene.levels.push({id:'ground',index:0,height:null,elevation:null});const session=await SceneSession.create(scene,properties,repository);return {session,repository};}
test('preview, shared-wall resize, reload, undo and redo preserve door identity',async()=>{
 const {session:s,repository}=await setup();const r=request(s,'rooms',[add('a',[2,2,6,6]),add('b',[6,2,10,6])]);
 assert.equal(s.preview(r).ok,true);assert.equal(s.read().rooms.length,0);assert.equal((await s.execute(r)).ok,true);
 const wall=s.read().walls.find(w=>w.axis==='W'&&w.x===6&&w.y===3);
 assert.equal((await s.execute(request(s,'door',[{type:'opening.add',opening:{id:'door',hostWallId:wall.id,kind:'door',tile:'door'}}]))).ok,true);
 assert.equal((await s.execute(request(s,'resize',[{type:'room.resize',roomId:'a',side:'east',coordinate:7}]))).ok,true);
 const resized=s.read();assert.deepEqual(resized.rooms.map(r=>r.rect),[[2,2,7,6],[7,2,10,6]]);assert.equal(resized.walls.find(w=>w.id===wall.id).x,7);assert.equal(resized.openings[0].hostWallId,wall.id);
 assert.ok(s.compile().squares.find(c=>c.x===7&&c.y===3).tiles.includes('door'));
 const reopened=await SceneSession.open(resized.id,properties,repository);assert.deepEqual(reopened.read(),resized);
 assert.equal((await reopened.execute(request(reopened,'undo',undefined,'undo'))).ok,true);assert.equal(reopened.read().walls.find(w=>w.id===wall.id).x,6);
 assert.equal((await reopened.execute(request(reopened,'redo',undefined,'redo'))).ok,true);assert.equal(reopened.read().walls.find(w=>w.id===wall.id).x,7);assert.equal(reopened.read().revision,5);
});
test('invalid resize and later batch failures preserve the complete document',async()=>{
 const {session:s}=await setup();await s.execute(request(s,'rooms',[add('a',[2,2,6,6]),add('b',[6,2,10,6])]));const before=s.read();
 assert.equal((await s.execute(request(s,'collapse',[{type:'room.resize',roomId:'a',side:'east',coordinate:10}]))).ok,false);assert.deepEqual(s.read(),before);
 assert.equal((await s.execute(request(s,'batch',[{type:'scene.rename',name:'Do not save'},add('overlap',[3,3,5,5])]))).ok,false);assert.deepEqual(s.read(),before);
});
test('persistence failure and a stale second editor never overwrite saved state',async()=>{
 const {session:s,repository}=await setup(),second=await SceneSession.open(s.read().id,properties,repository),before=s.read();repository.fail=true;
 assert.equal((await s.execute(request(s,'quota',[add('a',[2,2,6,6])]))).ok,false);assert.deepEqual(s.read(),before);
 repository.fail=false;assert.equal((await s.execute(request(s,'valid',[add('a',[2,2,6,6])]))).ok,true);
 assert.equal((await second.execute(request(second,'stale',[add('b',[8,2,12,6])]))).ok,false);assert.deepEqual(second.read(),before);
 assert.deepEqual((await SceneSession.open(s.read().id,properties,repository)).read(),s.read());
});
test('successful request receipts survive reload and reject conflicting reuse',async()=>{
 const {session:s,repository}=await setup(),r=request(s,'once',[add('a',[2,2,6,6])]),receipt=await s.execute(r),reopened=await SceneSession.open(s.read().id,properties,repository);
 assert.deepEqual(await reopened.execute(r),receipt);assert.equal(reopened.read().revision,1);
 assert.equal((await reopened.execute({...r,operations:[add('b',[8,2,12,6])]})).ok,false);
});
test('shortening an outside wall rejects deletion of a hosted opening',async()=>{
 const {session:s}=await setup();await s.execute(request(s,'rooms',[add('a',[2,2,8,6])]));
 const wall=s.read().walls.find(w=>w.axis==='N'&&w.x===7&&w.y===2);
 // A north door asset is used only for this source-backed orientation case.
 properties.northDoor={doorN:''};
 await s.execute(request(s,'door',[{type:'opening.add',opening:{id:'door',hostWallId:wall.id,kind:'door',tile:'northDoor'}}]));const before=s.read();
 const result=await s.execute(request(s,'shrink',[{type:'room.resize',roomId:'a',side:'east',coordinate:6}]));
 assert.equal(result.ok,false);assert.match(result.error,/remove a door or window/);assert.deepEqual(s.read(),before);
});
test('reusing a freed wall location does not duplicate a moved wall identity',async()=>{
 const {session:s}=await setup();await s.execute(request(s,'rooms',[add('a',[2,2,6,6])]));
 assert.equal((await s.execute(request(s,'shrink',[{type:'room.resize',roomId:'a',side:'east',coordinate:5}]))).ok,true);
 const result=await s.execute(request(s,'new',[add('b',[6,2,10,6])]));assert.equal(result.ok,true);
 const walls=s.read().walls;assert.equal(new Set(walls.map(w=>w.id)).size,walls.length);
});
test('horizontal shared boundaries move with the same topology rules',async()=>{
 const {session:s}=await setup();await s.execute(request(s,'rooms',[add('a',[2,2,6,6]),add('b',[2,6,6,10])]));
 const r=await s.execute(request(s,'resize',[{type:'room.resize',roomId:'a',side:'south',coordinate:7}]));assert.equal(r.ok,true);
 assert.deepEqual(s.read().rooms.map(r=>r.rect),[[2,2,6,7],[2,7,6,10]]);
 const shared=s.read().rooms[0].wallIds.filter(id=>s.read().rooms[1].wallIds.includes(id));assert.equal(shared.length,4);
});
