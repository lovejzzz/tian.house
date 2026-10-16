import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';import {WorkshopCommands} from '../src/workshop-commands.js';
import {prepareHouseState} from '../src/workshop-apply.js';
import {World} from '../src/world.js';import {Visibility} from '../src/visibility.js';import {Simulation,newState} from '../src/simulation.js';
import {resolveOrientedPlacement} from '../src/workshop-placement.js';import {openingSpan} from '../src/diagonal-openings.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
const props={floor:{solidfloor:''},blends_natural_01_16:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},wall_10:{DoorWallW:''},wall_11:{DoorWallN:''},doorW:{doorW:'',CustomName:'Door'},doorN:{doorN:'',CustomName:'Door'},glassW:{doorW:'',doorTrans:'',CustomName:'Glass door'}};
const source=(id,tile)=>({id,parts:[{dx:0,dy:0,tile}]});
function fixture(corner='SE'){
 const squares=[];for(let x=0;x<20;x++)for(let y=0;y<20;y++)squares.push({x,y,z:0,room:-1,tiles:['blends_natural_01_16']});
 const m=new StructuredWorkshopModel({version:1,squares,items:[]},[0,0,20,20],props);
 assert.equal(m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[5,5,13,12],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);
 assert.equal(m.structure({type:'room.chamfer',roomId:'r',corner,distance:3}).ok,true);
 const wall=m.scene.walls.filter(w=>w.axis.startsWith('D'))[1],entry={...source('door','door'+wall.materialAxis),hostWallId:wall.id};
 return {m,wall,entry};
}
function endpoints(wall){const middle=wall.a.map((v,i)=>(v+wall.b[i])/2),normal=openingSpan(wall).normal;return {middle,normal,from:middle.map((v,i)=>v-normal[i]*.6),to:middle.map((v,i)=>v+normal[i]*.6)};}
test('public diagonal door placement and replacement preserve host and opening identity through undo, removal and reload',()=>{
 const {m,wall,entry}=fixture(),before=m.export();m.begin('Door');assert.equal(m.placement(entry,wall.x,wall.y,0).ok,true);assert.equal(m.place(entry,wall.x,wall.y,0).ok,true);m.commit();
 const opening=m.scene.openings[0],derived=m.plan.polygonGeometry.walls.find(w=>w.id===wall.id);assert.equal(derived.opening.id,opening.id);assert.equal(derived.opening.width,1);assert.ok(!m.square(wall.x,wall.y,0).tiles.includes('doorW'));
 const commands=new WorkshopCommands(m,new Map());assert.equal(commands.commit({requestId:'replace',baseRevision:m.revision,operations:[{type:'opening.replace',opening:{...opening,tile:'glassW'}}]}).ok,true);assert.equal(m.scene.openings[0].id,opening.id);
 const replaced=m.export();assert.deepEqual(new StructuredWorkshopModel(replaced,m.bounds,props).export(),replaced);m.undo();assert.equal(m.scene.openings[0].tile,'doorW');m.redo();assert.deepEqual(m.export(),replaced);
 m.begin('Remove opening');m.erase(wall.x,wall.y,0);m.commit();assert.equal(m.scene.openings.length,0);assert.ok(m.scene.walls.some(w=>w.id===wall.id));m.undo();assert.deepEqual(m.export(),replaced);
 const locked=m.structure({type:'entities.lock',ids:['r'],locked:true});assert.equal(locked.ok,true);assert.equal(m.place(entry,wall.x,wall.y,0).ok,false);assert.ok(before.squares.length);
});
test('all diagonal orientations block closed doors, pass the open centre in both directions, and retain physical jamb collision',()=>{
 for(const corner of ['NW','NE','SE','SW']){
  const {m,wall,entry}=fixture(corner);assert.equal(m.place(entry,wall.x,wall.y,0).ok,true);const w=new World({playableBounds:m.bounds,cells:[]},structuredClone(props));w.setHousePlan(m.export());const derived=w.polygonRuntime.walls.get(0).find(v=>v.id===wall.id),{from,to,middle,normal}=endpoints(derived),tile=derived.opening.stateTile;
  assert.ok(Math.abs(Math.hypot(...openingSpan(derived).a.map((v,i)=>v-openingSpan(derived).b[i]))-1)<1e-9);
  for(const [a,b]of [[from,to],[to,from]]){const actor={x:a[0],y:a[1],z:0};assert.ok(w.interactions(actor).some(o=>o.tile===tile));assert.equal(w.polygonRuntime.blocksLine(a,b,0),true);w.move(actor,b[0]-a[0],b[1]-a[1]);assert.ok(Math.hypot(actor.x-b[0],actor.y-b[1])>.3);}
  w.change(wall.x,wall.y,0,tile,{open:true});
  for(const [a,b]of [[from,to],[to,from]]){const actor={x:a[0],y:a[1],z:0};w.move(actor,b[0]-a[0],b[1]-a[1]);assert.ok(Math.hypot(actor.x-b[0],actor.y-b[1])<1e-7,corner);}
  const jamb=derived.a.map((v,i)=>v+(derived.b[i]-v)*.05);assert.equal(w.polygonRuntime.blocksMove(jamb.map((v,i)=>v-normal[i]*.5),jamb.map((v,i)=>v+normal[i]*.5),0),true);
  w.change(wall.x,wall.y,0,tile,{barricade:1});assert.equal(w.polygonRuntime.blocksLine(from,to,0),true);
 }
});
test('opaque and glazed diagonal doors have distinct movement and vision, and game interaction/save restore uses the stable opening key',()=>{
 const {m,wall,entry}=fixture();m.place(entry,wall.x,wall.y,0);const w=new World({playableBounds:m.bounds,cells:[]},structuredClone(props));w.setHousePlan(m.export());const derived=w.polygonRuntime.walls.get(0).find(v=>v.id===wall.id),{from,to}=endpoints(derived),state=newState([...from,0]);state.spawned={'0,0,0':true};state.housePlan=m.export();const sim=new Simulation(w,state);const door=w.interactions(state.player).find(o=>o.tile===derived.opening.stateTile);assert.ok(door);
 assert.equal(w.polygonRuntime.blocksLine(from,to,0,'vision'),true);sim.interact(door);assert.equal(w.state(door.x,door.y,0,door.tile).open,true);assert.equal(w.polygonRuntime.blocksLine(from,to,0,'vision'),false);
 const restored=new Simulation(w,JSON.parse(sim.serialize()));assert.equal(w.state(door.x,door.y,0,door.tile).open,true);assert.ok(w.interactions(restored.state.player).some(o=>o.id===door.id));
 sim.interact(door);assert.equal(w.state(door.x,door.y,0,door.tile).open,false);
 m.place({...entry,parts:[{dx:0,dy:0,tile:'glassW'}]},wall.x,wall.y,0);w.setHousePlan(m.export());assert.equal(w.polygonRuntime.blocksLine(from,to,0,'vision'),false);assert.equal(w.polygonRuntime.blocksLine(from,to,0,'move'),true);w.change(door.x,door.y,0,door.tile,{hasCurtain:true,curtainOpen:false});assert.equal(w.polygonRuntime.blocksLine(from,to,0,'vision'),true);
});
test('wall-face placement chooses a compatible source direction automatically and previews the real diagonal host',()=>{
 const {m,wall}=fixture(),renderer={zoom:1,screen:(x,y,z)=>({x:(x-y)*32,y:(x+y)*16-z*96})},middle=renderer.screen(wall.x+.5,wall.y+.5,0),north=source('north','doorN'),west=source('west','doorW');
 const args={entry:north,model:m,renderer,px:middle.x,py:middle.y-48,z:0},resolved=resolveOrientedPlacement(args,[north,west],true);assert.equal(resolved.target.wallId,wall.id);assert.equal(resolved.entry.id,'west');assert.equal(resolved.target.placementProblem,null);assert.equal(m.placement(resolved.entry,wall.x,wall.y,0).ok,true);
 const manual=resolveOrientedPlacement(args,[north,west],false);assert.match(manual.target.placementProblem,/Press R/);
 const miss=resolveOrientedPlacement({...args,entry:resolved.entry,px:-999,py:-999},[north,west],true);assert.equal(miss.entry.hostWallId,undefined);
});


test('walkthrough checks derived wall, frame and leaf textures before replacing game state',()=>{
 const {m,wall,entry}=fixture();m.place(entry,wall.x,wall.y,0);const w=new World({playableBounds:m.bounds,cells:[]},structuredClone(props)),state=newState([6.5,6.5,0]);state.housePlan=m.export();const sim=new Simulation(w,state),before=sim.serialize(),regions=Object.fromEntries(Object.keys(props).map(k=>[k,{}]));
 delete regions.wall_10;assert.throws(()=>prepareHouseState(sim,m.export(),m.bounds,{regions}),/Missing tile: wall_10/);assert.equal(sim.serialize(),before);
 regions.wall_10={};assert.doesNotThrow(()=>prepareHouseState(sim,m.export(),m.bounds,{regions}));
});
