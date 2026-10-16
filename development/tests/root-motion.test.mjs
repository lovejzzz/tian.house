import test from 'node:test';import assert from 'node:assert/strict';
import {projectRootDelta,rootPosition} from '../src/root-motion.js';
import {windowRootDelta,WINDOW_START_TIME,WINDOW_FINISH_TIME} from '../src/window-traversal.js';
const curve=(start,end,duration)=>[{bone:'Translation_Data',kind:2,times:[0,duration],values:[[0,0,start],[0,0,end]]}];
test('root sampling clamps nonloop clips and interpolates full three-axis translations',()=>{
 const c=curve(-.3,-.6,1);assert.deepEqual(rootPosition(c,-1),[0,0,-.3]);assert.deepEqual(rootPosition(c,2),[0,0,-.6]);assert.ok(Math.abs(rootPosition(c,.5)[2]+.45)<1e-12);
 assert.throws(()=>rootPosition([],0),/Missing root/);
});
test('phase boundary accumulates deltas without adding next clips absolute offset',()=>{
 const data={motionScale:1.6,animations:{climbWindowStart:curve(0,-.2,.5),climbWindowEnd:curve(-.3,-.5,4/3)}};
 const total=windowRootDelta(data,0,WINDOW_FINISH_TIME,-Math.PI/2);
 assert.ok(Math.abs(total.y-(-.2-.2*.6)*1.6)<1e-12);
 let y=0;for(let t=0;t<WINDOW_FINISH_TIME;t+=.017)y+=windowRootDelta(data,t,t+.017,-Math.PI/2).y;
 assert.ok(Math.abs(y-total.y)<1e-12);
 const edge=windowRootDelta(data,WINDOW_START_TIME-.001,WINDOW_START_TIME+.001,-Math.PI/2);assert.ok(Math.abs(edge.y)<.002);
 assert.deepEqual(windowRootDelta(data,WINDOW_FINISH_TIME+1,WINDOW_FINISH_TIME+2,0),{x:0,y:0});
});
test('root motion rotates to all cardinal directions without vertical displacement leaking into the ground',()=>{
 const n=projectRootDelta([0,99,-.1],0,1.6);assert.ok(Math.abs(n.x)<1e-12);assert.ok(Math.abs(n.y+.16)<1e-12);
 const e=projectRootDelta([0,99,-.1],Math.PI/2,1.6);assert.ok(Math.abs(e.x-.16)<1e-12);assert.ok(Math.abs(e.y)<1e-12);
});
