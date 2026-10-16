import test from 'node:test';import assert from 'node:assert/strict';import * as fs from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
import {buildVolumeAssets} from '../tools/build_volume_assets.mjs';import {tableVolume} from '../src/table-volume.js';import {fetchVolumeFurniture} from '../src/scene-furniture-volumes.js';
const original=new URL('../',import.meta.url);
async function fixture(t){const path=await fs.mkdtemp(join(tmpdir(),'tian-volume-')),root=pathToFileURL(path+'/');t.after(()=>fs.rm(path,{recursive:true,force:true}));for(const file of ['assets/recipes/volume/table.json','src/table-volume.js','src/source-floor-texture.js','src/source-patch-texture.js','src/volume-material-texture.js','src/scene-slab-volumes.js','src/convex-solid.js']){const target=new URL(file,root);await fs.mkdir(new URL('.',target),{recursive:true});await fs.copyFile(new URL(file,original),target);}return root;}
const fetchFile=async url=>new Response(await fs.readFile(url));
test('late generation and publication failures preserve the previous complete manifest',async t=>{
 const root=await fixture(t),generators=[['table',tableVolume]],manifestURL=new URL('assets/volume/build-report.json',root);await buildVolumeAssets({root,generators});const before=await fs.readFile(manifestURL,'utf8');
 const recipeURL=new URL('assets/recipes/volume/table.json',root),recipe=JSON.parse(await fs.readFile(recipeURL));recipe.parameters.width+=.1;await fs.writeFile(recipeURL,JSON.stringify(recipe));
 await assert.rejects(buildVolumeAssets({root,generators:[...generators,['table',()=>{throw Error('late generator failure');}]]}),/late generator/);assert.equal(await fs.readFile(manifestURL,'utf8'),before);
 await assert.rejects(buildVolumeAssets({root,generators,io:{...fs,rename:async()=>{throw Error('publication denied');}}}),/publication denied/);assert.equal(await fs.readFile(manifestURL,'utf8'),before);
 const base=new URL('assets/volume/',root),old=await fetchVolumeFurniture(base,fetchFile);assert.equal(old[0].recipe.parameters.width,recipe.parameters.width-.1);
 await buildVolumeAssets({root,generators});const after=await fs.readFile(manifestURL,'utf8');assert.notEqual(after,before);assert.equal((await fetchVolumeFurniture(base,fetchFile))[0].recipe.parameters.width,recipe.parameters.width);
 // A tab holding the old snapshot still loads its unchanged generation after publication.
 const snapshotFetcher=url=>url.href===manifestURL.href?Promise.resolve(new Response(before)):fetchFile(url);assert.deepEqual(await fetchVolumeFurniture(base,snapshotFetcher),old);
 assert.ok(!(await fs.readdir(base)).some(name=>name.startsWith('.build-report-')));
});
test('runtime rejects corrupted bytes and invalid manifest paths before accepting geometry',async()=>{
 const base=new URL('assets/volume/',original),manifest=JSON.parse(await fs.readFile(new URL('build-report.json',base))),first=manifest.assets[0];
 await assert.rejects(fetchVolumeFurniture(base,url=>url.pathname.endsWith(first.delivery)?Promise.resolve(new Response('corrupt')):fetchFile(url)),/integrity/);
 manifest.assets[0].delivery='../escape.json.gz';let calls=0;await assert.rejects(fetchVolumeFurniture(base,async()=>{calls++;return new Response(JSON.stringify(manifest));}),/manifest entry/);assert.equal(calls,1);
});
