import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installOriginalAssets} from '../src/original-assets.js';
import {workshopCatalog} from '../src/workshop-model.js';
import {WorkshopAssetQueries} from '../src/workshop-asset-queries.js';
test('original assets retain stable IDs, geometry and recipe search through optimized pages',()=>{
 const p={},a={regions:{}};installOriginalAssets(p,a);
 const manifest=JSON.parse(readFileSync(new URL('../private-assets/semantic-catalog.json',import.meta.url)));
 assert.equal(manifest.assets.length,Object.keys(a.regions).length);
 for(const e of manifest.assets){assert.deepEqual(a.regions[e.id],e.region);assert.ok(e.recipe);assert.ok(e.family);}
 const q=new WorkshopAssetQueries(workshopCatalog(p,a,{}).entries,p);
 assert.ok(q.search({query:'door original closed'}).assets.some(e=>e.id.includes('service_door')));
 assert.equal(q.describe('tile:tian_cafe_service_door_1').recipe,'cafe');
 assert.ok(q.describe('tile:tian_cafe_service_door_1').semanticTags.includes('closed'));
});
