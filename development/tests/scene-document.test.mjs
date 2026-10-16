import test from 'node:test';
import assert from 'node:assert/strict';
import rosewood from '../src/rosewood-house.js';
import glasshouse from '../src/showcase-house.js';
import stocked from '../src/glasshouse-stocked-v1.js';
import {migrateHousePlan,compileLegacyScene,restoreMigrationBackup,exportSceneDocument,importSceneDocument,validateSceneDocument} from '../src/scene-document.js';
const bounds=[7988,11390,8020,11425];
for(const plan of [rosewood,glasshouse,stocked])test(`lossless scene migration and portable identity: ${plan.name}`,()=>{
 const before=structuredClone(plan),scene=migrateHousePlan(plan,bounds,{sceneId:'fixture'}),reloaded=importSceneDocument(exportSceneDocument(scene));
 assert.deepEqual(compileLegacyScene(reloaded),before);assert.deepEqual(restoreMigrationBackup(reloaded),before);assert.deepEqual(plan,before);
 assert.deepEqual(reloaded.legacy,scene.legacy);assert.equal(reloaded.id,'fixture');assert.equal(scene.units.metresPerCell,null);
 assert.equal(scene.migration.report.semanticConversion,false);
});
test('unknown tiles, duplicate layers, metadata and container identities survive migration',()=>{
 const plan={version:1,name:'Unknown legacy',custom:{note:'keep'},squares:[{x:8000,y:11400,z:-1,room:9,tiles:['unknown','unknown','shelf'],extra:'keep'}],items:[{type:'Base.WaterBottle',x:8000,y:11400,z:-1,storageTile:'shelf'}]};
 const scene=migrateHousePlan(plan,bounds);assert.deepEqual(compileLegacyScene(scene),plan);
 scene.legacy.metadata.name='Edited';scene.legacy.squares[0].value.extra='changed';
 assert.deepEqual(restoreMigrationBackup(scene),plan);assert.equal(compileLegacyScene(scene).name,'Edited');
});
test('reject corrupt identity, floor references and invented exact scale',()=>{
 const scene=migrateHousePlan(rosewood,bounds);
 for(const mutate of [s=>s.legacy.squares[1].id=s.legacy.squares[0].id,s=>s.legacy.squares[0].value.z=3,s=>s.units.metresPerCell=1,s=>s.revision=-1,s=>s.bounds[2]=s.bounds[0]]){
  const broken=structuredClone(scene);mutate(broken);assert.throws(()=>validateSceneDocument(broken));
 }
});
test('semantic entities cannot silently disappear through the transitional compiler',()=>{
 const scene=migrateHousePlan(rosewood,bounds);scene.walls.push({id:'new-wall'});assert.throws(()=>compileLegacyScene(scene),/not implemented/);
});
