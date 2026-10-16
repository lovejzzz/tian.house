import test from 'node:test';import assert from 'node:assert/strict';
import {WorkshopCommands} from '../src/workshop-commands.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';import {World} from '../src/world.js';
import {installOriginalAssets} from '../src/original-assets.js';import {resolveOrientedPlacement} from '../src/workshop-placement.js';
import {openingSpan} from '../src/diagonal-openings.js';import {drawGlazingPlane} from '../src/fixed-glazing.js';
const props={floor:{solidfloor:''},blends_natural_01_16:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''}};installOriginalAssets(props,{regions:{}});
const entry=(axis,width)=>({id:`glazing-${axis}-${width}`,parts:Array.from({length:width},(_,i)=>({dx:axis==='N'?i:0,dy:axis==='W'?i:0,tile:`tian_glazing_${axis}_${width}_${i}`}))});
function fixture(corner){const squares=[];for(let x=0;x<20;x++)for(let y=0;y<20;y++)squares.push({x,y,z:0,room:-1,tiles:['blends_natural_01_16']});const m=new StructuredWorkshopModel({version:1,squares,items:[]},[0,0,20,20],props);assert.equal(m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[5,5,13,12],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);if(corner)assert.equal(m.structure({type:'room.chamfer',roomId:'r',corner,distance:3}).ok,true);return m;}
test('fixed glazing fits editable N/W walls without an opaque source sill and erases as a whole assembly',()=>{
 for(const axis of ['N','W']){const m=fixture(),wall=m.scene.walls.find(w=>w.axis===axis&&w.x===(axis==='N'?6:5)&&w.y===(axis==='W'?6:5)),asset=entry(axis,2);m.begin('Picture');assert.equal(m.place(asset,wall.x,wall.y,0).ok,true);m.commit();assert.equal(m.scene.openings.length,2);assert.equal(new Set(m.scene.openings.map(o=>o.assemblyId)).size,1);assert.ok(!m.square(wall.x,wall.y,0).tiles.includes(wall.tile));const plan=m.export();m.begin('Remove');m.erase(wall.x,wall.y,0);m.commit();assert.equal(m.scene.openings.length,0);m.undo();assert.deepEqual(m.export(),plan);assert.deepEqual(new StructuredWorkshopModel(plan,m.bounds,props).export(),plan);}
});
test('all diagonal directions accept atomic continuous picture glazing, transmit sight but block walking, and expose no window action',()=>{
 for(const corner of ['NW','NE','SE','SW']){const m=fixture(corner),walls=m.scene.walls.filter(w=>w.axis.startsWith('D')).sort((a,b)=>a.x-b.x),host=walls[0],asset={...entry(host.materialAxis,2),hostWallId:host.id};m.begin('Picture');assert.deepEqual(m.placement(asset,host.x,host.y,0).reason,undefined);assert.equal(m.place(asset,host.x,host.y,0).ok,true);m.commit();const saved=m.export();
 const world=new World({playableBounds:m.bounds,cells:[]},structuredClone(props));world.setHousePlan(saved);
 for(const wall of saved.polygonGeometry.walls.filter(w=>w.opening)){assert.equal(wall.opening.frame,null);assert.equal(wall.opening.width,Math.SQRT2);const n=openingSpan(wall).normal,mid=wall.a.map((v,i)=>(v+wall.b[i])/2),a=mid.map((v,i)=>v+n[i]*.5),b=mid.map((v,i)=>v-n[i]*.5);assert.equal(world.polygonRuntime.blocksLine(a,b,0,'vision'),false);assert.equal(world.polygonRuntime.blocksLine(a,b,0,'move'),true);assert.equal(world.interactions({x:a[0],y:a[1],z:0}).some(o=>o.tile===wall.opening.stateTile),false);world.change(wall.x,wall.y,0,wall.opening.stateTile,{open:true});assert.equal(world.polygonRuntime.blocksLine(a,b,0,'move'),true);}
 m.undo();assert.equal(m.scene.openings.length,0);m.redo();assert.deepEqual(m.export(),saved);assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,props).export(),saved);
 const second=walls[1];m.begin('Erase second panel');m.erase(second.x,second.y,0,{hostWallId:second.id});m.commit();assert.equal(m.scene.openings.length,0);m.undo();assert.deepEqual(m.export(),saved);
 }
});
test('automatic direction and preview cover both diagonal hosts, while a short run or locked room changes nothing',()=>{
 const m=fixture('SE'),walls=m.scene.walls.filter(w=>w.axis.startsWith('D')).sort((a,b)=>a.x-b.x),host=walls[0],renderer={zoom:1,screen:(x,y,z)=>({x:(x-y)*32,y:(x+y)*16-z*96})},mid=renderer.screen(host.x+.5,host.y+.5,0),variants=[entry('N',2),entry('W',2)],resolved=resolveOrientedPlacement({entry:variants[0],model:m,renderer,px:mid.x,py:mid.y-48,z:0},variants,true);assert.equal(resolved.target.placementProblem,null);assert.equal(resolved.target.wallIds.length,2);assert.equal(resolved.entry.id,'glazing-W-2');
 const last=walls.at(-1),bad={...entry('W',2),hostWallId:last.id},before=m.export();assert.equal(m.placement(bad,last.x,last.y,0).ok,false);assert.equal(m.place(bad,last.x,last.y,0).ok,false);assert.deepEqual(m.export(),before);
 assert.equal(m.structure({type:'entities.lock',ids:['r'],locked:true}).ok,true);const locked=m.export();assert.equal(m.place(resolved.entry,host.x,host.y,0).ok,false);assert.deepEqual(m.export(),locked);
});
test('replacing one part of a picture removes the former assembly without leaving a frameless half',()=>{
 const m=fixture('SE'),host=m.scene.walls.filter(w=>w.axis.startsWith('D')).sort((a,b)=>a.x-b.x)[0];assert.deepEqual(m.place({...entry('W',2),hostWallId:host.id},host.x,host.y,0),{ok:true});const id=m.scene.openings[0].id;assert.equal(m.place({...entry('W',1),hostWallId:host.id},host.x,host.y,0).ok,true);assert.equal(m.scene.openings.length,1);assert.equal(m.scene.openings[0].id,id);
});
test('glazing adaptation preserves physical border widths instead of stretching the whole source frame',()=>{
 const calls=[],canvas={};drawGlazingPlane({drawImage:(...a)=>calls.push(a)},canvas,64*Math.SQRT2);assert.equal(calls.length,3);assert.equal(calls[0][7],4);assert.equal(calls[2][7],4);assert.ok(calls[1][7]>calls[1][3]);assert.equal(calls[0][8],192);
});

test('catalog command placement and floor copying keep picture assemblies independent',()=>{
 const m=fixture('SE'),host=m.scene.walls.filter(w=>w.axis.startsWith('D')).sort((a,b)=>a.x-b.x)[0],asset=entry('W',2),commands=new WorkshopCommands(m,new Map([[asset.id,asset]]));
 assert.equal(commands.commit({requestId:'picture',baseRevision:m.revision,operations:[{type:'place',assetId:asset.id,hostWallId:host.id,x:host.x,y:host.y,z:0}]}).ok,true);
 assert.equal(m.structure({type:'level.copyLayout',fromLevelId:'level:0',toIndex:1,copyId:'upper'}).ok,true);assert.equal(new Set(m.scene.openings.map(o=>o.assemblyId)).size,2);
 const ground=m.scene.openings.find(o=>o.hostWallId===host.id);assert.equal(m.structure({type:'opening.remove',id:ground.id}).ok,true);assert.equal(m.scene.openings.length,2);assert.ok(m.scene.openings.every(o=>m.scene.walls.find(w=>w.id===o.hostWallId).levelId!=='level:0'));
});
