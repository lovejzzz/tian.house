// Exact recipe identifiers are independent of item IDs, titles and translations.
// CraftRecipe overload only. Legacy Recipe/string overloads have different rules.
export function craftRecipeKnown(player,recipe,{seeNotLearntRecipe=false,actually=false}={}){
 if((!actually&&seeNotLearntRecipe)||player.knowAllRecipes)return true;
 if(!recipe.needToBeLearn)return true;
 return [recipe.name,recipe.metaRecipe,recipe.translationName].some(id=>typeof id==='string'&&player.knownRecipes?.includes(id));
}
export function literatureRecipes(properties){
 return String(properties.LearnedRecipes??'').split(';').map(s=>s.trim()).filter(Boolean);
}
export function learnRecipe(player,identifier){
 if(player.knowAllRecipes||player.knownRecipes?.includes(identifier))return false;
 (player.knownRecipes??=[]).push(identifier);return true;
}
export function initializeRecipeMagazine(item,properties){
 if(properties.OnCreate!=='ItemCodeOnCreate.onCreateRecipeMagazine')return;
 item.modData??={};item.modData.literatureTitle=item.type;
}
export function completeReadingKnowledge(player,item,properties,learnListed){
 const recipes=literatureRecipes(properties);
 if(recipes.length){
  player.alreadyReadBooks??=[];
  if(!player.alreadyReadBooks.includes(item.type))player.alreadyReadBooks.push(item.type);
  if(learnListed)for(const recipe of recipes)learnRecipe(player,recipe);
 }
 // Native action learns an instance recipe even when title cooldown suppresses
 // ReadLiterature, and independently of the listed recipe block.
 if(item.modData?.learnedRecipe!==undefined)learnRecipe(player,item.modData.learnedRecipe);
}
export function literatureRecipesKnown(player,properties){
 const recipes=literatureRecipes(properties);
 // Native tooltip uses containsAll, not the know-all cheat or read-book set.
 return recipes.length>0&&recipes.every(r=>player.knownRecipes?.includes(r));
}
