import {craftRecipeMetadata} from './craft-recipes.js';
import {parseCraftItemInput} from './craft-inputs.js';
import {Inventory,definition,resolveInventoryCraftInput} from './inventory.js';
import {craftItemUses,craftRelativeScale,consumeCraftInputs} from './craft-consumption.js';
import {craftRoutineStatus,craftDamageStatus,craftCookingStatus} from './craft-status.js';
import {craftRecipeKnown} from './recipe-knowledge.js';
import {isRecipeExcluded} from './recipe-inputs.js';
let recipes=[];
export const craftingRecipes=()=>recipes;
export function loadCraftingCatalog(catalog){
 recipes=catalog.declarations.filter(d=>d.kind==='named').map(d=>{
  const metadata=craftRecipeMetadata(d),r={...metadata,id:d.path.join('/'),properties:d.properties,inputs:[],outputs:[],mappers:{},pending:[]};
  for(const child of d.children){
   if(child.header==='inputs')for(const line of child.values){try{r.inputs.push(resolveInventoryCraftInput(parseCraftItemInput(line)));}catch{r.pending.push('Fluid or special ingredient');}}
   if(child.header==='outputs')for(const line of child.values){const m=/^item (\d+) ([\w.:]+)$/.exec(line);if(m)r.outputs.push({count:+m[1],type:m[2]});else r.pending.push('Special output');}
   if(child.header.startsWith('itemMapper '))r.mappers[child.header.slice(11)]=child.values.map(line=>line.split('=').map(s=>s.trim()));
  }
  if(d.properties.OnCreate||d.properties.OnTest)r.pending.push('Special crafting effect');
  if(!r.tags.includes('InHandCraft'))r.pending.push('Workbench crafting');
  if(!r.outputs.length)r.pending.push('Output is not implemented yet');
  r.pending=[...new Set(r.pending)];return r;
 });return recipes;
}
const requirements=value=>String(value??'').split(';').filter(Boolean).map(s=>{const [id,n]=s.split(':');return [id.toLowerCase(),+n];});
export function planCraft(recipe,inventory,player){
 if(recipe.pending.length)return {ok:false,reason:recipe.pending.join(', ')+' — not implemented yet'};
 const level=id=>player.skillLevels?.[id]??0;
 const any=requirements(recipe.properties.AutoLearnAny),all=requirements(recipe.properties.AutoLearnAll);
 const auto=any.some(([id,n])=>level(id)>=n)||(all.length>0&&all.every(([id,n])=>level(id)>=n));
 if(!auto&&!craftRecipeKnown(player,recipe,{actually:true}))return {ok:false,reason:'You have not learned this recipe'};
 const missingSkill=requirements(recipe.properties.SkillRequired).find(([id,n])=>level(id)<n);if(missingSkill)return {ok:false,reason:`Requires ${missingSkill[0]} level ${missingSkill[1]}`};
 const inv=new Inventory(structuredClone(inventory.state)),bindings=[],selected=[];
 try{
  for(const input of recipe.inputs){
   let need=Math.trunc(input.amount);const ids=[];
   for(const item of Object.values(inv.state.items)){
    if(inv.root(item.container)!=='player'||!input.possibleItems.includes(item.type)||need<=0)continue;
    const p=definition(item.type).properties,food=p.ItemType==='base:food',state={food,favorite:item.favorite,broken:!!item.broken||item.condition<=0,excluded:isRecipeExcluded(item,player),rotten:food&&item.ageHours/24>=Number(p.DaysTotallyRotten??1e9),frozen:!!item.frozen,damaged:item.condition<Number(p.ConditionMax??10),cookable:!!p.IsCookable,uncooked:!item.cooked&&!item.burnt,wholeFood:item.portion===1};
    if(!craftRoutineStatus(input,state)||!craftDamageStatus(input,state)||!craftCookingStatus(input,state))continue;
    const scale=craftRelativeScale(input,item.type),uses=craftItemUses(item,p);if(uses<=0)continue;
    ids.push(item.id);selected.push(structuredClone(item));need-=(input.flags.includes('ItemCount')?1:uses)/scale;
   }
   if(need>0)return {ok:false,reason:'Missing materials',missing:input};
   const binding={input,itemIds:ids};bindings.push(binding);const consumed=consumeCraftInputs(inv,[binding],{onKeepInput:()=>{}});if(consumed.remaining.some(n=>n>.00001))return {ok:false,reason:'Not enough usable material'};
  }
  const outputs=recipe.outputs.map(output=>{
   let type=output.type;if(type.startsWith('mapper:')){const mapper=type.slice(7),selectedTypes=new Set(selected.filter(item=>bindings.some(b=>b.input.mappers.includes(mapper)&&b.itemIds.includes(item.id))).map(i=>i.type));type=recipe.mappers[mapper]?.find(([,from])=>from.split(';').some(t=>selectedTypes.has(t)))?.[0];}
   if(!type)throw Error('Output mapping is not implemented yet');definition(type);return {...output,type};
  });
  return {ok:true,bindings,outputs,selected};
 }catch(e){return {ok:false,reason:e.message};}
}
export function commitCraft(recipe,inventory,player){
 const plan=planCraft(recipe,inventory,player);if(!plan.ok)return plan;
 const draft=new Inventory(structuredClone(inventory.state)),created=[];
 try{
  for(const binding of plan.bindings)consumeCraftInputs(draft,[binding],{onKeepInput:()=>{}});
  for(const output of plan.outputs)for(let i=0;i<output.count;i++)created.push(draft.create(output.type,'player',{favorite:plan.bindings.some(b=>b.input.flags.includes('InheritFavorite')&&b.itemIds.some(id=>inventory.state.items[id]?.favorite))}));
 }catch(e){return {ok:false,reason:e.message};}
 // Commit together so a failed output factory cannot destroy ingredients.
 Object.assign(inventory.state,draft.state);return {ok:true,created};
}
