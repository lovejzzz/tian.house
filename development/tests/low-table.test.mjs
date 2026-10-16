import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {tableVolume} from '../src/table-volume.js';
const recipe=JSON.parse(fs.readFileSync(new URL('../assets/recipes/volume/low-table.json',import.meta.url))),props=JSON.parse(fs.readFileSync(new URL('../private-assets/world/properties.json',import.meta.url)));
test('low table support matches both imported facing surfaces and has solid authored geometry',()=>{
 const g=tableVolume(recipe);for(const tiles of Object.values(recipe.migration))assert.equal(g.support.height,Number(props[tiles[0]].Surface)/32);
 assert.equal(Math.max(...g.parts.flatMap(p=>p.vertices.map(v=>v[2]))),g.support.height);assert.ok(g.parts.every(p=>p.collision.length));assert.ok(recipe.parameters.width<1&&recipe.parameters.depth<1);
});
