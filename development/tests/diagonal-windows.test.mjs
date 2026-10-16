import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {prepareHouseState} from '../src/workshop-apply.js';
import {World} from '../src/world.js';import {Simulation,newState} from '../src/simulation.js';
import {openingSpan,diagonalWindowSides} from '../src/diagonal-openings.js';
import {windowLanding,windowBarricadeSide} from '../src/windows.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
const props={floor:{solidfloor:''},blends_natural_01_16:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},wall_8:{WindowW:'',wall:''},wall_9:{WindowN:'',wall:''},windowW:{windowW:'',CustomName:'Window',OpenTileOffset:'8'},windowN:{windowN:'',CustomName:'Window',OpenTileOffset:'8'},crate:{solid:''}};
function fixture(corner='SE',profile=null){
 const fixtureProps=structuredClone(props);if(profile)for(const axis of ['N','W'])fixtureProps['window'+axis].TianWindowProfile=JSON.stringify(profile);
 const squares=[];for(let x=0;x<20;x++)for(let y=0;y<20;y++)squares.push({x,y,z:0,room:-1,tiles:['blends_natural_01_16']});
 const m=new StructuredWorkshopModel({version:1,squares,items:[]},[0,0,20,20],fixtureProps);
 assert.equal(m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[5,5,13,12],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);
 assert.equal(m.structure({type:'room.chamfer',roomId:'r',corner,distance:3}).ok,true);
 const host=m.scene.walls.filter(w=>w.axis.startsWith('D'))[1],entry={id:'window',parts:[{dx:0,dy:0,tile:'window'+host.materialAxis}],hostWallId:host.id};
 m.begin('Window');assert.equal(m.placement(entry,host.x,host.y,0).ok,true);assert.equal(m.place(entry,host.x,host.y,0).ok,true);m.commit();
 const wall=m.plan.polygonGeometry.walls.find(w=>w.id===host.id),normal=openingSpan(wall).normal,mid=wall.a.map((v,i)=>(v+wall.b[i])/2),spawn=[mid[0]+normal[0]*.65,mid[1]+normal[1]*.65,0];
 const state=newState(spawn);state.housePlan=m.export();state.spawned={'0,0,0':true};const w=new World({playableBounds:m.bounds,cells:[]},structuredClone(props)),sim=new Simulation(w,state);sim.spawnNearby=()=>{};
 const obj=w.interactions(state.player).find(o=>o.type==='window');assert.ok(obj);
 return {m,w,sim,obj,wall};
}
function finish(sim){for(let i=0;i<200&&sim.action;i++)sim.tick(.05);assert.equal(sim.action,null);}
test('diagonal window host/frame survives undo, export/reload, and all four orientations have continuous two-way climb with a real sill',()=>{
 for(const corner of ['NW','NE','SE','SW']){
  const {m,w,sim,obj}=fixture(corner),plan=m.export();m.undo();assert.equal(m.scene.openings.length,0);m.redo();assert.deepEqual(m.export(),plan);assert.deepEqual(new StructuredWorkshopModel(plan,m.bounds,props).export(),plan);
  const p=sim.state.player,first=diagonalWindowSides(obj.polygonWall,p),tile=obj.tile;assert.equal(windowBarricadeSide(obj,first.from)===windowBarricadeSide(obj,first.to),false);
  assert.equal(w.polygonRuntime.blocksLine([first.from.x,first.from.y],[first.to.x,first.to.y],0,'vision'),false);
  sim.interact(obj);finish(sim);assert.equal(w.state(obj.x,obj.y,0,tile).open,true,corner);
  for(let i=0;i<2;i++){
   const to=windowLanding(obj,p),from={x:p.x,y:p.y,z:p.z};
   w.move(p,to.x-p.x,to.y-p.y);assert.ok(Math.hypot(to.x-p.x,to.y-p.y)>.3,'open window must retain sill');
   sim.interact(obj,'climb');assert.ok(sim.action);finish(sim);assert.ok(Math.hypot(to.x-p.x,to.y-p.y)<1e-7,corner);
   assert.ok(w.interactions(p).some(o=>o.id===obj.id));assert.ok(Math.hypot(from.x-p.x,from.y-p.y)>.6);
  }
  sim.interact(obj);finish(sim);assert.equal(w.state(obj.x,obj.y,0,tile).open,false);
  const restored=new Simulation(w,JSON.parse(sim.serialize()));assert.equal(w.state(obj.x,obj.y,0,tile).open,false);assert.ok(w.interactions(restored.state.player).some(o=>o.id===obj.id));
 }
});
test('full-body landing rejects partial support and solid objects; barricades prevent climbing from either side',()=>{
 const {w,sim,obj}=fixture(),p=sim.state.player,sides=diagonalWindowSides(obj.polygonWall,p);Object.assign(p,sides.from);
 w.change(obj.x,obj.y,0,obj.tile,{open:true});
 const corner={x:sides.to.x+.18,y:sides.to.y+.18},floorAt=w.floorAt.bind(w);w.floorAt=(x,y,z)=>Math.hypot(x-corner.x,y-corner.y)>.02&&floorAt(x,y,z);
 sim.interact(obj,'climb');assert.equal(sim.action,null);assert.deepEqual({x:p.x,y:p.y,z:p.z},sides.from);
 w.floorAt=floorAt;const sq=w.square(sides.to.x,sides.to.y,0);sq.tiles.push('crate');sim.interact(obj,'climb');assert.equal(sim.action,null);sq.tiles.pop();
 w.change(obj.x,obj.y,0,obj.tile,{barricades:{opposite:{plankHealth:[100,0,0,0]}}});sim.interact(obj,'climb');assert.equal(sim.action,null);
});
test('continuous climb never uses cell-centre snaps, cancels before crossing if the window closes, and revalidates landing during motion',()=>{
 const {w,sim,obj}=fixture(),p=sim.state.player,sides=diagonalWindowSides(obj.polygonWall,p);Object.assign(p,sides.from);w.change(obj.x,obj.y,0,obj.tile,{open:true});
 sim.interact(obj,'climb');sim.tick(.1);assert.equal(p.x,sides.from.x);assert.equal(p.y,sides.from.y);
 w.change(obj.x,obj.y,0,obj.tile,{open:false});sim.tick(.1);assert.equal(sim.action,null);assert.equal(p.x,sides.from.x);
 w.change(obj.x,obj.y,0,obj.tile,{open:true});sim.interact(obj,'climb');for(let i=0;i<7;i++)sim.tick(.1);assert.ok(Math.hypot(p.x-sides.from.x,p.y-sides.from.y)>0);
 const sq=w.square(sides.to.x,sides.to.y,0);sq.tiles.push('crate');sim.tick(.1);assert.equal(sim.action,null);assert.equal(p.x,sides.from.x);assert.equal(p.y,sides.from.y);
});

