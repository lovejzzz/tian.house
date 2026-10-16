// Java String.split drops trailing empty segments before trimming each entry.
export function modelList(value){
 if(value==null)return null;
 const parts=String(value).split(';');
 if(value!=='')while(parts.length&&parts.at(-1)==='')parts.pop();
 return parts.map(v=>v.trim());
}
export function modelVariants(item,p,field){
 if(Object.hasOwn(item,field))return item[field];
 const list=modelList(p[field[0].toUpperCase()+field.slice(1)]);
 // Item.Instance copies static/world lists only when nonempty.
 return field==='weaponSpritesByIndex'||list?.length?list:null;
}
export function initializeModelIndex(item,p,next=bound=>bound>0?Math.floor(Math.random()*bound):0){
 if((item.modelIndex??-1)!==-1)return;
 const weapons=p.ItemType==='base:weapon'?modelVariants(item,p,'weaponSpritesByIndex'):null;
 const statics=modelVariants(item,p,'staticModelsByIndex'),world=modelVariants(item,p,'worldStaticModelsByIndex');
 if(weapons!=null)item.modelIndex=next(weapons.length);
 else if(statics!=null||world!=null)item.modelIndex=next(Math.max(statics?.length??0,world?.length??0));
}
function indexedWeapon(item,p){
 const variants=modelVariants(item,p,'weaponSpritesByIndex'),index=item.modelIndex??-1;
 if(index===-1||variants==null)return {selected:false};
 if(!Number.isInteger(index)||index<0||index>=variants.length)throw new RangeError('Weapon model index out of bounds');
 return {selected:true,value:variants[index]};
}
export function weaponSprite(item,p){
 const choice=indexedWeapon(item,p);
 return choice.selected?choice.value:(Object.hasOwn(item,'weaponSprite')?item.weaponSprite:p.WeaponSprite)??null;
}
export function weaponStaticModel(item,p){
 const choice=indexedWeapon(item,p);
 return choice.selected?choice.value:item.staticModel??weaponSprite(item,p);
}
export function worldStaticModel(item,p){
 if(item.worldStaticModel!=null)return item.worldStaticModel;
 const variants=modelVariants(item,p,'worldStaticModelsByIndex'),index=item.modelIndex??-1;
 return (variants&&index>=0&&index<variants.length?variants[index]:null)??p.WorldStaticModel??null;
}
export function validateModelState(item,p){
 for(const field of ['weaponSprite','staticModel','worldStaticModel'])if(item[field]!=null&&typeof item[field]!=='string')throw Error('Invalid item model name');
 for(const field of ['weaponSpritesByIndex','staticModelsByIndex','worldStaticModelsByIndex','iconsForTexture']){
  const list=item[field];if(list!=null&&(!Array.isArray(list)||list.some(v=>v!==null&&typeof v!=='string')))throw Error('Invalid item model variant');
 }
 if(item.modelIndex!==undefined){
  if(!Number.isInteger(item.modelIndex)||item.modelIndex< -1)throw Error('Invalid item model index');
  const weapons=p.ItemType==='base:weapon'?modelVariants(item,p,'weaponSpritesByIndex'):null;
  if(weapons!=null&&item.modelIndex>=weapons.length&&item.modelIndex!==-1)throw Error('Item model index out of range');
  const icons=Object.hasOwn(item,'iconsForTexture')?item.iconsForTexture:modelList(p.IconsForTexture);
  if(icons?.length&&item.modelIndex>=icons.length)throw Error('Item icon index out of range');
 }
}
