import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {doorSurrounds,doorOpening} from '../src/wall-joins.js';
import {category} from '../src/workshop-categories.js';
import {correctSourceProperties} from '../src/source-corrections.js';
import {WorkshopModel} from '../src/workshop-model.js';
const p=JSON.parse(fs.readFileSync(new URL('../private-assets/world/properties.json',import.meta.url))),atlas=JSON.parse(fs.readFileSync(new URL('../private-assets/atlas.json',import.meta.url)));
test('both source door orientations gain exact material surrounds; explicit frames never duplicate',()=>{
 for(const [axis,i]of [['W',0],['N',1]])for(const [family,offset]of [['walls_commercial_03',0],['walls_exterior_house_01',32]]){
 const wall=family+'_'+(offset+i),door='fixtures_doors_01_'+i,frame=family+'_'+(offset+i+10),sq={x:2,y:2,z:-1,tiles:[door]},neighbor={x:2+(axis==='N'?1:0),y:2+(axis==='W'?1:0),z:-1,tiles:[wall]};
 assert.equal(doorOpening(wall,axis,p),frame);assert.equal(doorSurrounds([sq,neighbor],p,atlas)[0].tile,frame);
 assert.equal(doorSurrounds([{...sq,tiles:[door,frame]},neighbor],p,atlas).length,0);
 assert.equal(doorSurrounds([sq,{...neighbor,z:0}],p,atlas).length,0);
 assert.ok(!('Wall'+axis in p[frame]));
 }
});
test('placing a door in a wall retains its opening material through undo/redo and wall replacement',()=>{
 const model=new WorkshopModel({version:1,name:'Test',squares:[{x:2,y:2,z:0,tiles:['walls_exterior_house_01_33']}],items:[],vehicles:[]},[0,0,6,6],p);
 const entry=t=>({parts:[{dx:0,dy:0,tile:t}]});
 model.begin('Door');model.place(entry('fixtures_doors_01_1'),2,2,0);model.commit();
 assert.deepEqual(model.square(2,2,0).tiles,['walls_exterior_house_01_43','fixtures_doors_01_1']);
 model.undo();assert.deepEqual(model.square(2,2,0).tiles,['walls_exterior_house_01_33']);model.redo();
 model.place(entry('walls_commercial_03_1'),2,2,0);assert.deepEqual(model.square(2,2,0).tiles,['walls_commercial_03_1']);
});
test('all imported named toilets, doors, windows, pianos and roofs have semantic categories',()=>{
 for(const [tile,prop]of Object.entries(p)){
 if(prop.CustomName==='Toilet')assert.equal(category(tile,prop),'Appliances',tile);
 if(/^(Door|Window|Fence gate)$/.test(prop.CustomName||''))assert.equal(category(tile,prop),'Doors & windows',tile);
 if(/Piano/.test(prop.CustomName||''))assert.equal(category(tile,prop),'Furniture',tile);
 if(/^roofs_/.test(tile))assert.equal(category(tile,prop),'Walls & roofs',tile);
 }
});
test('verified wooden toilet corrections remove door behavior without changing bathroom stall doors',()=>{
 const props=structuredClone(p);correctSourceProperties(props);
 for(const id of ['fixtures_bathroom_02_26','fixtures_bathroom_02_27']){assert.equal(props[id].CustomName,'Toilet');assert.ok(!('doorW'in props[id]));assert.ok(!('doorFrN'in props[id]));}
 assert.deepEqual(props.fixtures_doors_01_0,p.fixtures_doors_01_0);
});
test('purpose takes priority over mixed sprite sheets and generic moveable flags',()=>{
 for(const [tile,prop,wanted]of [
 ['recreational_01_45',{CustomName:'Grand Piano',IsMoveAble:''},'Furniture'],
 ['appliances_com_01_30',{CustomName:'Sign',IsMoveAble:''},'Decoration & tiles'],
 ['fixtures_bathroom_01_30',{CustomName:'Cabinet',IsMoveAble:''},'Furniture'],
 ['lighting_indoor_01_0',{CustomName:'Wall Lamp',IsMoveAble:''},'Decoration & tiles'],
 ['roofs_01_0',{solidfloor:''},'Walls & roofs'],
 ['tian_detail_tea',{TianMount:'table',IsMoveAble:''},'Decoration & tiles'],
 ['tian_curtain_N',{TianMount:'window',IsMoveAble:''},'Doors & windows'],
 ['tian_air_unit',{IsMoveAble:''},'Appliances']])assert.equal(category(tile,prop),wanted,tile);
});
