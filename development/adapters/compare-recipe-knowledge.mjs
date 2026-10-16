import fs from 'node:fs';
import assert from 'node:assert/strict';
import {craftRecipeKnown} from '../src/recipe-knowledge.js';
const lines=fs.readFileSync(process.argv[2],'utf8').trim().split('\n');
assert.equal(lines.shift(),'needLearn\tseeUnlearned\tknowAll\tmemory\tvisibleKnown\tactuallyKnown');
const cases=lines.map(line=>{
 const [need,see,all,memory,visible,actual]=line.split('\t');
 const player={knowAllRecipes:all==='true',knownRecipes:memory==='none'?[]:[memory]};
 const recipe={needToBeLearn:need==='true',name:'MakeFixture',translationName:'FixtureDisplay',metaRecipe:'base:fixturegroup'};
 const options={seeNotLearntRecipe:see==='true'};
 const target=[craftRecipeKnown(player,recipe,options),craftRecipeKnown(player,recipe,{...options,actually:true})];
 const source=[visible==='true',actual==='true'];
 assert.deepEqual(target,source,line);
 return {need,see,all,memory,source,target};
});
assert.equal(cases.length,40);
console.log(JSON.stringify({kind:'source-component-comparison',passed:true,cases,limitations:['Fixture CraftRecipe objects, not native registry loading or actual crafting.','No source/target UI acceptance.']},null,2));
