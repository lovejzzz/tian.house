import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {WorkshopCommands} from '../src/workshop-commands.js';
import {referenceSceneEntities,referenceSceneEntity} from '../src/reference-scene-entities.js';
import {focusReferenceEntity} from '../src/workshop-reference-annotations.js';
import {readWorkshopScene} from '../src/workshop-scene-queries.js';
const props={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},window:{windowN:''},wall_9:{WindowN:'',WallN:'',wall:''}};
const photo={id:'photo',name:'Facade',group:'Exterior',source:'Test',evidence:'observed',notes:'',knownLength:null,width:1,height:1,image:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='};
function setup(){const model=new StructuredWorkshopModel({version:1,name:'Study',squares:[],items:[],vehicles:[]},[0,0,20,20],props),commands=new WorkshopCommands(model,new Map());let id=0;const commit=operations=>commands.commit({requestId:'r'+ ++id,baseRevision:model.revision,operations});assert.equal(commit([{type:'room.add',room:{id:'room',name:'Room',levelId:'g',z:0,rect:[2,2,8,8],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}},{type:'reference.add',reference:photo}]).ok,true);return {model,commit};}
const note=(id,entityId)=>({id,label:id,rect:[.1,.1,.5,.8],notes:'Observed',evidence:'observed',entityId});
test('photos bind to openings and walls by identity, follow moved boundaries, and retain unresolved evidence after deletion',()=>{
 const {model,commit}=setup(),wall=model.scene.walls.find(w=>w.axis==='N'&&w.x===3&&w.y===2);
 assert.equal(commit([{type:'opening.add',opening:{id:'window-a',hostWallId:wall.id,kind:'window',tile:'window'}},{type:'reference.annotate',id:'photo',annotation:note('window-note','window-a')},{type:'reference.annotate',id:'photo',annotation:note('wall-note',wall.id)}]).ok,true);
 assert.equal(referenceSceneEntity(model.scene,'window-a').rect[1],2);
 assert.equal(commit([{type:'room.resize',roomId:'room',side:'north',coordinate:1}]).ok,true);assert.equal(referenceSceneEntity(model.scene,'window-a').rect[1],1);
 const exported=model.export(),restored=new StructuredWorkshopModel(JSON.parse(JSON.stringify(exported)),model.bounds,props);assert.equal(referenceSceneEntity(restored.scene,'window-a').wall.id,wall.id);
 assert.equal(commit([{type:'opening.remove',id:'window-a'}]).ok,true);assert.equal(referenceSceneEntity(model.scene,'window-a'),undefined);
 const report=readWorkshopScene(model);assert.equal(report.scene.references[0].annotations[0].bindingStatus,'missing');
 assert.equal(commit([{type:'reference.annotate',id:'photo',annotation:{...note('window-note','window-a'),notes:'Temporarily removed'}}]).ok,true);assert.equal(model.scene.references[0].annotations[0].entityId,'window-a');assert.equal(commit([{type:'reference.annotate',id:'photo',annotation:note('new-missing','window-a')}]).ok,false);
 model.undo();model.undo();assert.ok(referenceSceneEntity(model.scene,'window-a'));
});
test('building component descriptors locate stairs at their source floor and roofs at their actual roof floor',()=>{
 const {model}=setup(),scene=structuredClone(model.scene);scene.levels.push({id:'u',index:1});scene.rooms[0].roof={id:'roof'};scene.rooms[0].floorOpenings=[{id:'hole',rect:[4,4,5,5]}];scene.verticalLinks=[{id:'stairs',fromLevelId:'g',toLevelId:'u',x:3,y:3,axis:'W'}];
 const descriptors=referenceSceneEntities(scene);assert.equal(descriptors.find(e=>e.id==='roof').z,1);assert.deepEqual(descriptors.find(e=>e.id==='stairs').rect,[3,3,6,4]);assert.equal(descriptors.find(e=>e.id==='hole').kind,'Floor opening');
 const w={model:{scene},setLevel(z){this.z=z;},setTool(t){this.tool=t;},status(t){this.message=t;},canvas:{focus(){}},refreshReferenceDock(){}};focusReferenceEntity(w,'roof');assert.equal(w.z,1);assert.equal(w.referenceFocusId,'roof');assert.deepEqual(w.center,{x:5,y:5});focusReferenceEntity(w,'stairs');assert.equal(w.z,0);assert.deepEqual(w.center,{x:4.5,y:3.5});
 const before=structuredClone(scene);w.model.pending={};focusReferenceEntity(w,'hole');assert.match(w.message,/Finish/);assert.equal(w.referenceFocusId,'stairs');assert.deepEqual(scene,before);
});
test('multiple photos can identify the same opening; scoped queries retain their evidence without raster payloads',()=>{
 const {model,commit}=setup(),wall=model.scene.walls.find(w=>w.axis==='N'&&w.x===3&&w.y===2);
 assert.equal(commit([{type:'opening.add',opening:{id:'window-a',kind:'window',hostWallId:wall.id,tile:'window'}},{type:'reference.add',reference:{...photo,id:'inside',name:'Interior'}},{type:'reference.annotate',id:'photo',annotation:note('outside-window','window-a')},{type:'reference.annotate',id:'inside',annotation:note('inside-window','window-a')}]).ok,true);
 const result=readWorkshopScene(model,{level:0,bounds:[3,2,4,3]});assert.equal(result.scene.references.length,2);assert.ok(result.scene.references.every(r=>!('image'in r)&&r.annotations[0].entityId==='window-a'&&r.annotations[0].bindingStatus==='linked'));result.scene.references[0].annotations[0].notes='changed';assert.equal(model.scene.references[0].annotations[0].notes,'Observed');
 assert.equal(readWorkshopScene(model,{level:0,bounds:[15,15,16,16]}).scene.references.length,0);
});
