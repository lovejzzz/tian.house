import test from 'node:test';import assert from 'node:assert/strict';
import {mealFraction,portionLabel,applianceTemperatureChoices} from '../src/meal-controls.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';useFixtureCatalog();
test('serving choices consume a share of the remaining real food portion',()=>{
 const item={type:'Base.Cereal',portion:.5};assert.equal(mealFraction(item,.5),.25);assert.equal(mealFraction(item,.25),.125);assert.equal(mealFraction(item,1),.5);assert.equal(portionLabel(item),'50% remaining');
 assert.equal(mealFraction(item,2),null);assert.equal(mealFraction({...item,portion:0},1),null);assert.equal(portionLabel({...item,portion:1}),'');
});
test('temperature choices preserve existing custom saved targets',()=>{
 assert.deepEqual(applianceTemperatureChoices(175),[100,160,175,180,200,220,250]);
 assert.deepEqual(applianceTemperatureChoices(200),[100,160,180,200,220,250]);
 assert.ok(!applianceTemperatureChoices(NaN).includes(NaN));
});
