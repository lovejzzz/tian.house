import test from 'node:test';import assert from 'node:assert/strict';
import {windowOpenOutcome,windowOpenAttempt,advanceWindowOpening,windowAttemptExertion} from '../src/window-toggle.js';
import {World} from '../src/world.js';import {Simulation,newState} from '../src/simulation.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
function rolls(values){let i=0;return {next:n=>{assert.equal(n,100);assert.ok(i<values.length,'unexpected RNG call');return values[i++];},count:()=>i};}
test('locked interior succeeds without RNG; permanent lock always struggles then fails',()=>{
 assert.equal(windowOpenOutcome({locked:true},false),'success');assert.equal(windowOpenOutcome({locked:true},true),'struggle');assert.equal(windowOpenOutcome({permaLocked:true},false),'struggle');
 const r=rolls([]);assert.equal(windowOpenAttempt({locked:true,exterior:false},r.next).outcome,'success');assert.equal(windowOpenAttempt({permaLocked:true},r.next).outcome,'fail');assert.equal(r.count(),0);
});
test('source strength fallthrough and inclusive final random bound are retained',()=>{
 let r=rolls([10,20,10,6,4,1]);assert.equal(windowOpenAttempt({locked:true,exterior:true,strength:8},r.next).outcome,'success');assert.equal(r.count(),6);
 r=rolls([10,20,10,6,4,2]);assert.equal(windowOpenAttempt({locked:true,exterior:true,strength:8},r.next).outcome,'struggle');
 r=rolls([5,99,99,99]);assert.equal(windowOpenAttempt({locked:true,exterior:true,strength:5,burglar:false},r.next).breakLock,true);assert.equal(r.count(),1);
 r=rolls([5,6,4,2]);assert.equal(windowOpenAttempt({locked:true,exterior:true,strength:5,burglar:true},r.next).outcome,'struggle');assert.equal(r.count(),4);
});
test('struggle repeats, exerts per attempt and commits only in subsequent success animation',()=>{
 const m={stage:'start',stageElapsed:0,elapsed:0,attempts:0,committed:false};let commits=0,exertion=0;const r=rolls([99,99,99,99,99,0]);
 const ctx={state:()=>({locked:true}),exterior:()=>true,strength:5,fitness:5,nextInt:r.next},hooks={commit:()=>commits++,breakLock:()=>assert.fail(),exert:n=>exertion+=n};
 advanceWindowOpening(m,.42,ctx,hooks);assert.equal(m.stage,'struggle');advanceWindowOpening(m,.84,ctx,hooks);assert.equal(m.stage,'struggle');assert.equal(m.attempts,1);assert.equal(m.previousStage,null);
 advanceWindowOpening(m,.84,ctx,hooks);assert.equal(m.stage,'success');assert.equal(m.attempts,2);assert.equal(commits,0);assert.equal(exertion,.012);
 advanceWindowOpening(m,.61,ctx,hooks);assert.equal(commits,1);assert.equal(m.finished,undefined);advanceWindowOpening(m,1,ctx,hooks);assert.equal(m.finished,true);assert.equal(commits,1);
 assert.equal(windowAttemptExertion(10),.002);assert.equal(windowAttemptExertion(-1),.012);
});
function fixture(room){const w=new World({cells:[]},{floor:{solidfloor:''},window:{windowN:''}}),squares=new Map();for(let x=1;x<5;x++)for(let y=1;y<5;y++)squares.set(`${x},${y},0`,{x,y,z:0,room,tiles:['floor']});squares.get('3,3,0').tiles.push('window');w.cells.set('0_0',{squares});const s=newState([3.5,3.5,0]);s.spawned={'0,0,0':true};const sim=new Simulation(w,s),o=w.interactions(s.player).find(o=>o.type==='window');return {w,s,sim,o};}
test('actual simulation interior unlocks, exterior break persists and failure animation finishes',()=>{
 let {w,s,sim,o}=fixture(0);w.change(3,3,0,'window',{locked:true});sim.interact(o);for(let i=0;i<20;i++)sim.tick(.1);assert.equal(w.state(3,3,0,'window').open,true);assert.equal(w.state(3,3,0,'window').locked,false);
 ({w,s,sim,o}=fixture(-1));w.change(3,3,0,'window',{locked:true});sim.interact(o);sim.action.openContext.nextInt=()=>0;for(let i=0;i<13;i++)sim.tick(.1);assert.equal(s.player.windowToggle.stage,'fail');assert.equal(w.state(3,3,0,'window').permaLocked,true);assert.notEqual(w.state(3,3,0,'window').open,true);for(let i=0;i<10;i++)sim.tick(.1);assert.equal(sim.action,null);assert.equal(s.player.windowToggle,undefined);
 sim.interact(o);assert.ok(sim.action);sim.cancel();assert.equal(w.state(3,3,0,'window').permaLocked,true);
});
