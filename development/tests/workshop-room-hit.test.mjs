import test from 'node:test';import assert from 'node:assert/strict';import {roomEdgeHit} from '../src/workshop-room-hit.js';
const rooms=[{id:'a',levelId:'g',rect:[0,0,4,4]},{id:'b',levelId:'g',rect:[4,0,8,4]}];
const screen=(x,y)=>({x:(x-y)*32,y:(x+y)*16});
test('room edges remain pickable from either side of a boundary at different zooms',()=>{for(const zoom of [.5,1,2]){const project=(x,y)=>{const p=screen(x,y);return{x:p.x*zoom,y:p.y*zoom};};const p=project(2,4);for(const delta of [-4,0,4]){const hit=roomEdgeHit(rooms,'g',project,{x:p.x,y:p.y+delta},'a');assert.equal(hit.room.id,'a');assert.equal(hit.side,'south');}}});
test('interior selection does not start resize and shared edges prefer selected room',()=>{assert.equal(roomEdgeHit(rooms,'g',screen,screen(2,2),'a'),null);assert.equal(roomEdgeHit(rooms,'g',screen,screen(4,2),'b').room.id,'b');assert.equal(roomEdgeHit(rooms,'upper',screen,screen(4,2),'a'),null);});
