import test from 'node:test';import assert from 'node:assert/strict';
import {Visibility} from '../src/visibility.js';
import {interactionTarget,interactionLabel} from '../src/interaction-target.js';
test('light fades over time without changing authoritative visibility',()=>{
 const world={renderLevels:()=>[0]},v=new Visibility(world),state={player:{x:.5,y:.5,z:0,angle:0},explored:{'4,0,0':true}},sim={state};
 v.visible.add('4,0,0');v.advance(sim,.1);const lit=v.brightness(4,0,0,state.explored);v.visible.clear();v.advance(sim,.1);
 const middle=v.brightness(4,0,0,state.explored);assert.ok(middle<lit&&middle>.25);assert.equal(v.visible.size,0);
 for(let i=0;i<50;i++)v.advance(sim,.1);assert.ok(Math.abs(v.brightness(4,0,0,state.explored)-.25)<.001);
 assert.equal(v.brightness(-8,0,0,state.explored),0);v.visible.add('-8,0,0');v.advance(sim,.05);assert.ok(v.brightness(-8,0,0,state.explored)>0&&v.brightness(-8,0,0,state.explored)<.25,'newly discovered tiles must fade in too');
 const wall=v.wallAlpha('wall',1,.1);assert.equal(wall,1);assert.ok(v.wallAlpha('wall',.26,.1)>.26);
});
test('interaction focus is stable nearby but never retains an unreachable target',()=>{
 const p={x:1,y:1,angle:Math.PI/4},a={id:'door',x:0,y:1,distance:Math.SQRT1_2,type:'door'},b={id:'cabinet',x:1,y:0,distance:Math.SQRT1_2,type:'container'};
 assert.equal(interactionTarget([a,b],p,a).id,'door');assert.equal(interactionTarget([b],p,a).id,'cabinet');assert.equal(interactionTarget([],p,a),null);
 assert.equal(interactionLabel(a,{open:true}),'Close door');assert.equal(interactionLabel(b),'Open');
});
