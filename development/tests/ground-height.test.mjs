import test from 'node:test';import assert from 'node:assert/strict';
import {groundHeight,groundObjectLift,groundFloorLift} from '../src/ground-height.js';
import {World} from '../src/world.js';
const props={floor:{solidfloor:''},pavement:{solidfloor:'',TianGroundHeight:'6'},rug:{solidfloor:'',FloorOverlay:'',TianGroundHeight:'15'},bad:{solidfloor:'',TianGroundHeight:'97'},chair:{solidtrans:''},cup:{TianMount:'table'},lamp:{TianMount:'wall'}};
test('ground height ignores overlays, invalid heights and unsupported clipped regions',()=>{
 assert.equal(groundHeight({tiles:['floor','pavement','rug','bad']},props),6);
 assert.equal(groundHeight({tiles:['pavement']},props,()=>false),0);
 assert.equal(groundObjectLift('chair',{tiles:['pavement']},props),6);
 assert.equal(groundObjectLift('cup',{tiles:['pavement']},props),6);
 assert.equal(groundObjectLift('lamp',{tiles:['pavement']},props),0);
});
test('walking onto and off a low platform changes apparent height without changing floor',()=>{
 const world=new World({playableBounds:[0,0,8,8],cells:[]},props);
 world.setHousePlan({version:1,squares:[{x:3,y:3,z:0,tiles:['floor']},{x:4,y:3,z:0,tiles:['pavement']}],items:[]});
 const actor={x:3.5,y:3.5,z:0};assert.equal(world.apparentZ(actor),0);
 assert.equal(world.canStep(3.8,3.5,4.1,3.5,0),true);
 world.move(actor,1,0);assert.equal(actor.z,0);assert.equal(Math.floor(actor.x),4);assert.equal(world.apparentZ(actor),6/96);
 world.move(actor,-1,0);assert.equal(world.apparentZ(actor),0);
 world.change(4,3,0,'pavement',{destroyed:true});assert.equal(world.groundHeight(4.5,3.5,0),0);
});

test('overlays follow the platform while the underlying terrain keeps its original plane',()=>{
 const square={tiles:['floor','pavement','rug']};
 assert.equal(groundFloorLift('floor',square,props),0);
 assert.equal(groundFloorLift('pavement',square,props),6);
 assert.equal(groundFloorLift('rug',square,props),6);
});
import {supportedGroundSquare} from '../src/ground-height.js';
import {Renderer} from '../src/render.js';
test('rendered furniture loses the platform lift after destruction and wall shelves never inherit it',()=>{
 const properties={...props,shelf:{container:'shelves',TianMount:'wall'}};
 const world=new World({playableBounds:[0,0,8,8],cells:[]},properties);
 world.setHousePlan({version:1,squares:[{x:4,y:3,z:0,tiles:['floor','pavement','chair','shelf']}],items:[]});
 let result;const renderer={world,project:(x,y,z)=>({x,y:y-z*96}),sprite:(...args)=>{result=args;}};
 Renderer.prototype.object.call(renderer,'chair',4,3,0);assert.equal(result[2],-3);
 Renderer.prototype.object.call(renderer,'shelf',4,3,0);assert.equal(result[2],3);
 world.change(4,3,0,'pavement',{destroyed:true});
 Renderer.prototype.object.call(renderer,'chair',4,3,0);assert.equal(result[2],3);
 assert.deepEqual(supportedGroundSquare(world,world.square(4,3,0)).tiles,['floor','chair','shelf']);
});
