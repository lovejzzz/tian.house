// InputScript status predicates over explicit runtime getter values. Type/tag
// resolution, resource capacity, Lua OnTestItem and queue reservations are separate.
export function craftRoutineStatus(input,state){
 const has=flag=>input.flags.includes(flag);
 if(state.excluded)return false;
 if(state.favorite&&input.mode!=='Keep'&&!has('AllowFavorite'))return false;
 if(state.food&&state.rotten&&!has('AllowRottenItem'))return false;
 if(state.food&&state.frozen&&!has('AllowFrozenItem'))return false;
 if(state.broken&&!has('AllowDestroyedItem'))return false;
 // Source tests the localized display name, not a generic fluid sealed flag.
 if(has('IsSealed')||has('IsNotSealed')){
  if(typeof state.sealedLabel!=='string')throw Error('Sealed status requires the source-localized label');
  const sealed=state.name!=null&&state.name.includes(state.sealedLabel);
  if(has('IsSealed'))return sealed;
  return state.name!=null&&!sealed;
 }
 return true;
}
export function craftClothingStatus(input,state){
 if(state.inCorpse)return true;
 return (!input.flags.includes('IsWorn')||state.worn)&&(!input.flags.includes('IsNotWorn')||(!state.worn&&!state.equipped));
}
export function craftDamageStatus(input,state){
 return (!input.flags.includes('IsDamaged')||state.damaged)&&(!input.flags.includes('IsUndamaged')||!state.damaged);
}
export function craftCookingStatus(input,state){
 if(!state.food)return true;
 if(input.flags.includes('IsWholeFoodItem')){
  if(typeof state.wholeFood!=='boolean')throw Error('Whole-food status requires complete source getter comparison');
  if(!state.wholeFood)return false;
 }
 if(!state.cookable)return true;
 return (!input.flags.includes('IsUncookedFoodItem')||state.uncooked)&&(!input.flags.includes('IsCookedFoodItem')||!state.uncooked);
}
