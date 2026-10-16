import test from 'node:test';import assert from 'node:assert/strict';
import {bindInputLifecycle} from '../src/input-lifecycle.js';
import {panCamera,wheelMotion,zoomCamera} from '../src/workshop-camera.js';
import {wallJoins} from '../src/wall-joins.js';
import {Renderer} from '../src/render.js';
import {installOriginalAssets} from '../src/original-assets.js';
import {workshopCatalog,WorkshopModel} from '../src/workshop-model.js';
test('background suspension never modifies manual pause; duplicate blur/visibility recover',()=>{
 const win=new EventTarget(),doc=new EventTarget();doc.visibilityState='visible';let cleared=0;
 const life=bindInputLifecycle(win,doc,()=>cleared++);
 win.dispatchEvent(new Event('blur'));doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));assert.equal(life.suspended,true);
 win.dispatchEvent(new Event('focus'));assert.equal(life.suspended,true);
 doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));assert.equal(life.suspended,false);
 assert.equal(cleared,3);win.dispatchEvent(new Event('blur'));win.dispatchEvent(new Event('focus'));assert.equal(life.suspended,false);
});
test('trackpad scroll pans both axes; ctrl pinch zoom is separate; line/page units normalize',()=>{
 assert.deepEqual(wheelMotion({deltaX:12,deltaY:30,deltaMode:0,ctrlKey:false,metaKey:false}),{zoom:false,dx:12,dy:30});
 assert.equal(wheelMotion({deltaX:0,deltaY:3,deltaMode:1,ctrlKey:true}).dy,48);
 const center=panCamera({x:100,y:200},64,32,2);assert.deepEqual(center,{x:101,y:200});
 const r=Object.create(Renderer.prototype);Object.assign(r,{width:1000,height:700,zoom:1,camera:r.project(100,200,1)});
 const c={x:100,y:200},anchor=r.unscreen(320,480,1);zoomCamera(r,c,1,320,480,1.4);const after=r.unscreen(320,480,1);
 assert.ok(Math.abs(after.x-anchor.x)<1e-9);assert.ok(Math.abs(after.y-anchor.y)<1e-9);
 zoomCamera(r,c,1,320,480,100);assert.equal(r.zoom,2.8);
});
test('source SE cap closes two wall ends, disappears after erasing and never fills an opening',()=>{
 const properties={wall_0:{WallW:''},wall_1:{WallN:''},wall_2:{WallNW:'',CornerNorthWall:'wall_1',CornerWestWall:'wall_0'},wall_3:{WallSE:''}},atlas={regions:{wall_3:{}}};
 const squares=[{x:0,y:1,z:-1,tiles:['wall_1']},{x:1,y:0,z:-1,tiles:['wall_0']}];
 assert.deepEqual(wallJoins(squares,properties,atlas).map(({x,y,z,tile})=>({x,y,z,tile})),[{x:1,y:1,z:-1,tile:'wall_3'}]);
 assert.equal(wallJoins(squares.slice(0,1),properties,atlas).length,0);
 assert.equal(wallJoins([...squares,{x:1,y:1,z:-1,tiles:['wall_3']}],properties,atlas).length,0);
});
test('picture glazing is a complete two-tile prefab in both orientations and rotates by group',()=>{
 const properties={},atlas={regions:{}};installOriginalAssets(properties,atlas);
 const entries=workshopCatalog(properties,atlas,{items:[]}).entries.filter(e=>e.source.startsWith('tian_glazing'));
 assert.equal(entries.length,4);for(const axis of ['N','W']){const e=entries.find(e=>e.facing===axis&&e.parts.length===2);assert.ok(e.essential);assert.ok(e.parts.every(p=>'collide'+axis in properties[p.tile]&&'Window'+axis in properties[p.tile]));}
});
