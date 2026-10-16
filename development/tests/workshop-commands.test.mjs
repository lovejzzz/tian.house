import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkshopModel} from '../src/workshop-model.js';
import {WorkshopCommands} from '../src/workshop-commands.js';
const setup=()=>{const model=new WorkshopModel({version:1,name:'Original',squares:[],items:[],vehicles:[]},[0,0,10,10],{floor:{solidfloor:''},shelf:{container:'shelves'}});return {model,commands:new WorkshopCommands(model,new Map([['floor',{parts:[{dx:0,dy:0,tile:'floor'}]}],['water',{itemType:'Base.WaterBottle'}]]))};};
const request=(operations,baseRevision=0,requestId='a')=>({requestId,baseRevision,operations});
const floor={type:'place',assetId:'floor',x:2,y:2,z:0};
test('preview is isolated; commit is a single undoable transaction',()=>{
 const {model,commands}=setup(),r=request([floor,{type:'rename',name:'New house'}]);
 assert.equal(commands.preview(r).ok,true);assert.equal(model.plan.squares.length,0);assert.equal(model.revision,0);
 assert.equal(commands.commit(r).revision,1);assert.equal(model.plan.name,'New house');assert.equal(model.undoStack.length,1);
 model.undo();assert.equal(model.plan.name,'Original');assert.equal(model.plan.squares.length,0);
 model.redo();assert.equal(model.plan.squares.length,1);
});
test('a later failed placement rolls back the entire batch without history changes',()=>{
 const {model,commands}=setup();const before=model.export();
 assert.equal(commands.commit(request([floor,{type:'place',assetId:'water',x:2,y:2,z:0,storeInContainer:true}])).ok,false);
 assert.deepEqual(model.export(),before);assert.equal(model.revision,0);assert.equal(model.undoStack.length,0);
});
test('stale versions and active manual edits cannot be overwritten',()=>{
 const {model,commands}=setup();commands.commit(request([floor]));
 assert.equal(commands.commit(request([{type:'rename',name:'stale'}],0,'b')).ok,false);
 model.begin('User edit');assert.equal(commands.commit(request([{type:'rename',name:'busy'}],1,'c')).ok,false);model.cancel();
 assert.equal(model.plan.name,'Original');
});
test('retry is idempotent even after undo; request ID reuse with another body fails',()=>{
 const {model,commands}=setup(),r=request([floor]);const receipt=commands.commit(r);
 assert.deepEqual(commands.commit(r),receipt);assert.equal(model.undoStack.length,1);
 model.undo();assert.deepEqual(commands.commit(r),receipt);assert.equal(model.plan.squares.length,0);
 assert.equal(commands.commit({...r,operations:[{...floor,x:3}]}).ok,false);
});
test('caller cannot inject assets or malformed coordinates',()=>{
 const {model,commands}=setup();for(const op of [{...floor,assetId:'missing',parts:[{tile:'floor'}]},{...floor,x:2.5},{...floor,z:4},{...floor,rotation:1}])assert.equal(commands.commit(request([op])).ok,false);
 assert.equal(model.plan.squares.length,0);
});


