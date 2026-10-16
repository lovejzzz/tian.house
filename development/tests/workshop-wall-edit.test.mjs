import test from 'node:test';
import assert from 'node:assert/strict';
import {wallFaceHit,straightWallRun,previewWallDrag,finishWallDrag} from '../src/workshop-wall-edit.js';
const wall=(id,x,y,axis='N')=>({id,x,y,axis,levelId:'g'});
const scene={rooms:[{wallIds:['room']}],walls:[wall('a',1,2),wall('b',2,2),wall('c',3,2),wall('turn',4,2,'W'),wall('gap',6,2),wall('room',0,2),{...wall('upper',2,2),levelId:'up'}]};
test('straight wall selection stops at gaps, turns, room boundaries and floors',()=>{
 assert.deepEqual(straightWallRun(scene,'b'),['a','b','c']);assert.deepEqual(straightWallRun(scene,'b',true),['b']);assert.deepEqual(straightWallRun(scene,'room'),[]);assert.deepEqual(straightWallRun(scene,'turn'),['turn']);
});
test('wall faces hit above their floor position at multiple zooms',()=>{
 for(const zoom of [.3,1,2]){const project=(x,y)=>({x:(x-y)*32*zoom,y:(x+y)*16*zoom});const center=project(2.5,2);assert.equal(wallFaceHit(scene,'g',project,{x:center.x,y:center.y-45*zoom},zoom)?.id,'b');assert.equal(wallFaceHit(scene,'g',project,{x:1000,y:1000},zoom),null);}
});
test('drag caches repeated grid destinations and refuses invalid commits',()=>{
 let previews=0,commits=0,canceled=0;const w={drag:{wallIds:['a'],start:{x:2,y:2},last:{x:3,y:2}},status(){},model:{previewStructure(op){previews++;return {ok:op.dx<2,reason:'Collision'};},structure(){commits++;return {ok:true};},cancel(){canceled++;}}};
 previewWallDrag(w,w.drag.last);previewWallDrag(w,w.drag.last);assert.equal(previews,1);finishWallDrag(w);assert.equal(commits,1);
 w.drag.last={x:5,y:2};finishWallDrag(w);assert.equal(commits,1);assert.equal(canceled,1);
});

test('diagonal selection follows its line rather than adjacent parallel paths',()=>{
 for(const axis of ['D+','D-']){const sign=axis==='D+'?1:-1;const s={rooms:[],walls:[wall('a',2,6,axis),wall('b',3,6+sign,axis),wall('c',4,6+2*sign,axis),wall('parallel',3,9,axis)]};assert.deepEqual(straightWallRun(s,'b'),['a','b','c']);}
});
