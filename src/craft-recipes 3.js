// Native CraftRecipe.Load scalar metadata, before OnScriptsLoaded resolution.
// Inputs, callbacks, workstation rules and output mappers remain declarations.
function javaInt(value){
 if(!/^[+-]?\d+$/.test(value))throw Error(`Invalid recipe integer: ${value}`);
 const n=Number(value);if(!Number.isInteger(n)||n<-2147483648||n>2147483647)throw Error(`Recipe integer overflow: ${value}`);return n;
}
function javaSplit(value){const parts=value.split(';');while(parts.at(-1)==='')parts.pop();return parts;}
export function craftRecipeMetadata(declaration,{translate=name=>name}={}){
 if(declaration.kind!=='named')throw Error('Entity recipe identity must be resolved through its owning entity');
 const header=declaration.path.at(-1);if(!header?.startsWith('craftRecipe '))throw Error('Missing craft recipe name');
 const name=header.slice('craftRecipe '.length);
 const recipe={name,translationName:translate(name),needToBeLearn:false,time:50,metaRecipe:null,category:'Miscellaneous',tags:[],allowBatchCraft:true,canWalk:false};
 // Keep ordered values: duplicate Tags appends, while scalar keys overwrite.
 for(const row of declaration.values){
  const equals=row.indexOf('=');if(equals<0)continue;
  const key=row.slice(0,equals).trim().toLowerCase(),value=row.slice(equals+1).trim();if(!key||!value)continue;
  switch(key){
   case 'time':recipe.time=javaInt(value);break;
   case 'needtobelearn':recipe.needToBeLearn=value.toLowerCase()==='true';break;
   case 'metarecipe':recipe.metaRecipe=value;break;
   case 'category':recipe.category=value;break;
   case 'tags':recipe.tags.push(...javaSplit(value).map(t=>t.trim()));break;
   case 'allowbatchcraft':recipe.allowBatchCraft=value.toLowerCase()==='true';break;
   case 'canwalk':recipe.canWalk=value.toLowerCase()==='true';break;
  }
 }
 return recipe;
}
