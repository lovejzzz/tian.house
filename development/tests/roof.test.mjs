import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/world.js';
function world(rows){const w=new World({cells:[]},{floor:{solidfloor:''},awning:{BlockRain:''},decor:{}}),squares=new Map();for(const [x,y,z,room,tiles]of rows)squares.set(`${x},${y},${z}`,{x,y,z,room,tiles});w.cells.set('0_0',{squares});return w;}
test('roomless squares beneath rain-blocking upper floors are interior, including basements',()=>{
 const w=world([[3,3,-1,-1,[]],[3,3,0,-1,['floor']],[3,3,1,-1,[]],[3,3,2,-1,['awning']],[4,3,0,-1,['floor']]]);
 for(const z of [-1,0,1])assert.equal(w.isExterior(3,3,z),false);
 assert.equal(w.isExterior(3,3,2),true);assert.equal(w.isExterior(4,3,0),true);
 w.change(3,3,2,'awning',{destroyed:true});assert.equal(w.isExterior(3,3,0),true);assert.equal(w.isExterior(3,3,-1),true);
 w.change(3,3,2,'awning',{destroyed:false});assert.equal(w.isExterior(3,3,0),false);
});
test('rooms, decorated roofs and own-level floors retain distinct semantics',()=>{
 const w=world([[3,3,0,0,['floor']],[4,3,0,-1,['floor']],[4,3,1,-1,['decor']]]);
 assert.equal(w.isExterior(3,3,0),false);assert.equal(w.isExterior(4,3,0),true);assert.equal(w.isExterior(8,8,0),true);
 assert.equal(w.hasRainBlockingTile(3,3,0),true);assert.equal(w.hasRainBlockingTile(4,3,1),false);
});
