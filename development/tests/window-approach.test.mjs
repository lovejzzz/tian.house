import test from 'node:test';import assert from 'node:assert/strict';
import {selectWindowApproach} from '../src/window-approach.js';
function fixture(){const squares=new Map();for(let x=2;x<=4;x++)for(let y=2;y<=4;y++)squares.set(`${x}:${y}`,{x,y,z:0,room:null,stand:true});const square=squares.get('3:3');return {squares,options:{square,north:true,actor:{x:3.5,y:3},currentRoom:null,adjacent:(s,dx,dy)=>squares.get(`${s.x+dx}:${s.y+dy}`),roomOf:s=>s.room,canStand:s=>s.stand,canReachDiagonal:()=>true}};}
test('room preference precedes distance and same-distance choice retains opposite-face order',()=>{
 const {squares,options}=fixture();assert.equal(selectWindowApproach(options),squares.get('3:2'));
 options.currentRoom='inside';options.square.room='inside';assert.equal(selectWindowApproach(options),options.square);
 options.square.stand=false;assert.equal(selectWindowApproach(options),squares.get('3:2'));
});
test('diagonals are fallback only and respect blocked walls and unavailable candidates',()=>{
 const {squares,options}=fixture();options.actor={x:2.5,y:2.5};assert.equal(selectWindowApproach(options),squares.get('3:2'));
 options.square.stand=false;squares.get('3:2').stand=false;assert.equal(selectWindowApproach(options),squares.get('2:2'));
 options.canReachDiagonal=()=>false;assert.equal(selectWindowApproach(options),null);
});
