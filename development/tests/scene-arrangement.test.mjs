import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {WorkshopCommands} from '../src/workshop-commands.js';
const props={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},table:{IsTable:'',Surface:'32',solid:''},mug:{TianMount:'table'},shelf:{solid:'',container:'shelves'}};
const entry=tile=>({id:'tile:'+tile,parts:[{dx:0,dy:0,tile}]});
function setup(){const catalog=['table','mug','shelf'].map(entry),m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,12,12],props,catalog);m.begin('Setup');m.structure({type:'room.add',room:{id:'r',name:'Room',levelId:'level:0',z:0,rect:[1,1,10,10],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});m.place(entry('shelf'),3,3,0);m.place(entry('shelf'),4,3,0);m.place({itemType:'Base.WaterBottle',storeInContainer:true},3,3,0);m.place({itemType:'Base.Apple',storeInContainer:true},4,3,0);m.commit();return {m,commands:new WorkshopCommands(m,new Map(catalog.map(e=>[e.id,e])))}};
const request=(m,transforms)=>({requestId:'arrange',baseRevision:m.revision,operations:[{type:'objects.arrange',transforms}]});
test('swap occupied shelves atomically, stock follows its own container once, undo/reload preserve identity',()=>{
 const {m,commands}=setup(),[a,b]=m.scene.objects,before=m.export();const r=request(m,[{ids:[a.id],dx:1,dy:0},{ids:[b.id],dx:-1,dy:0}]);
 assert.equal(commands.preview(r).ok,true);assert.deepEqual(m.export(),before);
 assert.equal(commands.commit(r).ok,true);assert.deepEqual(m.scene.objects.map(o=>o.x),[4,3]);assert.deepEqual(m.plan.items.map(i=>i.x),[4,3]);
 const after=m.export();m.undo();assert.deepEqual(m.export(),before);m.redo();assert.deepEqual(m.export(),after);
 const loaded=new StructuredWorkshopModel(after,m.bounds,props,m.catalog);assert.deepEqual(loaded.scene.objects,after.sceneDocument.objects);assert.deepEqual(loaded.plan.items,after.items);
});
test('mounted children follow support and cannot be transformed twice',()=>{
 const {m,commands}=setup();m.begin('Table');m.place(entry('table'),6,3,0);m.place(entry('mug'),6,3,0);m.commit();const [a,,table,mug]=m.scene.objects;
 const before=m.export();assert.equal(commands.preview(request(m,[{ids:[table.id],dx:1},{ids:[mug.id],dx:1}])).ok,false);assert.deepEqual(m.export(),before);
 assert.equal(commands.commit(request(m,[{ids:[table.id],dx:-3},{ids:[a.id],dx:3}])).ok,true);assert.equal(m.scene.objects.find(o=>o.id===mug.id).x,3);assert.equal(m.scene.objects.find(o=>o.id===mug.id).hostId,table.id);
});
test('invalid final overlap, unsupported destination and unavailable rotation leave history and scene unchanged',()=>{
 const {m,commands}=setup(),[a,b]=m.scene.objects,before=m.export(),history=m.undoStack.length;
 for(const transforms of [[{ids:[a.id],dx:1}],[{ids:[a.id],dx:10}],[{ids:[a.id],turns:1}],[{ids:[a.id],dx:1},{ids:[b.id],dx:0}]]){assert.equal(commands.commit(request(m,transforms)).ok,false);assert.deepEqual(m.export(),before);assert.equal(m.undoStack.length,history);}
});
