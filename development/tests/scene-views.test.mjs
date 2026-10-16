import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {WorkshopCommands} from '../src/workshop-commands.js';
const model=()=>new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],{});
const view={id:'entrance',name:'Entrance',z:0,center:{x:5.25,y:6.5},zoom:1.25,cutaway:true,ghost:false,grid:false,wholeBuilding:false,referenceId:null,viewport:{width:1000,height:700}};
test('saved views use atomic shared commands, persist and support update/remove/undo',()=>{
 const m=model(),commands=new WorkshopCommands(m,new Map());let n=0;const commit=operations=>commands.commit({requestId:String(++n),baseRevision:m.revision,operations});
 assert.equal(commit([{type:'view.save',view}]).ok,true);assert.deepEqual(m.scene.views,[view]);
 const reopened=new StructuredWorkshopModel(JSON.parse(JSON.stringify(m.export())),m.bounds,{});assert.deepEqual(reopened.scene.views,[view]);
 assert.equal(commit([{type:'view.save',view:{...view,zoom:2}}]).ok,true);assert.equal(m.scene.views.length,1);assert.equal(m.scene.views[0].zoom,2);m.undo();assert.equal(m.scene.views[0].zoom,1.25);
 assert.equal(commit([{type:'view.remove',id:view.id}]).ok,true);assert.equal(m.scene.views.length,0);m.undo();assert.deepEqual(m.scene.views,[view]);
});
test('invalid saved camera state rejects without earlier batch edits leaking',()=>{
 for(const patch of [{name:''},{zoom:Infinity},{zoom:0},{z:50},{center:{x:NaN,y:0}},{grid:'false'},{viewport:{width:0,height:700}}]){
  const m=model(),before=m.export(),commands=new WorkshopCommands(m,new Map());const r=commands.commit({requestId:'bad',baseRevision:m.revision,operations:[{type:'rename',name:'Must not save'},{type:'view.save',view:{...view,...patch}}]});assert.equal(r.ok,false);assert.deepEqual(m.export(),before);
 }
});
