// ItemUser.UseItem(force=true) for ordinary inventory instances. Food and
// drainable subclasses have different current-use accessors and replacements.
export function ordinaryCraftUse(currentUses,requested,{keep=false,destroy=false,disappearOnUse=true}={}){
 const used=Math.min(currentUses,requested),remaining=keep?currentUses:currentUses-used;
 return {used,remaining,remove:destroy||(remaining<=0&&disappearOnUse)};
}