import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
function structuredSetup(){const properties={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},chair:{solid:''}},model=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],properties),catalog=new Map([['chair',{id:'chair',parts:[{dx:0,dy:0,tile:'chair'}]}]]);return {model,commands:new WorkshopCommands(model,catalog)};}
const roomCommand={type:'room.add',room:{id:'room-a',name:'A',levelId:'level:0',z:0,rect:[2,2,8,8],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}};
test('versioned batches use the same structural and furnishing rules as the editor',()=>{
 const {model,commands}=structuredSetup(),r=request([roomCommand,{type:'place',assetId:'chair',x:3,y:3,z:0},{type:'rename',name:'From reference'}]);
 const preview=commands.preview(r);assert.equal(preview.ok,true);assert.equal(model.scene,undefined);assert.equal(preview.plan.sceneDocument.rooms.length,1);assert.equal(preview.plan.sceneDocument.objects.length,1);
 assert.equal(commands.commit(r).ok,true);assert.equal(model.scene.rooms[0].id,'room-a');assert.equal(model.scene.legacy.metadata.name,'From reference');assert.equal(model.undoStack.length,1);
 const built=model.export();model.undo();assert.equal(model.scene,undefined);model.redo();assert.deepEqual(model.export(),built);
 assert.equal(commands.commit(request([{type:'room.remove',roomId:'room-a'}],model.revision,'remove')).ok,false);assert.deepEqual(model.export(),built);
});
test('structural collision late in a command batch cannot leak earlier edits',()=>{
 const {model,commands}=structuredSetup(),before=model.export();const bad={...roomCommand,room:{...roomCommand.room,id:'overlap'}};
 assert.equal(commands.commit(request([roomCommand,bad])).ok,false);assert.deepEqual(model.export(),before);assert.equal(model.undoStack.length,0);
});
test('manual structural commits invalidate a previously previewed batch',()=>{
 const {model,commands}=structuredSetup();assert.equal(commands.commit(request([roomCommand])).ok,true);
 const r=request([{type:'room.resize',roomId:'room-a',side:'east',coordinate:9}],model.revision,'resize');assert.equal(commands.preview(r).ok,true);
 model.begin('User resized');assert.equal(model.structure({type:'room.resize',roomId:'room-a',side:'south',coordinate:9}).ok,true);model.commit();const before=model.export();
 assert.equal(commands.commit(r).ok,false);assert.deepEqual(model.export(),before);
});


import {editorSnapshot,restoreEditorSnapshot,validateEditorSnapshot} from '../src/workshop-draft.js';
test('request receipts survive serialization and undo without replaying deleted construction',()=>{
 const {model,commands}=structuredSetup(),r=request([roomCommand]),receipt=commands.commit(r);model.undo();
 const saved=JSON.parse(JSON.stringify(editorSnapshot(model)));validateEditorSnapshot(saved,model.bounds,model.properties);
 const restored=new StructuredWorkshopModel(saved.plan,model.bounds,model.properties);restoreEditorSnapshot(restored,saved);const again=new WorkshopCommands(restored,new Map());
 assert.equal(again.preview(r).replayed,true);assert.deepEqual(again.commit(r),receipt);assert.equal(restored.scene,undefined);assert.equal(restored.undoStack.length,0);assert.equal(restored.redoStack.length,1);
 assert.equal(again.commit({...r,operations:[{...roomCommand,room:{...roomCommand.room,name:'Changed'}}]}).ok,false);
});
test('command adapters share receipts and corrupt receipt snapshots reject',()=>{
 const {model,commands}=structuredSetup(),other=new WorkshopCommands(model,new Map()),r=request([roomCommand]),receipt=commands.commit(r);assert.deepEqual(other.commit(r),receipt);assert.equal(model.undoStack.length,1);
 const saved=editorSnapshot(model);for(const mutate of [s=>s.commandReceipts.push(s.commandReceipts[0]),s=>s.commandReceipts[0].result.revision=99,s=>s.commandReceipts[0].fingerprint='broken']){const bad=structuredClone(saved);mutate(bad);assert.throws(()=>validateEditorSnapshot(bad,model.bounds,model.properties),/receipt/);}
 const legacy=structuredClone(saved);delete legacy.commandReceipts;assert.doesNotThrow(()=>validateEditorSnapshot(legacy,model.bounds,model.properties));
});

