import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/world.js';import {Visibility} from '../src/visibility.js';
import {PolygonRuntime,squareDistanceToWall} from '../src/polygon-runtime.js';
import {migrateHousePlan} from '../src/scene-document.js';import {addRectangularRoom,compileStructuralScene} from '../src/scene-structure.js';import {chamferRoom} from '../src/scene-polygon-rooms.js';
const properties={floor:{solidfloor:''},blends_natural_01_16:{solidfloor:''},wallN:{WallN:''},wallW:{WallW:''}};
function fixture(z=0,corner='NW'){let s=migrateHousePlan({version:1,squares:[],items:[]},[0,0,20,20]);s.levels.push({id:'floor',index:z,height:null,elevation:null});if(z===0)for(let x=0;x<15;x++)for(let y=0;y<15;y++)s.legacy.squares.push({id:`grass:${x},${y}`,value:{x,y,z,room:-1,tiles:['blends_natural_01_16']}});s=addRectangularRoom(s,{id:'r',levelId:'floor',rect:[2,2,10,9],floorTile:'floor',wallN:'wallN',wallW:'wallW'});s=chamferRoom(s,{roomId:'r',corner,distance:3});const p=compileStructuralScene(s,properties),w=new World({playableBounds:s.bounds},structuredClone(properties));w.setHousePlan(p);return {w,p};}
test('same-cell diagonal boundary blocks paths, vision and interactions in both directions',()=>{
 const {w}=fixture(),outside={x:3.1,y:3.1,z:0},inside={x:3.9,y:3.9,z:0};
 assert.equal(w.canStep(outside.x,outside.y,inside.x,inside.y),false);assert.equal(w.canStep(inside.x,inside.y,outside.x,outside.y),false);
 assert.equal(w.lineClear(outside,inside),false);assert.equal(new Visibility(w).line(outside,4,4),false);
 assert.equal(w.interactionReachable(outside,4,4,0,{},'container'),false);assert.equal(w.interactionReachable({x:4.6,y:4.6,z:0},5,4,0,{},'container'),true);
});
test('actor radius blocks sustained attempts and long moves through a diagonal while allowing retreat',()=>{
 const {w}=fixture(),actor={x:3,y:3,z:0};for(let i=0;i<100;i++)w.move(actor,.1,.1);assert.ok(actor.x+actor.y<=6.64+1e-7);const stopped={...actor};assert.equal(w.move(actor,-.2,-.2),true);assert.ok(actor.x+actor.y<stopped.x+stopped.y);
 const fast={x:3,y:3,z:0};w.move(fast,10,10);assert.ok(fast.x+fast.y<=6.64+1e-7);
 const inside={x:4,y:4,z:0};for(let i=0;i<100;i++)w.move(inside,-.1,-.1);assert.ok(inside.x+inside.y>=7.36-1e-7);
 const overlap={x:3.34,y:3.34,z:0};assert.ok(w.polygonRuntime.penetration([overlap.x,overlap.y],0)>0);assert.equal(w.move(overlap,-.1,-.1),true);assert.equal(w.polygonRuntime.penetration([overlap.x,overlap.y],0),0);
});
test('exact square clearance permits tangent contact but forbids crossing even when both endpoints are clear',()=>{
 const wall={a:[0,0],b:[1,1],z:0},runtime=new PolygonRuntime({walls:[wall]});
 assert.ok(Math.abs(squareDistanceToWall([.2,.6],wall)-.2)<1e-9);
 assert.equal(runtime.blocksMove([.2,.56],[.3,.66],0),false);
 assert.equal(runtime.blocksMove([.2,.56],[.3,.56],0),true);
 assert.equal(runtime.blocksMove([-.5,.5],[.5,-.5],0),true);
 assert.equal(runtime.blocksMove([.2,.54],[.1,.54],0),false);
 assert.equal(runtime.blocksMove([.2,.54],[.5,.2],0),true);
});
test('upper partial floors support only the actual polygon and ground outside the cut remains exterior',()=>{
 const {w}=fixture(1);assert.equal(w.floorAt(3.1,3.1,1),false);assert.equal(w.floorAt(3.9,3.9,1),true);assert.equal(w.hasRainBlockingTile(3.1,3.1,1),false);assert.equal(w.hasRainBlockingTile(3.9,3.9,1),true);assert.equal(w.canStep(3.2,3.1,3.3,3.2,1),false);
 const ground=fixture().w;assert.equal(ground.floorAt(3.1,3.1,0),true);assert.equal(ground.isExterior(3.1,3.1,0),true);assert.equal(ground.isExterior(3.9,3.9,0),false);
});
test('changing house plans clears derived walls and masks, and JSON roundtrip preserves runtime results',()=>{
 const {w,p}=fixture();w.setHousePlan(JSON.parse(JSON.stringify(p)));assert.equal(w.canStep(3.1,3.1,3.9,3.9),false);
 w.setHousePlan({version:1,squares:[{x:3,y:3,z:0,room:-1,tiles:['floor']}],items:[]});assert.equal(w.canStep(3.1,3.1,3.9,3.9),true);assert.equal(w.isExterior(3.1,3.1),true);w.setHousePlan(null);assert.equal(w.polygonRuntime.walls.size,0);
});


test('all four chamfer orientations block both approaches using actual compiled wall endpoints',()=>{
 for(const corner of ['NW','NE','SE','SW']){
  const {w,p}=fixture(0,corner),wall=p.polygonGeometry.walls[1],dx=wall.b[0]-wall.a[0],dy=wall.b[1]-wall.a[1],length=Math.hypot(dx,dy),normal=[-dy/length,dx/length],middle=[(wall.a[0]+wall.b[0])/2,(wall.a[1]+wall.b[1])/2];
  for(const side of [-1,1]){const start=middle.map((v,i)=>v+normal[i]*.45*side),end=middle.map((v,i)=>v-normal[i]*.45*side);assert.equal(w.canStep(...start,...end,0),false);const actor={x:start[0],y:start[1],z:0};w.move(actor,end[0]-start[0],end[1]-start[1]);const signed=(actor.x-middle[0])*normal[0]+(actor.y-middle[1])*normal[1];assert.ok(signed*side>=.18*Math.SQRT2-1e-7,`${corner}: ${signed}`);}
 }
});
