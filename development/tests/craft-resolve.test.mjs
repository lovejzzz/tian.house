import test from 'node:test';import assert from 'node:assert/strict';import {parseCraftItemInput as parse} from '../src/craft-inputs.js';import {resolveCraftItemInput as resolve,catalogCraftRegistry,craftInputContainsType} from '../src/craft-resolve.js';import {craftRelativeScale} from '../src/craft-consumption.js';
const registry=catalogCraftRegistry({'Base.A':{properties:{Tags:'base:hammer'}},'Base.B':{properties:{Tags:'base:hammer',ItemType:'base:drainable'}},'Base.C':{properties:{},components:[{header:'component FluidContainer'}]}});
test('resolution preserves declaration strings, case-sensitive lookup and source positional amounts after missing names',()=>{
 const result=resolve(parse('item 2 [Base.Missing;4:Base.B]'),registry);assert.deepEqual(result.resolvedItems,['Base.B']);assert.equal(craftRelativeScale(result,'Base.B'),2);
 assert.deepEqual(resolve(parse('item 2 [base.a]'),registry).possibleItems,[]);
 const duplicate=resolve(parse('item 2 [A;4:Base.A;6:Base.B]'),registry);assert.deepEqual(duplicate.possibleItems,['Base.A','Base.A','Base.B']);assert.equal(craftRelativeScale(duplicate,'Base.B'),6);
});
test('explicit items precede tag candidates and overlap deduplicates by resolved name',()=>{
 const result=resolve(parse('item 2 [Base.B] tags[base:hammer]'),registry);assert.deepEqual(result.possibleItems,['Base.B','Base.A']);assert.equal(craftInputContainsType(result,'Base.A'),true);assert.equal(craftInputContainsType(result,'base.a'),false);assert.throws(()=>craftInputContainsType(parse('item 1 [Base.A]'),'Base.A'));
 assert.throws(()=>resolve(parse('item 1 tags[base:missing]'),registry));
});
test('wildcard membership cache is separate from relative amount lookup',()=>{
 const input=resolve(parse('item 2 [*]'),registry);assert.deepEqual(input.possibleItems,['Base.A','Base.B','Base.C']);assert.deepEqual(input.resolvedItems,[]);assert.equal(craftRelativeScale(input,'Base.A'),.5);
 assert.deepEqual(resolve(parse('item 2 [*] flags[ItemIsEnergy]'),registry).possibleItems,['Base.B']);assert.deepEqual(resolve(parse('item 2 [*] flags[ItemIsFluid;ItemIsEnergy]'),registry).possibleItems,['Base.C']);
});
test('source tag iteration order can be supplied independently of declaration order',()=>{
 const tagRegistry={...registry,orderedTags:()=>['second','first'],getItemsForTag:tag=>[registry.getItem(tag==='first'?'A':'B')]};const result=resolve(parse('item 1 tags[first;second]'),tagRegistry);assert.deepEqual(result.possibleItems,['Base.B','Base.A']);
});
