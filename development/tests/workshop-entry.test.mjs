import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';import {WorkshopCommands} from '../src/workshop-commands.js';
const props={floor:{solidfloor:''},obstacle:{solid:''},rug:{FloorOverlay:''}};
function setup(){return new StructuredWorkshopModel({version:1,squares:[{x:2,y:2,z:0,tiles:['floor']},{x:3,y:2,z:0,tiles:['floor','obstacle']}],items:[]},[0,0,10,10],props);}
test('entry UI/model and public command share positions, failure, undo and saved reconstruction',()=>{
 const m=setup(),c=new WorkshopCommands(m,new Map());m.begin('Entry');assert.equal(m.setEntry(2,2,0).ok,true);m.commit();const manual=m.export();m.undo();
 assert.equal(c.commit({requestId:'entry',baseRevision:m.revision,operations:[{type:'entry.set',x:2,y:2,z:0}]}).ok,true);
 assert.deepEqual(m.plan.spawn,manual.spawn);const saved=m.export();assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,props).export(),saved);
 assert.equal(c.commit({requestId:'blocked',baseRevision:m.revision,operations:[{type:'entry.set',x:3,y:2,z:0}]}).ok,false);assert.deepEqual(m.export(),saved);
 for(const [x,y,z]of [[9,9,0],[2,2,1],[2.5,2,0],[-1,2,0]])assert.equal(m.setEntry(x,y,z).ok,false);
});
test('entry changes remain in scene metadata after later structural operations',()=>{
 const m=setup();m.structure({type:'scene.rename',name:'Entry test'});const c=new WorkshopCommands(m,new Map());assert.equal(c.commit({requestId:'scene-entry',baseRevision:m.revision,operations:[{type:'entry.set',x:2,y:2,z:0},{type:'scene.rename',name:'Same batch rename'}]}).ok,true);
 m.structure({type:'scene.rename',name:'Renamed'});assert.deepEqual(m.plan.spawn,{x:2.5,y:2.5,z:0});assert.deepEqual(m.scene.legacy.metadata.spawn,m.plan.spawn);
});
