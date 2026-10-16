import test from 'node:test';
import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {WorkshopCommands} from '../src/workshop-commands.js';
import {editorSnapshot,restoreEditorSnapshot} from '../src/workshop-draft.js';
import {validateReferences,referenceMime} from '../src/scene-references.js';
const photo={id:'photo',name:'Room',group:'Living',source:'Photographer',evidence:'observed',notes:'Window visible; hidden hall unknown',knownLength:{metres:2,description:'Measured window width'},width:1,height:1,image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='};
const model=()=>new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],{});
test('reference import, metadata edit, undo and exported restoration share the command transaction',async()=>{
 const m=model(),commands=new WorkshopCommands(m,new Map());let saved;const persist={save:async s=>saved=s};
 assert.equal((await commands.commitAndSave({requestId:'a',baseRevision:0,operations:[{type:'reference.add',reference:photo}]},persist)).ok,true);
 assert.deepEqual(m.scene.references,[photo]);assert.equal(m.scene.units.metresPerCell,null);
 const restored=model();restoreEditorSnapshot(restored,JSON.parse(JSON.stringify(saved)));assert.deepEqual(restored.scene.references,[photo]);
 const imported=new StructuredWorkshopModel(JSON.parse(JSON.stringify(m.export())),m.bounds,{});assert.deepEqual(imported.scene.references,[photo]);
 assert.equal(commands.commit({requestId:'b',baseRevision:1,operations:[{type:'reference.update',id:'photo',patch:{evidence:'inferred',notes:'Proposed hidden hall'}}]}).ok,true);assert.equal(m.scene.references[0].evidence,'inferred');m.undo();assert.deepEqual(m.scene.references,[photo]);
 assert.equal(commands.commit({requestId:'c',baseRevision:m.revision,operations:[{type:'reference.remove',id:'photo'}]}).ok,true);assert.equal(m.scene.references.length,0);m.undo();assert.deepEqual(m.scene.references,[photo]);
});
test('invalid photos, unsafe formats and unsubstantiated measurements reject; persistence failure is atomic',async()=>{
 for(const patch of [{image:'https://example.org/photo.jpg'},{image:'data:image/svg+xml;base64,PHN2Zz4='},{image:'data:image/png;base64,YWJjZA=='},{width:0},{knownLength:{metres:2,description:''}},{evidence:'certain'}])assert.throws(()=>validateReferences([{...photo,...patch}]));
 const m=model(),commands=new WorkshopCommands(m,new Map()),before=editorSnapshot(m),r={requestId:'a',baseRevision:0,operations:[{type:'reference.add',reference:photo}]};
 assert.equal((await commands.commitAndSave(r,{save:async()=>{throw Error('Quota exceeded');}})).ok,false);assert.deepEqual(editorSnapshot(m),before);
 assert.equal(commands.commit({...r,operations:[...r.operations,...r.operations]}).ok,false);assert.deepEqual(editorSnapshot(m),before);
});

test('reference format follows raster bytes rather than misleading filename MIME',()=>{
 assert.equal(referenceMime(Uint8Array.from([255,216,255,224])),'image/jpeg');
 assert.equal(referenceMime(Uint8Array.from([137,80,78,71,13,10,26,10])),'image/png');
 assert.throws(()=>referenceMime(new TextEncoder().encode('<svg></svg>')));
});
test('annotation bindings use stable room IDs, survive deletion as unresolved evidence, and undo restores them',()=>{
 const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],{floor:{solidfloor:''},wallW:{WallW:''},wallN:{WallN:''}}),commands=new WorkshopCommands(m,new Map());
 const annotation={id:'note',rect:[.1,.2,.5,.8],label:'Living area',notes:'Visible shell',evidence:'observed',entityId:'room'};
 const first={requestId:'bind',baseRevision:0,operations:[{type:'room.add',room:{id:'room',levelId:'level:0',z:0,rect:[2,2,8,8],floorTile:'floor',wallW:'wallW',wallN:'wallN'}},{type:'reference.add',reference:photo},{type:'reference.annotate',id:'photo',annotation}]};
 assert.equal(commands.commit(first).ok,true);assert.deepEqual(m.scene.references[0].annotations,[annotation]);
 const before=m.export();assert.equal(commands.commit({requestId:'bad-binding',baseRevision:m.revision,operations:[{type:'reference.annotate',id:'photo',annotation:{...annotation,entityId:'missing'}}]}).ok,false);assert.deepEqual(m.export(),before);
 assert.equal(commands.commit({requestId:'remove-room',baseRevision:m.revision,operations:[{type:'room.remove',roomId:'room'}]}).ok,true);assert.equal(m.scene.rooms.length,0);assert.equal(m.scene.references[0].annotations[0].entityId,'room');m.undo();assert.equal(m.scene.rooms[0].id,'room');
 assert.equal(commands.commit({requestId:'edit-note',baseRevision:m.revision,operations:[{type:'reference.annotate',id:'photo',annotation:{...annotation,evidence:'inferred',notes:'Alternative layout'}}]}).ok,true);assert.equal(m.scene.references[0].annotations.length,1);assert.equal(m.scene.references[0].annotations[0].evidence,'inferred');m.undo();assert.deepEqual(m.scene.references[0].annotations,[annotation]);
 for(const rect of [[0,0,2,1],[.5,.5,.2,.2],[0,0,0,1],[0,0,NaN,1]])assert.throws(()=>validateReferences([{...photo,annotations:[{...annotation,rect}]}]));
});

test('working-copy provenance survives house export and rejects malformed source metadata',()=>{
 const importInfo={originalWidth:2000,originalHeight:1333,originalBytes:3300000,sha256:'a'.repeat(64),optimized:true};
 const m=model(),commands=new WorkshopCommands(m,new Map());
 assert.equal(commands.commit({requestId:'provenance',baseRevision:0,operations:[{type:'reference.add',reference:{...photo,importInfo}}]}).ok,true);
 const restored=new StructuredWorkshopModel(JSON.parse(JSON.stringify(m.export())),m.bounds,{});
 assert.deepEqual(restored.scene.references[0].importInfo,importInfo);
 for(const patch of [{sha256:'wrong'},{originalBytes:-1},{originalWidth:13000},{optimized:'true'}])assert.throws(()=>validateReferences([{...photo,importInfo:{...importInfo,...patch}}]));
});

test('cached image validation still rejects changed bytes and invalid metadata',()=>{
 validateReferences([photo]);validateReferences([structuredClone(photo)]);
 assert.throws(()=>validateReferences([{...photo,width:0}]));
 assert.throws(()=>validateReferences([{...photo,image:photo.image.slice(0,-2)+'!'}]));
 assert.throws(()=>validateReferences([{...photo,annotations:[{id:'bad'}]}]));
 assert.throws(()=>validateReferences([{...photo,importInfo:{sha256:'bad'}}]));
 assert.deepEqual(validateReferences([photo]),[photo]);
});
