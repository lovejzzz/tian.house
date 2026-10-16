import {resolveInventoryCraftInput} from './inventory.js';
import {craftInputContainsType} from './craft-resolve.js';
import {parseCraftItemInput} from './craft-inputs.js';
import {craftRoutineStatus} from './craft-status.js';

export const barricadeInputScripts={
 hammer:parseCraftItemInput('item 1 tags[base:hammer] mode:keep flags[Prop1;MayDegradeVeryLight;DontRecordInput]'),
 material:parseCraftItemInput('item 1 [Base.Plank]'),
 nail:parseCraftItemInput('item 1 [Base.Nails] flags[DontRecordInput]'),
};

// 42.21 BarricadePlanks InputScript: keep hammer-tag tool, consume plank/nail.
// Selection currently covers the player's direct inventory only.
// Legacy saves predate character creation; use the same explicit provisional identity.
export const recipeActorName=player=>player?.fullName??'Survivor';
export const isRecipeExcluded=(item,player)=>item?.noRecipesOwner===recipeActorName(player);
export function setRecipeExcluded(item,player,excluded){item.noRecipesOwner=excluded?recipeActorName(player):false;}
function usable(item,keep=false,player){
 return !!item && item.condition>0 && craftRoutineStatus(keep?barricadeInputScripts.hammer:barricadeInputScripts.material,{favorite:!!item.favorite,broken:!!item.broken,excluded:isRecipeExcluded(item,player),food:false});
}
function hammerInput(item,player){
 return usable(item,true,player)&&craftInputContainsType(resolveInventoryCraftInput(barricadeInputScripts.hammer),item.type);
}
export function selectBarricadeInputs(inv,player){
 const items=inv.list();
 return {hammer:items.find(i=>hammerInput(i,player)),material:items.find(i=>i.type==='Base.Plank'&&usable(i,false,player)),nail:items.find(i=>i.type==='Base.Nails'&&usable(i,false,player))};
}
export function barricadeInputsValid(inv,{hammer,material,nail},player){
 const present=item=>item&&inv.state.items[item.id]===item&&item.container==='player';
 return !!(present(hammer)&&present(material)&&present(nail)&&hammerInput(hammer,player)&&material.type==='Base.Plank'&&nail.type==='Base.Nails'&&usable(material,false,player)&&usable(nail,false,player));
}
