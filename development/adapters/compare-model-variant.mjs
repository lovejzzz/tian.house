import fs from 'node:fs';
import assert from 'node:assert/strict';
import {initializeModelIndex} from '../src/item-model-state.js';
const rows=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').slice(1);
const results=rows.map(row=>{
 const [initial,weapon,staticCount,world,expected,expectedDraws]=row.split(',').map(Number);
 const list=n=>n<0?null:Array.from({length:n},(_,i)=>'Model'+i);
 const item={modelIndex:initial,weaponSpritesByIndex:list(weapon),staticModelsByIndex:list(staticCount),worldStaticModelsByIndex:list(world)};
 let draws=0;initializeModelIndex(item,{ItemType:'base:weapon'},bound=>{if(bound<=0)return 0;draws++;return bound-1;});
 assert.equal(item.modelIndex,expected);assert.equal(draws,expectedDraws);
 return {initial,weapon,staticCount,world,index:item.modelIndex,draws};
});
console.log(JSON.stringify({passed:true,scope:'installed synchWithVisual index selection only; excludes full Item.Instance and textures',cases:results},null,2));
