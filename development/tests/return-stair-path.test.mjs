import test from 'node:test';import assert from 'node:assert/strict';
import {returnStairPath,ReturnStairPath} from '../src/return-stair-path.js';
for(const axis of ['W','N','E','S'])test(`${axis} return stair has continuous half-rise landing and reversible end ports`,()=>{
 const r=new ReturnStairPath({x:10,y:20,z:-1,axis}),{cells,bottom,top}=r.path;
 assert.equal(new Set(cells.map(c=>[c.x,c.y].join(','))).size,8);
 assert.deepEqual(cells.slice(3,5).map(c=>[c.low,c.high]),[[-.5,-.5],[-.5,-.5]]);
 assert.equal(cells[0].low,-1);assert.equal(cells.at(-1).high,0);
 for(let i=0;i<cells.length;i++){
  const c=cells[i];assert.equal(r.height(c.x+.5,c.y+.5,-1),(c.low+c.high)/2);
  assert.ok(Math.abs(r.height(c.x+.5-.499999*c.gx,c.y+.5-.499999*c.gy,-1)-c.low)<1e-6,'lower tread endpoint');
  assert.ok(Math.abs(r.height(c.x+.5+.499999*c.gx,c.y+.5+.499999*c.gy,-1)-c.high)<1e-6,'upper tread endpoint');
  if(i){const p=cells[i-1];assert.equal(Math.abs(p.x-c.x)+Math.abs(p.y-c.y),1);assert.equal(p.high,c.low);assert.equal(r.transition(p.x+.5,p.y+.5,c.x+.5,c.y+.5,-1).allowed,true);assert.equal(r.transition(c.x+.5,c.y+.5,p.x+.5,p.y+.5,-1).allowed,true);}
 }
 const first=cells[0],last=cells.at(-1);
 assert.deepEqual(r.transition(bottom.x+.5,bottom.y+.5,first.x+.5,first.y+.5,-1),{allowed:true,z:-1});
 assert.deepEqual(r.transition(last.x+.5,last.y+.5,top.x+.5,top.y+.5,-1),{allowed:true,z:0});
 assert.deepEqual(r.transition(top.x+.5,top.y+.5,last.x+.5,last.y+.5,0),{allowed:true,z:-1});
 assert.equal(r.transition(first.x+.5,first.y+.5,last.x+.5,last.y+.5,-1).allowed,false,'adjacent parallel flights cannot shortcut');
});
test('runs are parameterized and invalid dimensions never silently clamp',()=>{
 for(const run of [2,5,12]){const p=returnStairPath({x:0,y:0,z:0,run});assert.equal(p.cells.length,2*run+2);assert.equal(p.cells.at(-1).high,1);}
 for(const spec of [{run:1},{run:13},{run:2.5},{axis:'NW'},{x:NaN}])assert.throws(()=>returnStairPath({x:0,y:0,z:0,...spec}));
});

test('outer flight edges reject side entry and unrelated movement stays unhandled',()=>{
 const r=new ReturnStairPath({x:0,y:0,z:0});
 assert.equal(r.transition(2.5,-.5,2.5,.5,0).allowed,false);
 assert.equal(r.transition(2.5,.5,2.5,-.5,0).allowed,false);
 assert.equal(r.transition(7,7,7.1,7,0),null);
 assert.equal(r.height(2.5,.5,1),null);
});
import {World} from '../src/world.js';
for(const handedness of ['left','right'])for(const axis of ['W','N','E','S'])test(`World ${handedness} ${axis} return route ascends and descends with physical footprint`,()=>{
 const spec={x:10,y:10,z:0,axis,handedness},route=returnStairPath(spec),w=new World({cells:[]},{floor:{solidfloor:''}});
 w.setHousePlan({squares:[...route.cells,route.bottom,route.top].map(c=>({x:c.x,y:c.y,z:c.z,tiles:['floor']})),returnStairs:[spec]});
 const a={x:route.bottom.x+.5,y:route.bottom.y+.5,z:0};
 for(const c of [...route.cells,route.top])w.move(a,c.x+.5-a.x,c.y+.5-a.y);
 assert.equal(a.z,1);assert.ok(Math.abs(a.x-route.top.x-.5)<1e-8);assert.ok(Math.abs(a.y-route.top.y-.5)<1e-8);
 for(const c of [...route.cells].reverse().concat(route.bottom))w.move(a,c.x+.5-a.x,c.y+.5-a.y);
 assert.equal(a.z,0);assert.ok(Math.abs(a.x-route.bottom.x-.5)<1e-8);assert.ok(Math.abs(a.y-route.bottom.y-.5)<1e-8);
 const c=route.cells[3];assert.equal(w.apparentZ({x:c.x+.5,y:c.y+.5,z:0}),.5);
 w.setHousePlan({squares:[...route.cells,route.bottom].map(c=>({...c,tiles:['floor']})),returnStairs:[spec]});
 for(const c of [...route.cells,route.top])w.move(a,c.x+.5-a.x,c.y+.5-a.y);
 assert.equal(a.z,0,'missing upper support blocks ascent');
});
