import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
const props={floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},wall_8:{WindowW:'',WallW:'',wall:''},wall_9:{WindowN:'',WallN:'',wall:''},pane:{windowN:''},curtain:{TianMount:'window',attachedN:''},light:{TianMount:'wall',attachedN:''}};
const entry=(tile,wide=false)=>({id:tile,parts:[{dx:0,dy:0,tile},...(wide?[{dx:1,dy:0,tile}]:[])]});
function setup(){const squares=[];for(let x=0;x<10;x++)for(let y=0;y<10;y++)squares.push({x,y,z:0,tiles:['floor']});const m=new StructuredWorkshopModel({version:1,squares,items:[]},[0,0,10,10],props);m.begin('Wall');m.structure({type:'walls.draw',pathId:'wall',levelId:'level:0',points:[[3,3],[6,3]],wallN:'wall_1',wallW:'wall_0'});for(const id of ['wall:0','wall:1'])assert.equal(m.structure({type:'opening.add',opening:{id:'pane:'+id,hostWallId:id,kind:'window',tile:'pane'}}).ok,true);m.commit();return m;}
test('window coverings and wall lights bind to their exact supports and follow wall movement',()=>{
 const m=setup();m.begin('Furnish');assert.equal(m.place(entry('curtain'),3,3,0).ok,true);assert.equal(m.place(entry('light'),5,3,0).ok,true);m.commit();const ids=m.scene.objects.map(o=>o.id);assert.equal(m.scene.objects[0].wallMounts[0].openingId,'pane:wall:0');
 m.begin('Move');assert.equal(m.structure({type:'walls.move',ids:['wall:0','wall:1','wall:2'],dx:0,dy:2}).ok,true);m.commit();assert.deepEqual(m.scene.objects.map(o=>o.y),[5,5]);assert.deepEqual(m.scene.objects.map(o=>o.id),ids);assert.ok(m.square(3,5,0).tiles.includes('curtain'));assert.ok(!m.square(3,3,0).tiles.includes('curtain'));assert.deepEqual(new StructuredWorkshopModel(m.export(),m.bounds,props).export(),m.export());
});
test('removing host removes fixtures atomically; locked coverings stop host edits',()=>{
 const m=setup();m.begin('Drapes');m.place(entry('curtain'),3,3,0);m.commit();const id=m.scene.objects[0].id;m.begin('Lock');m.structure({type:'entities.lock',ids:[id],locked:true});m.commit();const before=m.export();assert.equal(m.structure({type:'opening.remove',id:'pane:wall:0'}).ok,false);assert.equal(m.structure({type:'walls.move',ids:['wall:0'],dx:0,dy:1}).ok,false);assert.deepEqual(m.export(),before);m.undo();
 m.begin('Remove window');assert.equal(m.structure({type:'opening.remove',id:'pane:wall:0'}).ok,true);m.commit();assert.equal(m.scene.objects.length,0);m.undo();assert.equal(m.scene.objects[0].id,id);
});
test('wide fixture rejects partial host movement and freestanding object transforms',()=>{
 const m=setup();m.begin('Wide drapes');assert.equal(m.place(entry('curtain',true),3,3,0).ok,true);m.commit();const id=m.scene.objects[0].id,before=m.export();assert.match(m.structure({type:'walls.move',ids:['wall:0'],dx:0,dy:1}).reason,/all walls/);assert.equal(m.structure({type:'objects.move',ids:[id],dx:1,dy:0}).ok,false);assert.equal(m.structure({type:'objects.copy',ids:[id],dx:1,dy:0,copyId:'copy'}).ok,false);assert.deepEqual(m.export(),before);
});
test('unsupported fixtures reject and legacy walls keep their existing placement path',()=>{
 const m=setup();assert.equal(m.place(entry('light'),3,3,0).ok,false);assert.equal(m.place(entry('curtain'),5,3,0).ok,false);assert.equal(m.place(entry('light'),8,8,0).ok,false);
 const old=new StructuredWorkshopModel({version:1,squares:[{x:2,y:2,z:0,tiles:['floor','wall_1']}],items:[]},[0,0,10,10],props);assert.equal(old.place(entry('light'),2,2,0).ok,true);
});

test('rehosting preserves fixture identity and uses only verified variants and valid supports',()=>{
 const m=setup();Object.assign(m.properties,{curtain:{...props.curtain,Facing:'N',TianVariantFamily:'linen'},curtainW:{TianMount:'window',attachedW:'',Facing:'W',TianVariantFamily:'linen'},paneW:{windowW:''}});
 m.catalog=[{...entry('curtain'),source:'curtain'},{...entry('curtainW'),source:'curtainW'},{...entry('light'),source:'light'}];m.begin('Fixtures');m.place(entry('curtain'),3,3,0);m.structure({type:'walls.draw',pathId:'west',levelId:'level:0',points:[[7,4],[7,6]],wallN:'wall_1',wallW:'wall_0'});m.structure({type:'opening.add',opening:{id:'west-pane',hostWallId:'west:0',kind:'window',tile:'paneW'}});m.commit();const before=m.export(),id=m.scene.objects[0].id;
 const moved={...m.catalog[1],moveObjectId:id};assert.equal(m.placement(moved,7,5,0).ok,false);assert.deepEqual(m.export(),before);m.begin('Rehang');assert.equal(m.place(moved,7,4,0).ok,true);m.commit();assert.equal(m.scene.objects.length,1);assert.equal(m.scene.objects[0].id,id);assert.equal(m.scene.objects[0].wallMounts[0].openingId,'west-pane');assert.equal(m.scene.objects[0].assetId,'curtainW');assert.ok(!m.square(3,3,0).tiles.includes('curtain'));m.undo();assert.deepEqual(m.export(),before);
 assert.equal(m.structure({type:'objects.rehost',id,assetId:'light',x:5,y:3,levelId:'level:0'}).ok,false);m.begin('Lock');m.structure({type:'entities.lock',ids:[id],locked:true});m.commit();assert.equal(m.place(moved,7,4,0).ok,false);
});
