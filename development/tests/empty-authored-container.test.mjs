import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/world.js';
import {Simulation,newState} from '../src/simulation.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';
useFixtureCatalog();
test('authored empty furniture does not spawn loot and preserves stored items on reopen',()=>{
 const sim=new Simulation(new World({spawn:[4,4,0],playableBounds:[0,0,10,10]},{}),newState([4,4,0]));
 const bar={id:'test-bar',name:'Breakfast bar',props:{container:'counter',ContainerCapacity:'30',TianEmptyContainer:'true'}};
 const id=sim.container(bar);assert.deepEqual(sim.inventory.list(id),[]);
 const bat=sim.inventory.list('player').find(i=>i.type==='Base.BaseballBat');
 assert.ok(bat);assert.equal(sim.inventory.transfer(bat.id,id).ok,true);
 assert.equal(sim.container(bar),id);assert.deepEqual(sim.inventory.list(id).map(i=>i.id),[bat.id]);
});
