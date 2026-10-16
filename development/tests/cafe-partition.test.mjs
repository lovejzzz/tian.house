import test from 'node:test';import assert from 'node:assert/strict';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';import {WorkshopCommands} from '../src/workshop-commands.js';
import {installCafeAssets} from '../src/cafe-assets.js';import {installMasonryAssets} from '../src/masonry-assets.js';
import {workshopCatalog} from '../src/workshop-model.js';import {collapseOrientations,orientationFamilies} from '../src/catalog-variants.js';
import {World} from '../src/world.js';import {Simulation,newState} from '../src/simulation.js';import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
const props={floor:{solidfloor:''}},atlas={regions:{}};installCafeAssets(props,atlas);installMasonryAssets(props,atlas);const catalog=workshopCatalog(props,atlas,{}).entries;
test('service doors have two closed orientations, hidden open leaves, and usable matching surrounds',()=>{
 const doors=catalog.filter(e=>e.source.startsWith('tian_cafe_service_door'));assert.equal(doors.length,2);assert.equal(collapseOrientations(doors,orientationFamilies(doors,props)).length,1);
 for(const [axis,n]of [['N',1],['W',0]]){assert.ok('door'+axis in props['tian_cafe_service_door_'+n]);assert.ok(atlas.regions['tian_cafe_service_door_'+(n+2)]);assert.equal(props['tian_cafe_service_door_'+(n+2)].TianDerivedAsset,'true');}
});
test('partition, door and wall curtain remain editable, traversable only through open door, and undo together',()=>{
 const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props,catalog);m.begin('Room');assert.equal(m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[2,2,12,12],floorTile:'floor',wallN:'tian_masonry_ivory_1',wallW:'tian_masonry_ivory_0'}}).ok,true);m.commit();const before=m.export();
 const c=new WorkshopCommands(m,new Map(catalog.map(e=>[e.id,e]))),result=c.commit({requestId:'partition',baseRevision:m.revision,operations:[{type:'walls.draw',pathId:'p',levelId:'level:0',points:[[4,5],[9,5]],wallN:'tian_masonry_umber_1',wallW:'tian_masonry_umber_0'},{type:'opening.add',opening:{id:'d',hostWallId:'p:1',kind:'door',tile:'tian_cafe_service_door_1'}},{type:'place',assetId:'tile:tian_cafe_wall_curtain_N_0',x:8,y:5,z:0}]});assert.equal(result.ok,true,result.error);
 const world=new World({playableBounds:m.bounds},props),state=newState([5.5,5.5,0]);state.housePlan=m.export();const sim=new Simulation(world,state,null,{spawnZombies:false});assert.equal(world.canStep(5.5,5.1,5.5,4.9,0),false);const door=world.interactions(state.player).find(o=>o.type==='door');assert.ok(door);sim.interact(door);assert.equal(world.canStep(5.5,5.1,5.5,4.9,0),true);assert.equal(world.canStep(8.5,5.1,8.5,4.9,0),false);
 const exported=m.export();assert.deepEqual(new StructuredWorkshopModel(exported,m.bounds,props,catalog).export(),exported);m.undo();assert.deepEqual(m.export(),before);m.redo();assert.deepEqual(m.export(),exported);
});
