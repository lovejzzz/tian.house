import test from 'node:test';import assert from 'node:assert/strict';
import {installArchitecturalAssets} from '../src/architectural-assets.js';
import {installMasonryAssets} from '../src/masonry-assets.js';
import {workshopCatalog} from '../src/workshop-model.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {PolygonRuntime} from '../src/polygon-runtime.js';
import {doorProfile} from '../src/window-profile.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
const props={floor:{solidfloor:''}},atlas={regions:{}};installArchitecturalAssets(props,atlas);installMasonryAssets(props,atlas);
const entries=workshopCatalog(props,atlas,{}).entries;
test('double glazed doors form a shared editable assembly with independent passage and opposite hinges',()=>{
 for(const axis of ['N','W']){
  const entry=entries.find(e=>e.source===`tian_double_steel_door_${axis}_0`);assert.equal(entry.parts.length,2);
  const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,15,15],props,entries);
  assert.equal(m.structure({type:'room.add',room:{id:'room',levelId:'level:0',z:0,rect:[3,3,10,10],floorTile:'floor',wallN:'tian_masonry_chalk_1',wallW:'tian_masonry_chalk_0'}}).ok,true);
  const x=axis==='N'?5:3,y=axis==='N'?3:5;
  assert.equal(m.placement(entry,x,y,0).ok,true);m.begin('Double door');assert.equal(m.place(entry,x,y,0).ok,true);m.commit();
  assert.equal(m.scene.openings.length,2);assert.equal(new Set(m.scene.openings.map(o=>o.assemblyId)).size,1);assert.ok(m.scene.openings[0].assemblyId);
  const walls=m.plan.polygonGeometry.walls.filter(w=>w.opening),open=new Set();assert.equal(walls.length,2);assert.equal(walls[1].opening.hinge,'end');
  const runtime=new PolygonRuntime(m.plan.polygonGeometry,w=>({open:open.has(w.opening?.id)}));
  const crossing=(offset)=>axis==='N'?[[x+offset,y-.5],[x+offset,y+.5]]:[[x-.5,y+offset],[x+.5,y+offset]];
  assert.equal(runtime.blocksMove(...crossing(.5),0),true);open.add(walls[0].opening.id);
  assert.equal(runtime.blocksMove(...crossing(.5),0),false);assert.equal(runtime.blocksMove(...crossing(1.5),0),true);
  open.add(walls[1].opening.id);assert.equal(runtime.blocksMove(...crossing(1),0),false,'no phantom centre jamb');
  const saved=m.export();assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,props,entries).export(),saved);
  m.undo();assert.equal(m.scene.openings.length,0);m.redo();assert.equal(m.scene.openings.length,2);
  assert.equal(m.structure({type:'opening.remove',id:m.scene.openings[0].id}).ok,true);assert.equal(m.scene.openings.length,0);
 }
});
test('door apertures must reach the floor and double doors cannot hang off a wall end',()=>{
 assert.throws(()=>doorProfile({TianDoorProfile:'[0,0,1,0.8]'}),/floor/);
 const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,15,15],props,entries);
 m.structure({type:'room.add',room:{id:'room',levelId:'level:0',z:0,rect:[3,3,10,10],floorTile:'floor',wallN:'tian_masonry_chalk_1',wallW:'tian_masonry_chalk_0'}});
 const entry=entries.find(e=>e.source==='tian_double_steel_door_N_0'),before=m.export();assert.equal(m.place(entry,9,3,0).ok,false);assert.deepEqual(m.export(),before);
});
