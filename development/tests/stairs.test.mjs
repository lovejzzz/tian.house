import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/world.js';
import {stairType,stairHeight} from '../src/stairs.js';
function fixture(direction){
 const w=new World({cells:[]},{floor:{solidfloor:''},wallN:{WallN:''},wallW:{WallW:''}}),squares=new Map();w.cells.set('0_0',{squares});
 const put=(x,y,z,tiles)=>squares.set(`${x},${y},${z}`,{x,y,z,tiles});
 const along=(i,z,tiles)=>direction==='N'?put(3,i,z,tiles):put(i,3,z,tiles);
 for(let i=1;i<=6;i++)along(i,0,['floor']);
 for(const[i,stage]of[[2,'T'],[3,'M'],[4,'B']]){const t=`stairs${stage}${direction}`;w.properties[t]={[t]:''};along(i,0,[t]);}
 along(1,1,['floor']);return w;
}
test('stair flags use property presence, including empty-string values',()=>{
 assert.equal(stairType({stairsTN:''}),'stairsTN');assert.equal(stairType({type:'stairsTN'}),null);
 assert.equal(stairHeight(null,.5,.5,3),3);
});
for(const direction of['N','W'])test(`${direction} stairs ascend, reverse, and preserve landing collision`,()=>{
 const w=fixture(direction),a=direction==='N'?{x:3.5,y:5.5,z:0}:{x:5.5,y:3.5,z:0};
 const move=n=>w.move(a,direction==='W'?n:0,direction==='N'?n:0);
 move(-4);assert.equal(a.z,1);assert.ok(Math.abs((direction==='N'?a.y:a.x)-1.5)<1e-8);
 move(4);assert.equal(a.z,0);assert.ok(Math.abs((direction==='N'?a.y:a.x)-5.5)<1e-8);
 const landing=direction==='N'?w.square(3,1,1):w.square(1,3,1);landing.tiles=[];
 move(-4);assert.equal(a.z,0,'missing landing must not create a floating floor');
});
test('destroyed stairs no longer support height or elevated traversal',()=>{
 const w=fixture('N');w.change(3,2,0,'stairsTN',{destroyed:true});
 assert.equal(w.stair(3,2,0),null);assert.equal(w.flags(3,2,0).floor,false);
 const a={x:3.5,y:5.5,z:0};w.move(a,0,-4);assert.equal(a.z,0);assert.ok(a.y>3);
});
