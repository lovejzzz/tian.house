import test from 'node:test';
import assert from 'node:assert/strict';
import {createPianoTransport} from '../src/piano-transport.js';
const fixture=()=>({currentTime:10,calls:[],play(...args){this.calls.push(args);},stop(){this.stopped=true;}});
const events=[{at:0,notes:[48,60]},{at:.25,notes:[52,64]},{at:.5,notes:[53,65]}];
test('score uses audio clock and schedules chords at identical timestamps',()=>{
 const audio=fixture(),t=createPianoTransport(audio,events);t.pump();
 assert.deepEqual(audio.calls,[[48,.25,10.05],[60,.25,10.05]]);
 audio.currentTime=10.15;t.pump();assert.equal(audio.calls[2][2],10.3);
 assert.deepEqual(t.snapshot().notes,[48,60]);
 audio.currentTime=10.35;assert.deepEqual(t.snapshot().notes,[52,64]);
 t.pump();assert.equal(audio.calls.length,6);t.pump();assert.equal(audio.calls.length,6);
});
test('late render skips stale notes instead of stretching or bursting the score',()=>{
 const audio=fixture(),t=createPianoTransport(audio,events);audio.currentTime=10.54;t.pump();
 assert.deepEqual(audio.calls.map(c=>c[0]),[53,65]);
 audio.currentTime=12;assert.equal(t.snapshot().done,true);t.stop();t.pump();assert.equal(audio.calls.length,2);assert.ok(audio.stopped);
});
