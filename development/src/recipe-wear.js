// Installed 42.21 IsoGameCharacter.getWeaponLevel(HandWeapon) reads the actual
// primary's categories, even when its argument is a different recipe tool.
export function actorWeaponLevel(player,primaryProperties){
 if(primaryProperties?.ItemType!=='base:weapon')return 0;
 const categories=new Set(String(primaryProperties.Categories??'').split(';').map(x=>x.trim()));
 const level=name=>player.skillLevels?.[name]??0;let result=-1;
 if(categories.has('base:axe'))result=level('axe');
 for(const [category,skill] of [['spear','spear'],['smallblade','smallblade'],['longblade','longblade'],['blunt','blunt'],['smallblunt','smallblunt']])if(categories.has('base:'+category))result+=level(skill);
 return result===-1?0:Math.min(10,result);
}
export function recipeWearModifier(player,toolProperties,primaryProperties,relevantSkills){
 const relevant=Math.max(0,...relevantSkills.map(name=>player.skillLevels?.[name]??0));
 const maintenance=player.skillLevels?.maintenance??0;
 return relevant+maintenance+(toolProperties.ItemType==='base:weapon'?Math.trunc(actorWeaponLevel(player,primaryProperties)/2):0);
}
