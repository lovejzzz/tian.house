import test from 'node:test';import assert from 'node:assert/strict';
import {learnRecipe,completeReadingKnowledge,literatureRecipesKnown} from '../src/recipe-knowledge.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';
import {World} from '../src/world.js';import {Simulation,newState,parseSave} from '../src/simulation.js';
const catalog=useFixtureCatalog();
catalog['Base.RecipeMagazine']={name:'Recipe magazine',properties:{ItemType:'base:literature',LearnedRecipes:'Generator;MakeStoneBlade',BoredomChange:-20,OnCreate:'ItemCodeOnCreate.onCreateRecipeMagazine'}};
function fixture(){const s=newState([8494,11549,0]),sim=new Simulation(new World({cells:[]},{}),s);sim.paused=false;return {sim,s,item:sim.inventory.create('Base.RecipeMagazine')};}
function finish(sim){for(let i=0;i<251;i++)sim.tick(.1);}
test('native isolated recipe-memory cases preserve case, whitespace and exact duplicates',()=>{
 for(const knowAllRecipes of [false,true]){const p={knowAllRecipes};for(const [name,expected] of [['Generator',true],['Generator',false],['generator',true],[' Generator ',true],['base:kitchentools',true],['',true],['__proto__',true]])assert.equal(learnRecipe(p,name),!knowAllRecipes&&expected);assert.equal(p.knownRecipes?.length??0,knowAllRecipes?0:6);}
});
test('actual timed action learns listed recipes only on completion and persists separate read identity',()=>{
 const {sim,s,item}=fixture();assert.equal(item.modData.literatureTitle,item.type);
 sim.readBook(item.id);sim.tick(.1);sim.cancel();assert.equal(s.player.knownRecipes,undefined);assert.equal(s.player.alreadyReadBooks,undefined);
 sim.readBook(item.id);finish(sim);assert.deepEqual(s.player.knownRecipes,['Generator','MakeStoneBlade']);assert.deepEqual(s.player.alreadyReadBooks,[item.type]);
 assert.equal(literatureRecipesKnown(s.player,catalog[item.type].properties),true);
 sim.readBook(item.id);finish(sim);assert.equal(s.player.knownRecipes.length,2);assert.equal(s.player.alreadyReadBooks.length,1);
 const restored=parseSave(sim.serialize());assert.deepEqual(restored.player.knownRecipes,s.player.knownRecipes);assert.deepEqual(restored.player.alreadyReadBooks,[item.type]);
});
test('title cooldown suppresses listed recipe learning but not instance learnedRecipe',()=>{
 const {sim,s,item}=fixture();s.player.readLiterature={[item.type]:0};item.modData.learnedRecipe='Unique Note Recipe';sim.readBook(item.id);finish(sim);
 assert.deepEqual(s.player.knownRecipes,['Unique Note Recipe']);assert.deepEqual(s.player.alreadyReadBooks,[item.type]);assert.equal(literatureRecipesKnown(s.player,catalog[item.type].properties),false);
});
test('known-all differs from tooltip containsAll and read-book history',()=>{
 const p={knowAllRecipes:true},item={type:'Base.RecipeMagazine'};completeReadingKnowledge(p,item,catalog[item.type].properties,true);
 assert.deepEqual(p.alreadyReadBooks,[item.type]);assert.equal(p.knownRecipes,undefined);assert.equal(literatureRecipesKnown(p,catalog[item.type].properties),false);
});
test('malformed learned recipe state is rejected without normalizing valid identity strings',()=>{
 const {sim,s,item}=fixture();const base=JSON.parse(sim.serialize());
 for(const field of ['knownRecipes','alreadyReadBooks'])for(const value of [null,{},'Generator',[5]]){const bad=structuredClone(base);bad.player[field]=value;assert.throws(()=>parseSave(JSON.stringify(bad)));}
 s.player.knownRecipes=['',' Generator ','__proto__'];s.player.alreadyReadBooks=[];item.modData.learnedRecipe='';assert.deepEqual(parseSave(sim.serialize()).player.knownRecipes,s.player.knownRecipes);
 item.modData.learnedRecipe=5;assert.throws(()=>parseSave(sim.serialize()));
});

test('recipe magazine identity follows protected full type, never override fields',()=>{
 const {sim}=fixture();const item=sim.inventory.create('Base.RecipeMagazine','player',{type:'Wrong.Type',modData:{literatureTitle:'wrong'}});
 assert.equal(item.type,'Base.RecipeMagazine');assert.equal(item.modData.literatureTitle,item.type);
});

import {craftRecipeKnown} from '../src/recipe-knowledge.js';
test('craft visibility override never grants actual knowledge; learning a group unlocks its members',()=>{
 const player={},recipe={name:'Fixture',needToBeLearn:true,metaRecipe:'base:group',translationName:'FixtureTranslation'};
 assert.equal(craftRecipeKnown(player,recipe),false);
 assert.equal(craftRecipeKnown(player,recipe,{seeNotLearntRecipe:true}),true);
 assert.equal(craftRecipeKnown(player,recipe,{seeNotLearntRecipe:true,actually:true}),false);
 completeReadingKnowledge(player,{type:'Base.Fixture'},{LearnedRecipes:'base:group'},true);
 assert.equal(craftRecipeKnown(player,recipe,{actually:true}),true);
 assert.deepEqual(player.knownRecipes,['base:group']);
 assert.equal(craftRecipeKnown(player,{...recipe,name:'Other',translationName:'OtherTranslation',metaRecipe:'base:other'},{actually:true}),false);
 assert.equal(craftRecipeKnown({}, {name:'Default',needToBeLearn:false},{actually:true}),true);
});
