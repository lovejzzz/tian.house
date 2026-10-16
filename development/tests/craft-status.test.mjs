import test from 'node:test';import assert from 'node:assert/strict';
import {parseCraftItemInput as parse} from '../src/craft-inputs.js';import {craftRoutineStatus as routine,craftClothingStatus as clothing,craftDamageStatus as damage,craftCookingStatus as cooking} from '../src/craft-status.js';
const input=(flags='',mode='')=>parse(`item 1 [Base.Fixture] ${mode} ${flags?`flags[${flags}]`:''}`);
test('retained favorites remain eligible but exclusions and unrelated state failures still apply',()=>{
 const keep=input('','mode:keep');assert.equal(routine(keep,{favorite:true}),true);assert.equal(routine(keep,{favorite:true,excluded:true}),false);assert.equal(routine(keep,{favorite:true,broken:true}),false);assert.equal(routine(input(),{favorite:true}),false);assert.equal(routine(input('AllowFavorite'),{favorite:true}),true);
});
test('food freshness and freezing independently require allowances; ordinary objects ignore food-only flags',()=>{
 const food={food:true,rotten:true,frozen:true};assert.equal(routine(input('AllowRottenItem'),food),false);assert.equal(routine(input('AllowFrozenItem'),food),false);assert.equal(routine(input('AllowFrozenItem;AllowRottenItem'),food),true);assert.equal(routine(input(),{...food,food:false}),true);
});
test('sealed status preserves localized-name matching, null-name rejection and IsSealed precedence',()=>{
 assert.throws(()=>routine(input('IsSealed'),{name:'Sealed'}));assert.equal(routine(input('IsSealed'),{name:'瓶 (密封)',sealedLabel:'密封'}),true);assert.equal(routine(input('IsNotSealed'),{name:null,sealedLabel:'密封'}),false);assert.equal(routine(input('IsSealed;IsNotSealed'),{name:'密封',sealedLabel:'密封'}),true);
});
test('clothing status distinguishes equipped from worn and bypasses flags for corpse-contained items',()=>{
 assert.equal(clothing(input('IsNotWorn'),{worn:false,equipped:true}),false);assert.equal(clothing(input('IsWorn'),{worn:false,equipped:true}),false);assert.equal(clothing(input('IsWorn;IsNotWorn'),{inCorpse:true}),true);
});
test('opposite damage flags reject both states; cooking flags apply only to cookable food',()=>{
 for(const damaged of [false,true])assert.equal(damage(input('IsDamaged;IsUndamaged'),{damaged}),false);
 for(const uncooked of [false,true])assert.equal(cooking(input('IsCookedFoodItem;IsUncookedFoodItem'),{food:true,cookable:true,uncooked}),false);
 assert.equal(cooking(input('IsCookedFoodItem'),{food:true,cookable:false,uncooked:true}),true);assert.equal(cooking(input('IsUncookedFoodItem'),{food:false,cookable:true}),true);
 assert.throws(()=>cooking(input('IsWholeFoodItem'),{food:true}));assert.equal(cooking(input('IsWholeFoodItem'),{food:true,wholeFood:false}),false);
});
