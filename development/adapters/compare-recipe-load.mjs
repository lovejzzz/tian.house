import fs from 'node:fs';import assert from 'node:assert/strict';
import {craftRecipeMetadata} from '../src/craft-recipes.js';
const declarations=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).declarations;
const native=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const keys={getName:'name',getTranslationName:'translationName',needToBeLearn:'needToBeLearn',getTime:'time',getMetaRecipe:'metaRecipe',getCategory:'category',getTags:'tags',isAllowBatchCraft:'allowBatchCraft',isCanWalk:'canWalk'};
let compared=0;const failures=[],unloaded=[];
for(const row of native){
 const declaration=declarations.find(d=>row.file==='media/scripts/'+d.source&&JSON.stringify(d.path)===JSON.stringify(row.path));assert.ok(declaration,row.file+row.path);
 if(!row.loaded){unloaded.push({path:row.path,error:row.error});continue;}
 const target=craftRecipeMetadata(declaration),source=Object.fromEntries(Object.entries(keys).map(([nativeKey,key])=>[key,row.recipe[nativeKey]]));
 try{assert.deepEqual(target,source);}catch(error){failures.push({path:row.path,target,source});}
 compared++;
}
console.log(JSON.stringify({kind:'native-load-component-comparison',passed:failures.length===0,compared,fields:Object.values(keys),failures,unloaded,limitations:['Native Load only; no OnScriptsLoaded or runtime item registry.','No translated language table initialized in native probe.','Entity components, skill rules, inputs, outputs and crafting actions not covered by this metadata comparison.']},null,2));
assert.equal(compared,966);assert.equal(failures.length,0);
