import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {windowOpening,windowSurrounds,paneAxis} from '../src/wall-joins.js';
import {WorkshopModel} from '../src/workshop-model.js';
const p=JSON.parse(fs.readFileSync(new URL('../private-assets/world/properties.json',import.meta.url))),atlas=JSON.parse(fs.readFileSync(new URL('../private-assets/atlas.json',import.meta.url)));
const entry=tile=>({parts:[{dx:0,dy:0,tile}]});
test('normal panes preserve the original wall material in both directions and saved undo history',()=>{
 for(const [axis,i,pane]of [['W',0,48],['N',1,50]])for(const [family,base]of [['walls_commercial_03',0],['walls_exterior_house_01',32]]){
 const wall=family+'_'+(base+i),frame=family+'_'+(base+i+8),tile='fixtures_windows_01_'+pane;
 assert.equal(windowOpening(wall,axis,p),frame);
 const m=new WorkshopModel({version:1,squares:[{x:2,y:2,z:0,tiles:[wall]}],items:[]},[0,0,6,6],p);
 m.begin('Window');assert.ok(m.place(entry(tile),2,2,0).ok);m.commit();assert.deepEqual(m.square(2,2,0).tiles,[frame,tile]);
 m.undo();assert.deepEqual(m.square(2,2,0).tiles,[wall]);m.redo();assert.deepEqual(m.export().squares[0].tiles,[frame,tile]);
 m.place(entry('fixtures_windows_01_'+(pane+4)),2,2,0);assert.deepEqual(m.square(2,2,0).tiles,[frame,'fixtures_windows_01_'+(pane+4)]);
 m.place(entry(wall),2,2,0);assert.deepEqual(m.square(2,2,0).tiles,[wall]);
 }
});
test('legacy adjacent panes derive surrounding walls without filling the window or crossing gaps',()=>{
 const squares=[{x:1,y:2,z:0,tiles:['walls_commercial_03_1']},{x:2,y:2,z:0,tiles:['fixtures_windows_01_50']},{x:3,y:2,z:0,tiles:['fixtures_windows_01_50']}];
 assert.deepEqual(windowSurrounds(squares,p,atlas).map(s=>s.tile),['walls_commercial_03_9','walls_commercial_03_9']);
 assert.equal(windowSurrounds([squares[0],squares[2]],p,atlas).length,0);
 assert.equal(windowSurrounds([{...squares[0],z:1},squares[1]],p,atlas).length,0);
 assert.equal(windowSurrounds([{...squares[1],tiles:['walls_commercial_03_9','fixtures_windows_01_50']}],p,atlas).length,0);
 assert.equal(paneAxis('walls_commercial_02_1',p),null);
});
test('unsupported source walls remain unchanged instead of disappearing',()=>{
 const props={...p,customwall:{WallN:''}},m=new WorkshopModel({version:1,squares:[{x:2,y:2,z:0,tiles:['customwall']}],items:[]},[0,0,6,6],props);
 assert.equal(m.place(entry('fixtures_windows_01_50'),2,2,0).ok,false);assert.deepEqual(m.square(2,2,0).tiles,['customwall']);
});
