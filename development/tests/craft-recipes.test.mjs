import test from 'node:test';import assert from 'node:assert/strict';
import {craftRecipeMetadata} from '../src/craft-recipes.js';
const decl=values=>({kind:'named',path:['module Base','craftRecipe Fixture'],values});
test('recipe scalar defaults, exact identity and ordered repeated tag declarations',()=>{
 const r=craftRecipeMetadata(decl(['TIME = 80','time = 0','NeedToBeLearn = TRUE','Tags = First; Second;','Tags = Third;;Fourth;','CanWalk = true','AllowBatchCraft = false','MetaRecipe = base:GROUP']),{translate:n=>'Localized '+n});
 assert.deepEqual(r,{name:'Fixture',translationName:'Localized Fixture',needToBeLearn:true,time:0,metaRecipe:'base:GROUP',category:'Miscellaneous',tags:['First','Second','Third','','Fourth'],allowBatchCraft:false,canWalk:true});
 const defaults=craftRecipeMetadata(decl(['time = ','needtobelearn = ']));assert.equal(defaults.time,50);assert.equal(defaults.needToBeLearn,false);
});
test('integer parsing does not accept partial values, decimals or overflow',()=>{
 for(const v of ['50oops','1.5','2147483648','-2147483649'])assert.throws(()=>craftRecipeMetadata(decl(['time = '+v])));
 assert.equal(craftRecipeMetadata(decl(['time = -1'])).time,-1);
 assert.throws(()=>craftRecipeMetadata({kind:'entity-component',path:['entity Bench'],values:[]}));
});