test('walkthrough rejects missing diagonal window state artwork before changing game state',()=>{
 const {m,sim}=fixture(),plan=m.export(),opening=plan.polygonGeometry.walls.find(w=>w.opening).opening;
 opening.tile='pane_0';opening.properties={OpenTileOffset:'2',SmashedTileOffset:'4',GlassRemovedOffset:'6'};
 const regions=Object.fromEntries([...Object.keys(props),'pane_0','pane_2','pane_4'].map(k=>[k,{}])),before=sim.serialize();
 assert.throws(()=>prepareHouseState(sim,plan,m.bounds,{regions}),/Missing tile: pane_6/);assert.equal(sim.serialize(),before);
 regions.pane_6={};assert.doesNotThrow(()=>prepareHouseState(sim,plan,m.bounds,{regions}));
});


test('profiled tall windows keep material jambs and a sill; off-centre apertures remain traversable in every diagonal orientation',()=>{
 for(const corner of ['NW','NE','SE','SW']){
  const profile=[.02,.08,.72,.92],{m,w,sim,obj,wall}=fixture(corner,profile);
  assert.deepEqual(wall.opening.profile,profile);assert.equal(wall.opening.frame,null);
  assert.ok(Math.abs(wall.opening.width-.7)<1e-12);
  const saved=m.export();assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,m.properties).export(),saved);
  const span=openingSpan(wall),sides=diagonalWindowSides(wall,sim.state.player),center=span.a.map((v,i)=>(v+span.b[i])/2);
  assert.ok(Math.abs((sides.from.x+sides.to.x)/2-center[0])<1e-12);
  assert.ok(Math.abs((sides.from.y+sides.to.y)/2-center[1])<1e-12);
  assert.ok(Math.hypot(center[0]-(wall.a[0]+wall.b[0])/2,center[1]-(wall.a[1]+wall.b[1])/2)>.1);
  Object.assign(sim.state.player,sides.from);
  sim.interact(obj);finish(sim);
  assert.equal(w.polygonRuntime.blocksLine([sides.from.x,sides.from.y],[sides.to.x,sides.to.y],0,'vision'),false);
  for(let i=0;i<2;i++){
   const p=sim.state.player,to=windowLanding(obj,p);w.move(p,to.x-p.x,to.y-p.y);
   assert.ok(Math.hypot(to.x-p.x,to.y-p.y)>.3,'sill still blocks ordinary walking');
   sim.interact(obj,'climb');assert.ok(sim.action);finish(sim);
   assert.ok(Math.hypot(to.x-p.x,to.y-p.y)<1e-7,corner);
  }
 }
});
