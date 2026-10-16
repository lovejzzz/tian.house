import test from 'node:test';import assert from 'node:assert/strict';import {World} from '../src/world.js';import {Visibility} from '../src/visibility.js';
function setup(){const world=new World({cells:[]},{floor:{solidfloor:''},wall:{WallW:''},door:{doorW:''},window:{WallW:'',windowW:''},chair:{solidtrans:''}});const squares=new Map();for(let x=0;x<8;x++)for(let y=0;y<8;y++)squares.set(`${x},${y},0`,{x,y,z:0,tiles:['floor']});world.cells.set('0_0',{squares});return {world,v:new Visibility(world),p:{x:2.5,y:3.5,z:0,angle:0}};}
test('sight crosses furniture and windows, but not opaque walls or closed doors',()=>{const{world,v,p}=setup();world.square(3,3).tiles.push('chair');assert.equal(v.line(p,4,3),true);world.square(3,3).tiles=['floor','window'];v.edgeCache.clear();assert.equal(v.line(p,4,3),true);world.square(3,3).tiles=['floor','door'];v.edgeCache.clear();assert.equal(v.line(p,4,3),false);world.change(3,3,0,'door',{open:true});v.edgeCache.clear();assert.equal(v.line(p,4,3),true);world.square(3,3).tiles=['floor','wall'];v.edgeCache.clear();assert.equal(v.line(p,4,3),false);});
test('visibility invalidates on door changes; hidden rooms are not explored',()=>{const{world,v,p}=setup();for(let y=0;y<8;y++)world.square(3,y).tiles.push('wall');world.square(3,3).tiles=['floor','door'];const sim={state:{player:p}};v.update(sim);assert.equal(v.visible.has('4,3,0'),false);assert.equal(sim.state.explored['4,3,0'],undefined);world.change(3,3,0,'door',{open:true});v.update(sim);assert.equal(v.visible.has('4,3,0'),true);world.change(3,3,0,'door',{open:false});v.update(sim);assert.equal(v.brightness(4,3,0,sim.state.explored),.25);});
test('restarting at the same coordinate builds new explored state',()=>{const{v,p}=setup();v.update({state:{player:p}});const fresh={state:{player:{...p}}};v.update(fresh);assert.equal(fresh.state.explored['2,3,0'],true);});
test('glass door transmits sight but blocks movement; curtain overrides glass only while closed',()=>{
 const{world,v,p}=setup();world.properties.glass={doorW:'',doorTrans:'',WallW:''};world.square(3,3).tiles=['floor','glass'];
 assert.equal(v.line(p,4,3),true);assert.equal(world.canStep(2.5,3.5,3.5,3.5,0),false);
 world.change(3,3,0,'glass',{hasCurtain:true,curtainOpen:false});v.edgeCache.clear();assert.equal(v.line(p,4,3),false);
 world.change(3,3,0,'glass',{open:true});v.edgeCache.clear();assert.equal(v.line(p,4,3),true);assert.equal(world.canStep(2.5,3.5,3.5,3.5,0),true);
 world.change(3,3,0,'glass',{open:false,curtainOpen:true});v.edgeCache.clear();assert.equal(v.line(p,4,3),true);assert.equal(world.canStep(2.5,3.5,3.5,3.5,0),false);
});
test('wall coverings use their support boundary light without revealing unrelated rooms or floors',()=>{
 const {v}=setup();v.light.set('3,2,0',[.8,.9]);
 assert.equal(v.surfaceBrightness(3,3,0,{}, {attachedN:''}),.9);
 assert.equal(v.surfaceBrightness(3,3,0,{}, {attachedW:''}),0);
 assert.equal(v.surfaceBrightness(3,3,1,{}, {attachedN:''}),0);
 assert.equal(v.visible.size,0);v.light.clear();assert.equal(v.surfaceBrightness(3,3,0,{}, {attachedN:''}),0);
});
test('visible exterior floor fragments do not inherit the occluded diagonal cell center',()=>{
 const {world,v,p}=setup();world.properties.platform={solidfloor:'',TianGroundHeight:'6'};
 const squares=[...world.cells.get('0_0').squares.values()].map(s=>({...s,tiles:[...s.tiles]}));squares.find(s=>s.x===3&&s.y===3).tiles=['platform','floor'];
 world.setHousePlan({squares,items:[],polygonGeometry:{floors:[{x:3,y:3,z:0,tile:'floor',full:false,polygons:[[[0,0],[1,0],[0,1]]]}],walls:[{id:'diagonal',x:3,y:3,z:0,axis:'D-',a:[3,4],b:[4,3]}]}});
 Object.assign(p,{x:4.2,y:4.2,angle:-Math.PI*3/4});const sim={state:{player:p,explored:{}}};v.update(sim);v.advance(sim,1/60);
 assert.equal(v.line(p,3,3),false);assert.equal(v.lineTo(p,3+2/3,3+2/3),true);assert.equal(v.visible.has('3,3,0'),false);
 const sq=world.square(3,3,0);assert.ok(v.floorBrightness('platform',sq,sim.state.explored)>.9);
 assert.equal(v.floorBrightness('floor',sq,sim.state.explored),0);assert.equal(sim.state.explored['3,3,0'],undefined);
 // A fresh observer behind the wall must not inherit the previous exterior light.
 const inside={state:{player:{x:2.8,y:2.8,z:0,angle:Math.PI/4},explored:{}}};v.update(inside);v.advance(inside,1/60);
 assert.equal(v.lineTo(inside.state.player,3+2/3,3+2/3),false);assert.equal(v.floorBrightness('platform',sq,inside.state.explored),0);
});
