import test from 'node:test';import assert from 'node:assert/strict';
import {managedRoofTiles,withoutRoofTiles} from '../src/workshop-roof-view.js';
import {captureWorkshopView,restoreWorkshopView} from '../src/workshop-saved-views.js';
const scene={levels:[{id:'g',index:0}],rooms:[{id:'r',levelId:'g',rect:[2,2,5,5],cells:[[2,2],[3,2],[4,2],[2,3],[2,4]],roof:{kind:'flat',tile:'floor'}}]};
test('roof visibility hides only owned flat roof cells and legacy roof sprites without changing scene or floors',()=>{
 const squares=[{x:2,y:2,z:1,tiles:['floor']},{x:2,y:2,z:0,tiles:['floor','desk']},{x:4,y:4,z:1,tiles:['floor']},{x:8,y:8,z:1,tiles:['roofs_30_08_0','walls_exterior_roofs_30_03_13','lamp']}],before=structuredClone(squares),mask=managedRoofTiles(scene),visible=withoutRoofTiles(squares,mask);
 assert.equal(mask.size,5);assert.deepEqual(visible.map(s=>s.tiles),[[],['floor','desk'],['floor'],['lamp']]);assert.deepEqual(squares,before);
});
test('saved views preserve roof visibility while older views default to visible',()=>{
 const w={z:0,center:{x:3,y:3},render:{zoom:1},canvas:{clientWidth:800,clientHeight:600,focus(){}},showRoofs:false,model:{scene:{references:[]}},setTool(){},setLevel(){},status(){}};
 const v=captureWorkshopView(w,{id:'view',name:'Interior'});assert.equal(v.showRoofs,false);w.showRoofs=true;assert.equal(restoreWorkshopView(w,v),true);assert.equal(w.showRoofs,false);delete v.showRoofs;restoreWorkshopView(w,v);assert.equal(w.showRoofs,true);
});
