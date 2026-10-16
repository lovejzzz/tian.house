import {modelList} from './item-model-state.js';

// Item's initial icon is replaced by synchWithVisual only for a nonblank
// indexed entry. Source texture availability is checked separately by the UI.
export function inventoryIcon(item,p){
 const icons=Object.hasOwn(item,'iconsForTexture')?item.iconsForTexture:modelList(p.IconsForTexture);
 let name=p.Icon??icons?.[0]??null;
 const index=item.modelIndex??-1;
 if(index!==-1&&icons?.length){
  if(!Number.isInteger(index)||index<0||index>=icons.length)throw new RangeError('Icon model index out of bounds');
  const variant=icons[index];if(variant!=null&&variant.trim()!=='')name=variant;
 }
 return name==null?'Question_On':'Item_'+name;
}
