import fs from 'node:fs';import assert from 'node:assert/strict';import {parseCraftItemInput} from '../src/craft-inputs.js';
const rows=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),failures=[];let count=0;
for(const row of rows.filter(r=>r.loaded))for(const source of row.inputs){
 count++;try{
  const input=parseCraftItemInput(source.getOriginalLine);
  assert.deepEqual({getOriginalLine:input.originalLine,getResourceType:input.resourceType,getAmount:input.amount,getMaxAmount:input.maxAmount,isKeep:input.mode==='Keep',isDestroy:input.mode==='Destroy',isItemCount:input.flags.includes('ItemCount'),getItems:input.items,getItemTags:[...input.itemTags].sort(),isProp1:input.flags.includes('Prop1'),isProp2:input.flags.includes('Prop2')},{...source,getItemTags:[...source.getItemTags].sort()});
 }catch(error){failures.push({recipe:row.path,line:source.getOriginalLine,error:error.message});}
}
console.log(JSON.stringify({passed:failures.length===0,count,failures,scope:'Top-level item input scalar fields only. Excludes resource child inputs, consumption, mappers and per-item amount getters.'},null,2));assert.equal(count,3352);assert.equal(failures.length,0);
