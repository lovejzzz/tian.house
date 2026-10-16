import test from 'node:test';import assert from 'node:assert/strict';
import {migrateResidentContainers} from '../src/resident-container-migration.js';
test('moving and rotating a stocked cabinet preserves item identity, depletion and stock history',()=>{
 const old={sceneDocument:{id:'house',levels:[{id:'g',index:0}],objects:[{id:'bar',levelId:'g',x:1,y:4,parts:[{dx:0,dy:0,tile:'S'}]}]},items:[{type:'Water',x:1,y:4,z:0,storageTile:'S'}]},next=structuredClone(old);
 Object.assign(next.sceneDocument.objects[0],{y:3,parts:[{dx:0,dy:0,tile:'E'}]});
 const before='world:1,4,0:S',after='world:1,3,0:E',inventory={containers:{[before]:{id:before,items:['bottle']}},items:{bottle:{id:'bottle',container:before,workshopOrigin:before,fluid:{amount:250}}}};
 const result=migrateResidentContainers(inventory,old,next,{S:{container:'counter'},E:{container:'counter'}});
 assert.equal(inventory.containers[before],undefined);assert.deepEqual(inventory.containers[after].items,['bottle']);assert.equal(inventory.items.bottle.container,after);assert.equal(inventory.items.bottle.fluid.amount,250);assert.equal(result.stock[0].y,3);assert.equal(result.stock[0].storageTile,'E');
});
