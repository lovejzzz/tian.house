// Resolve against a loaded registry. Registry iteration order is supplied by the
// caller; this function does not reproduce ScriptManager/ItemTag hash ordering.
export function resolveCraftItemInput(input,registry){
 const resolvedItems=[],possibleItems=[];
 if(input.acceptsAnyItem){
  const fluid=input.flags.includes('ItemIsFluid')||input.consumeFromItem?.resourceType==='Fluid'||input.createToItem?.resourceType==='Fluid';
  const energy=input.flags.includes('ItemIsEnergy')||input.consumeFromItem?.resourceType==='Energy'||input.createToItem?.resourceType==='Energy';
  for(const item of registry.allItems())if(fluid?item.hasFluidContainer:energy?item.itemType==='base:drainable':true)possibleItems.push(item.fullType);
 }else{
  for(const name of input.items){const item=registry.getItem(name);if(item&&!resolvedItems.includes(name)){resolvedItems.push(name);possibleItems.push(item.fullType);}}
  for(const tag of registry.orderedTags?.(input.itemTags)??input.itemTags){
   const items=registry.getItemsForTag(tag);
   if(!items?.length)throw Error(`Recipe input tag has no resolved items: ${tag}`);
   for(const item of items)if(!resolvedItems.includes(item.fullType)){resolvedItems.push(item.fullType);possibleItems.push(item.fullType);}
  }
 }
 // Do not compact itemAmounts alongside resolved names. Source retains the
 // original positional amount arrays even when names are skipped/deduplicated.
 return {...input,resolvedItems,possibleItems};
}
export function catalogCraftRegistry(catalog){
 const items=new Map(),tags=new Map();
 for(const [fullType,entry]of Object.entries(catalog)){
  const item={fullType,itemType:entry.properties.ItemType,hasFluidContainer:entry.components?.some(c=>c.header==='component FluidContainer')??false};items.set(fullType,item);
  for(const tag of new Set(String(entry.properties.Tags??'').split(';').map(s=>s.trim()).filter(Boolean))){if(!tags.has(tag))tags.set(tag,[]);tags.get(tag).push(item);}
 }
 return {getItem:name=>items.get(name.includes('.')?name:`Base.${name}`),getItemsForTag:tag=>tags.get(tag)??[],allItems:()=>items.values()};
}
export function craftInputContainsType(input,type){
 if(!input.possibleItems)throw Error('Input candidate types have not been resolved');
 return input.possibleItems.includes(type);
}
