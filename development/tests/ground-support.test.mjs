import test from 'node:test';import assert from 'node:assert/strict';
import {validateGroundSupport} from '../src/ground-support.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
const p={flat:{solidfloor:''},raised:{solidfloor:'',TianGroundHeight:'6'},chair:{IsMoveAble:'',solidtrans:''},stairs:{TianReturnStair:'',solidfloor:''}};
const s=(x,t)=>({x,y:2,z:0,tiles:t}),plan=(squares)=>({version:1,squares,items:[],vehicles:[]});
test('multipart furniture and vehicles cannot straddle platform heights',()=>{
 const data=plan([s(2,['raised','chair']),s(3,['flat','chair'])]);
 const scene={levels:[{id:'g',index:0}],objects:[{levelId:'g',x:2,y:2,parts:[{dx:0,dy:0,tile:'chair'},{dx:1,dy:0,tile:'chair'}]}]};
 assert.throws(()=>validateGroundSupport(data,p,scene),/entire object/);
 data.squares[1].tiles[0]='raised';assert.doesNotThrow(()=>validateGroundSupport(data,p,scene));
 data.vehicles=[{x:3,y:2.5,z:0,footprint:[2,1],rotation:0}];data.squares[1].tiles[0]='flat';assert.throws(()=>validateGroundSupport(data,p),/entire object/);
});
test('raising under stairs fails atomically instead of changing existing ground',()=>{
 const m=new StructuredWorkshopModel(plan([s(2,['flat','stairs'])]),[0,0,10,10],p),before=m.export();
 const result=m.placeFloorBatch({parts:[{dx:0,dy:0,tile:'raised'}]},[{x:2,y:2,z:0}]);
 assert.equal(result.ok,false);assert.match(result.reason,/stair/);assert.deepEqual(m.export(),before);
});
test('furnishings require uniform support within a clipped source cell',()=>{
 const data=plan([s(2,['raised','chair'])]);data.polygonGeometry={floors:[{...data.squares[0],tile:'raised',full:false,polygons:[[[0,0],[1,0],[0,1]]]}]};
 assert.throws(()=>validateGroundSupport(data,p),/mixed-height/);data.squares[0].tiles.pop();assert.doesNotThrow(()=>validateGroundSupport(data,p));
});
test('legacy multipart hover and placement reject uneven support without mutation',()=>{
 const m=new StructuredWorkshopModel(plan([s(2,['raised']),s(3,['flat'])]),[0,0,10,10],p),before=m.export();
 const entry={id:'two-cell-chair',parts:[{dx:0,dy:0,tile:'chair'},{dx:1,dy:0,tile:'chair'}]};
 const preview=m.placement(entry,2,2,0);assert.equal(preview.ok,false);assert.match(preview.reason,/entire object/);
 assert.deepEqual(m.place(entry,2,2,0),preview);assert.deepEqual(m.export(),before);
 m.square(3,2,0).tiles=['raised'];assert.equal(m.placement(entry,2,2,0).ok,true);assert.equal(m.place(entry,2,2,0).ok,true);
});
test('vehicle preview uses the same rotated footprint as committed support',()=>{
 const m=new StructuredWorkshopModel(plan([s(2,['raised']),s(3,['flat'])]),[0,0,10,10],p),before=m.export();
 const entry={vehicle:{id:'car',extents:[1,1,2],scale:1},rotation:1};
 const preview=m.placement(entry,3,2.5,0);assert.equal(preview.ok,false);assert.match(preview.reason,/entire object/);
 assert.deepEqual(m.place(entry,3,2.5,0),preview);assert.deepEqual(m.export(),before);
 m.square(3,2,0).tiles=['raised'];assert.equal(m.placement(entry,3,2.5,0).ok,true);assert.equal(m.place(entry,3,2.5,0).ok,true);
 assert.deepEqual(m.plan.vehicles[0].footprint,[1,2]);
});
test('floor and stair hover reject destructive or elevated stair placements',()=>{
 const m=new StructuredWorkshopModel(plan([s(2,['flat','stairs']),s(3,['raised'])]),[0,0,10,10],p),before=m.export();
 for(const [entry,x] of [[{parts:[{dx:0,dy:0,tile:'flat'}]},2],[{parts:[{dx:0,dy:0,tile:'stairs'}]},3]]){
  const preview=m.placement(entry,x,2,0);assert.equal(preview.ok,false);assert.match(preview.reason,/stair/);assert.deepEqual(m.place(entry,x,2,0),preview);
 }assert.deepEqual(m.export(),before);
});
test('mixed-height furniture hover is read-only and agrees with placement',()=>{
 const data=plan([s(2,['raised'])]);data.polygonGeometry={floors:[{...data.squares[0],tile:'raised',full:false,polygons:[[[0,0],[1,0],[0,1]]]}]};
 const m=new StructuredWorkshopModel(data,[0,0,10,10],p),before=m.export(),entry={parts:[{dx:0,dy:0,tile:'chair'}]};
 const preview=m.placement(entry,2,2,0);assert.equal(preview.ok,false);assert.match(preview.reason,/mixed-height/);assert.deepEqual(m.place(entry,2,2,0),preview);assert.deepEqual(m.export(),before);
});
test('floor hover rejects raising only half a parked vehicle but a whole-area batch succeeds',()=>{
 const data=plan([s(2,['flat']),s(3,['flat'])]);data.vehicles=[{id:'car',x:3,y:2.5,z:0,footprint:[2,1],rotation:0}];
 const m=new StructuredWorkshopModel(data,[0,0,10,10],p),before=m.export(),entry={parts:[{dx:0,dy:0,tile:'raised'}]};
 const hover=m.placement(entry,2,2,0);assert.equal(hover.ok,false);assert.match(hover.reason,/entire object/);assert.deepEqual(m.export(),before);
 assert.deepEqual(m.place(entry,2,2,0),hover);assert.deepEqual(m.export(),before);
 const points=[{x:2,y:2,z:0},{x:3,y:2,z:0}];assert.equal(m.previewFloorSupport(entry,points).ok,true);assert.deepEqual(m.export(),before);
 assert.equal(m.placeFloorBatch(entry,points).ok,true);assert.equal(m.floorBatchActive,undefined);
 assert.deepEqual(m.plan.squares.map(s=>s.tiles),[['raised'],['raised']]);
 const lower={parts:[{dx:0,dy:0,tile:'flat'}]};assert.equal(m.placement(lower,2,2,0).ok,false);assert.equal(m.placeFloorBatch(lower,points).ok,true);
});
test('raised exterior ground requires sufficient clearance beneath doors',()=>{
 const props={...p,door:{doorN:''}},data=plan([{x:2,y:2,z:0,tiles:['flat','door']},{x:2,y:1,z:0,tiles:['raised']}]);
 assert.throws(()=>validateGroundSupport(data,props),/door threshold/);
 data.squares[0].tiles=['flat'];data.polygonGeometry={floors:[],walls:[{x:2,y:2,z:0,axis:'N',a:[2,2],b:[3,2],opening:{kind:'door',tile:'door',threshold:{height:6}}}]};
 assert.doesNotThrow(()=>validateGroundSupport(data,props));data.polygonGeometry.walls[0].opening.threshold.height=4;
 assert.throws(()=>validateGroundSupport(data,props),/door threshold/);
});
