import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {WorkshopCommands} from '../src/workshop-commands.js';
const props={floor:{solidfloor:''},wood:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},window:{WindowW:''},table:{IsTable:'',Surface:'32',solid:''},mug:{TianMount:'table'}};
const entry=tile=>({id:'tile:'+tile,parts:[{dx:0,dy:0,tile}]});
function setup(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props);m.begin('Room');m.structure({type:'room.add',room:{id:'room',name:'Protected room',levelId:'level:0',z:0,rect:[1,1,10,10],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});m.place(entry('table'),3,3,0);m.place(entry('mug'),3,3,0);m.commit();return m;}
const lock=(m,ids,locked=true)=>{m.begin('Lock');assert.equal(m.structure({type:'entities.lock',ids,locked}).ok,true);assert.equal(m.commit(),true);};
test('room lock rejects structural changes through commands and direct placement; ordinary furniture remains editable',()=>{
 const m=setup();lock(m,['room']);const before=m.export(),wall=m.scene.walls.find(w=>w.axis==='W');
 for(const op of [{type:'room.floor',roomId:'room',tile:'wood'},{type:'room.resize',roomId:'room',side:'east',coordinate:11},{type:'opening.add',opening:{id:'win',hostWallId:wall.id,kind:'window',tile:'window'}}]){const r=m.structure(op);assert.equal(r.ok,false);assert.match(r.reason,/Locked/);assert.deepEqual(m.export(),before);}
 const result=m.place(entry('window'),wall.x,wall.y,0);assert.equal(result.ok,false);assert.match(result.reason,/Locked/);assert.deepEqual(m.export(),before);
 assert.equal(m.structure({type:'objects.move',ids:[m.scene.objects[0].id],dx:1,dy:0}).ok,true);
});
test('locked host or mounted item protects family; unlock and undo roundtrip are explicit',()=>{
 const m=setup(),[table,mug]=m.scene.objects;lock(m,[mug.id]);const before=m.export();
 for(const op of [{type:'objects.move',ids:[table.id],dx:1,dy:0},{type:'objects.remove',ids:[table.id]}]){assert.equal(m.structure(op).ok,false);assert.deepEqual(m.export(),before);}
 const reopened=new StructuredWorkshopModel(JSON.parse(JSON.stringify(before)),m.bounds,props);assert.equal(reopened.scene.objects[1].locked,true);
 lock(m,[mug.id],false);assert.equal(m.scene.objects[1].locked,undefined);m.undo();assert.equal(m.scene.objects[1].locked,true);m.redo();assert.equal(m.scene.objects[1].locked,undefined);
 lock(m,[table.id]);assert.equal(m.place(entry('mug'),3,3,0).ok,false);
});
test('a batch touching locked content is atomic including preceding rename',()=>{
 const m=setup();lock(m,['room']);const before=m.export(),commands=new WorkshopCommands(m,new Map());const result=commands.commit({requestId:'blocked',baseRevision:m.revision,operations:[{type:'rename',name:'Should not persist'},{type:'room.floor',roomId:'room',tile:'wood'}]});assert.equal(result.ok,false);assert.match(result.error,/Locked/);assert.deepEqual(m.export(),before);
});
