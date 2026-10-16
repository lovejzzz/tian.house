import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/world.js';import {Visibility} from '../src/visibility.js';import {returnStairPath} from '../src/return-stair-path.js';
function setup(){const spec={x:3,y:3,z:0,axis:'W',run:2,handedness:'left'},path=returnStairPath(spec),w=new World({cells:[]},{floor:{solidfloor:''},wall:{WallW:''}});const squares=[];for(let x=0;x<12;x++)for(let y=0;y<12;y++)for(let z=0;z<2;z++)squares.push({x,y,z,tiles:z===1&&path.cells.some(c=>c.x===x&&c.y===y)?[]:['floor']});w.setHousePlan({squares,returnStairs:[spec]});const v=new Visibility(w),sim={state:{player:{x:path.top.x+.5,y:path.top.y+.5,z:1,angle:Math.PI},explored:{}}};return {w,v,sim,path};}
test('looking into an open stair shaft reveals treads without revealing lower rooms',()=>{
 const {v,sim,path}=setup();v.update(sim);for(const c of path.cells)assert.equal(v.visible.has(v.key(c.x,c.y,0)),true);
 assert.equal(v.visible.has('2,3,0'),false);assert.equal(sim.state.explored['2,3,0'],undefined);assert.equal(v.shaftWall(3,3,0),true);
 sim.state.player.x+=5;v.update(sim);assert.equal(v.stairShafts.size,0);
});
test('a covered tread or invisible upper approach does not reveal the lower level',()=>{
 const {w,v,sim,path}=setup(),c=path.cells[0];w.square(c.x,c.y,1).tiles=['floor'];w.revision++;v.update(sim);assert.equal(v.visible.has(v.key(c.x,c.y,0)),false);
 sim.state.player.x=path.top.x+1.5;w.square(path.top.x+1,path.top.y,1).tiles.push('wall');w.revision++;v.update(sim);assert.equal(v.stairShafts.size,0);
});
