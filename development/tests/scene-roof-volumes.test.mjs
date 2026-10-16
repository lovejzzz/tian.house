import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {WorkshopCommands} from '../src/workshop-commands.js';
const props={floor:{solidfloor:''},n:{WallN:''},w:{WallW:''},roof:{solidfloor:''}};
function setup(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props);assert.equal(m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,name:'Room',rect:[2,2,12,12],floorTile:'floor',wallN:'n',wallW:'w'}}).ok,true);return m;}
const volume={id:'volume',name:'Asymmetric roof',levelId:'level:0',elevationUnit:'storeys',vertices:[[2,2],[12,2],[12,6],[7,6],[7,12],[2,12]],profile:{axis:'X',knots:[[2,1.4],[7,2.5],[12,2.1]]},baseElevation:1,surfaceTile:'roof',closureTile:'n'};
test('public roof volume transactions preserve independent geometry through room split, save, undo and redo',()=>{
 const m=setup(),commands=new WorkshopCommands(m,new Map()),before=m.export();
 const request={requestId:'add-roof',baseRevision:m.revision,operations:[{type:'roofVolume.add',roof:volume}]};
 assert.equal(commands.preview(request).ok,true);assert.deepEqual(m.export(),before);assert.equal(commands.commit(request).ok,true);
 const built=m.export(),geometry=structuredClone(built.roofGeometry);assert.equal(geometry.length,1);assert.ok(geometry[0].closures.length>4);
 m.begin('Split occupied room');assert.equal(m.structure({type:'room.split',roomId:'r',axis:'x',coordinate:7,newRoomId:'second'}).ok,true);m.commit();assert.deepEqual(m.plan.roofGeometry,geometry);
 m.undo();assert.deepEqual(m.export(),built);m.undo();assert.deepEqual(m.export(),before);m.redo();assert.deepEqual(m.export(),built);
 const poisoned=structuredClone(built);poisoned.roofGeometry=[{id:'forged'}];const reopened=new StructuredWorkshopModel(poisoned,m.bounds,props);assert.deepEqual(reopened.export(),built);
});
test('profile edits and removal recompile and roll back atomically; locks protect independent volumes',()=>{
 const m=setup();assert.equal(m.structure({type:'roofVolume.add',roof:volume}).ok,true);const before=m.export();
 m.begin('Change profile');assert.equal(m.structure({type:'roofVolume.update',id:'volume',patch:{profile:{axis:'Y',knots:[[2,1.2],[8,2.7],[12,1.8]]}}}).ok,true);m.commit();assert.notDeepEqual(m.plan.roofGeometry,before.roofGeometry);m.undo();assert.deepEqual(m.export(),before);
 assert.equal(m.structure({type:'entities.lock',ids:['volume'],locked:true}).ok,true);const locked=m.export();assert.equal(m.structure({type:'roofVolume.remove',id:'volume'}).ok,false);assert.equal(m.structure({type:'roofVolume.update',id:'volume',patch:{name:'changed'}}).ok,false);assert.deepEqual(m.export(),locked);
 assert.equal(m.structure({type:'entities.lock',ids:['volume'],locked:false}).ok,true);m.begin('Remove');assert.equal(m.structure({type:'roofVolume.remove',id:'volume'}).ok,true);m.commit();assert.equal(m.plan.roofGeometry,undefined);m.undo();assert.deepEqual(m.plan.roofGeometry,before.roofGeometry);
});
test('invalid roof volume identities, bounds, unit and material reject without modifying the scene',()=>{
 const m=setup(),before=m.export();
 for(const roof of [{...volume,id:'r'},{...volume,elevationUnit:'metres'},{...volume,levelId:'missing'},{...volume,vertices:[[0,0],[20,0],[20,2],[0,2]]},{...volume,baseElevation:3},{...volume,profile:{axis:'X',knots:[[2,2],[12,99]]}},{...volume,surfaceTile:'n'},{...volume,closureTile:'floor'}]){
 const result=m.structure({type:'roofVolume.add',roof});assert.equal(result.ok,false,JSON.stringify(roof));assert.deepEqual(m.export(),before);
 }
});

test('interior roof finish survives public edit/save/reopen and undo; invalid finishes roll back',()=>{
 const m=setup();assert.equal(m.structure({type:'roofVolume.add',roof:volume}).ok,true);const before=m.export();
 m.begin('Line ceiling');assert.equal(m.structure({type:'roofVolume.update',id:volume.id,patch:{interiorTile:'w'}}).ok,true);m.commit();
 const saved=m.export();assert.equal(m.scene.roofVolumes[0].interiorTile,'w');
 assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,props).export(),saved);
 m.undo();assert.deepEqual(m.export(),before);m.redo();assert.deepEqual(m.export(),saved);
 for(const interiorTile of ['floor','missing',42,'']){assert.equal(m.structure({type:'roofVolume.update',id:volume.id,patch:{interiorTile}}).ok,false);assert.deepEqual(m.export(),saved);}
 assert.equal(m.structure({type:'roofVolume.update',id:volume.id,patch:{interiorTile:null}}).ok,true);
});