test('persisted commit keeps live scene unchanged until storage succeeds and locks competing edits',async()=>{
 const {model,commands}=structuredSetup();let release,saved;
 const saving=commands.commitAndSave(request([roomCommand]),{save:snapshot=>{saved=snapshot;return new Promise(resolve=>release=resolve);}});
 assert.equal(model.writeLocked,true);assert.equal(model.scene,undefined);assert.equal(saved.plan.sceneDocument.rooms.length,1);assert.equal(saved.commandReceipts.length,1);
 assert.throws(()=>model.begin('Concurrent UI edit'),/being saved/);assert.throws(()=>model.structure(roomCommand),/being saved/);assert.throws(()=>model.undo(),/being saved/);
 assert.equal((await commands.commitAndSave(request([roomCommand]),{save:async()=>{}})).ok,false);
 release();assert.equal((await saving).ok,true);assert.equal(model.writeLocked,false);assert.equal(model.scene.rooms.length,1);assert.equal(model.undoStack.length,1);
});
test('storage failure preserves the entire live snapshot and permits retry through a healthy writer',async()=>{
 const {model,commands}=structuredSetup(),before=editorSnapshot(model),r=request([roomCommand]);
 const result=await commands.commitAndSave(r,{save:async()=>{throw Error('Storage full');}});assert.equal(result.ok,false);assert.equal(result.error,'Storage full');assert.deepEqual(editorSnapshot(model),before);assert.equal(model.writeLocked,false);
 assert.equal((await commands.commitAndSave(r,{save:async()=>{}})).ok,true);assert.equal(model.scene.rooms.length,1);
});
test('persisted command forks full history without recompiling or mutating retained checkpoints',async()=>{
 const {model,commands}=structuredSetup();assert.equal(commands.commit(request([roomCommand])).ok,true);
 for(let i=0;i<61;i++)assert.equal(commands.commit({requestId:'history-'+i,baseRevision:model.revision,operations:[{type:'rename',name:'House '+i}]}).ok,true);
 const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const v of Object.values(value))freeze(v);}};
 for(const e of model.undoStack)freeze(e);
 const before=editorSnapshot(model),oldEntries=model.undoStack.slice(),r={requestId:'forked',baseRevision:model.revision,operations:[{type:'rename',name:'After save'}]};
 assert.equal((await commands.commitAndSave(r,{save:async()=>{throw Error('Disk unavailable');}})).ok,false);
 assert.deepEqual(editorSnapshot(model),before);assert.equal(model.undoStack[10],oldEntries[10]);
 let captured;assert.equal((await commands.commitAndSave(r,{save:async snapshot=>{captured=snapshot;}})).ok,true);
 assert.equal(model.undoStack.length,60);assert.equal(model.undoStack[0],oldEntries[1]);assert.notEqual(captured.undoStack[0],oldEntries[1]);
 model.undo();assert.equal(model.plan.name,'House 60');model.redo();assert.equal(model.plan.name,'After save');
});

test('erased legacy floor overlay stays removed before subsequent structural operations',()=>{
 const properties={floor:{solidfloor:''},border:{FloorOverlay:'',TianMount:'floor',IsMoveAble:''},wall_0:{WallW:''},wall_1:{WallN:''}};
 const model=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],properties);
 const catalog=new Map([['border',{id:'border',parts:[{dx:0,dy:0,tile:'border'}]}]]),commands=new WorkshopCommands(model,catalog);
 assert.equal(commands.commit(request([roomCommand,{type:'place',assetId:'border',x:4,y:4,z:0}],0,'setup-overlay')).ok,true);
 assert.ok(model.square(4,4,0).tiles.includes('border'));const before=model.export();
 const edit=request([{type:'erase',x:4,y:4,z:0},{type:'walls.draw',pathId:'partition',levelId:'level:0',points:[[5,3],[5,5]],wallN:'wall_1',wallW:'wall_0'}],model.revision,'erase-then-wall');
 const preview=commands.preview(edit);assert.equal(preview.ok,true,preview.error);assert.ok(!preview.plan.squares.find(s=>s.x===4&&s.y===4&&s.z===0).tiles.includes('border'));
 assert.equal(commands.commit(edit).ok,true);assert.ok(!model.square(4,4,0).tiles.includes('border'));assert.ok(model.square(4,4,0).tiles.includes('floor'));
 const after=model.export();model.undo();assert.deepEqual(model.export(),before);model.redo();assert.deepEqual(model.export(),after);
 assert.deepEqual(new StructuredWorkshopModel(after,model.bounds,properties,[...catalog.values()]).export(),after);
});
