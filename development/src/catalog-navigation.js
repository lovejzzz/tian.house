// Navigation facets separate complete window/door assets from raw wall openings.
export function openingType(entry,properties){
 const tile=entry.source||'',p=properties[tile]||{};
 if(p.TianMount==='window'||/curtain|drape/i.test(tile+' '+entry.name))return 'Curtains';
 if(entry.id?.startsWith('garage:')||/^fixtures_doors/.test(tile)||'doorN'in p||'doorW'in p)return 'Doors';
 if(/^tian_glazing_|^fixtures_windows_(?!detailing)/.test(tile)||'windowN'in p||'windowW'in p)return 'Windows';
 return 'Parts';
}

// Reverse the source's state offsets; CanBreak describes capability, not condition.
export function windowConditions(properties){
 const states=new Map();
 for(const [tile,p] of Object.entries(properties))if(('IsClosedState'in p&&p.MoveType==='Window')||(('windowN'in p||'windowW'in p)&&('SmashedTileOffset'in p||'GlassRemovedOffset'in p))){
  states.set(tile,'Intact');
  for(const [key,state]of [['OpenTileOffset','Intact'],['SmashedTileOffset','Broken'],['GlassRemovedOffset','Glass removed']]){
   const offset=Number(p[key]);if(!offset)continue;
   const target=tile.replace(/_(\d+)$/,(_,n)=>'_'+(Number(n)+offset));
   if(properties[target])states.set(target,state);
  }
 }
 return states;
}
export function catalogFacet(e,properties,states){
 const p=properties[e.source]||{},s=[e.name,e.source,p.CustomName,p.GroupName].join(' ').toLowerCase();
 let type='Other';
 const rules={
  Furniture:[['Fitness',/functional trainer|fitness|exercise/],['Beds',/bed|mattress/],['Seating',/chair|couch|sofa|bench|stool|seat|ottoman/],['Tables & desks',/table|desk|counter|workbench|workstation|breakfast bar/],['Storage',/shel|cabinet|wardrobe|locker|drawer|crate|chest|rack|media console/],['Music & games',/piano|jukebox|speaker|amplifier|dart|game|pool table/]],
  Appliances:[['Kitchen',/preparation sink|kitchen sink|scullery sink/],['Bathroom',/toilet|bath|shower|sink/],['Laundry',/washer|washing|dryer/],['Kitchen',/oven|fridge|freezer|microwave|toaster|hood|dishwasher/],['Electronics',/computer|television|radio|monitor|terminal|phone|projector/],['Power & utilities',/generator|power|water|air|vent|conditioner|fireplace|extinguisher/]],
  Garden:[['Trees',/tree/],['Hedges & shrubs',/hedge|bush|shrub/],['Flowers',/flower/],['Crops',/crop|farm|vegetable/],['Plants & ground cover',/plant|vegetation|grass/]],
  Outdoor:[['Fences & gates',/fenc|gate/],['Lighting',/lamp|light/],['Cooking & camping',/camp|barbecue|grill|cooking/],['Play & recreation',/swing|slide|play|recreation/],['Water & farming',/rain|compost|trough|scarecrow|standpipe/],['Street & yard',/street|road|dumpster|trash|gravestone/]],
  'Walls & roofs':[['Guards & railings',/guard|railing|balustrade/],['Roofs',/roof/],['Walls',/wall/]],
  'Floors & terrain':[['Platforms',/raised paving|platform/],['Drainage',/storm drain|drain grate/],['Paving',/running.bond paving|interlocking.*paving/],['Rugs',/rug|carpet/],['Wood',/wood/],['Tile & stone',/tile|stone|concrete/],['Terrain',/blend|grass|dirt|sand|gravel/]],
  'Decoration & tiles':[['Lighting',/lamp|light|chandelier|candle/],['Wall art & signs',/painting|poster|picture|sign|notice|banner|flag|drawing|certificate/],['Mirrors & clocks',/mirror|clock/],['Tabletop objects',/book|mug|bowl|plate|vase|bottle|tabletop/],['Architectural details',/overlay|trim|detail|sill|conduit/]],
  Vehicles:[['Trailers',/trailer/],['Emergency',/ambulance|police|fire/],['Trucks & vans',/truck|van|bus/],['Cars',/car|sedan|sport|suv/]]
 };
 if(e.category==='Doors & windows')type=openingType(e,properties);
 else if(e.tree)type='Trees';
 else if(e.itemType){const c=e.itemCategory||'';type=/Weapon|Ammo|Explosive/.test(c)?'Weapons & ammunition':/Food|Water$/.test(c)?'Food & drink':/FirstAid|Bandage/.test(c)?'Medical supplies':/Clothing|Accessory|ProtectiveGear|Appearance/.test(c)?'Clothing & accessories':/Container|Bag/.test(c)?'Bags & containers':/Literature|SkillBook|Cartography/.test(c)?'Books & maps':/Tool|Material|RecipeResource|Paint|VehicleMaintenance/.test(c)?'Tools & materials':/Cooking|Household|Furniture|LightSource|FireSource/.test(c)?'Household supplies':/Gardening|Fishing|Trapping|Camping/.test(c)?'Outdoor supplies':/Entertainment|Instrument|Sports|Memento|Teddy/.test(c)?'Leisure & keepsakes':/Electronics|Communications/.test(c)?'Electronics':/Animal/.test(c)?'Animals & animal parts':'Other items';}
 else if(e.category==='Stairs')type='Stairs';
 else if(e.category==='Pools')type='Pools';
 else if(e.category==='Floors & terrain'){const label=[e.name,p.CustomName,p.GroupName].join(' ').toLowerCase().replace(/tilesandwood/g,'');type=rules[e.category].find(([,re])=>re.test(label))?.[0]||rules[e.category].find(([,re])=>re.test((e.source||'').replace(/tilesandwood/g,'')))?.[0]||'Other';}
 else type=(rules[e.category]||[]).find(([,re])=>re.test(s))?.[0]||'Other';
 let condition='Unspecified';
 if(type==='Windows')condition=states.get(e.source)||(/^tian_glazing_/.test(e.source)?'Intact':'Unspecified');
 else if(/burnt|burned|charred/.test(s))condition='Burnt';
 else if(/broken|smashed|damaged|destroyed/.test(s))condition='Damaged';
 return {type,condition};
}
// A complete scroll track with only the nearby rows mounted.
export function catalogWindow(total,scrollTop,height,columns=2,rowHeight=126){
 const rows=Math.ceil(total/columns),first=Math.max(0,Math.min(rows,Math.floor(scrollTop/rowHeight)-3)),last=Math.min(rows,Math.ceil((scrollTop+height)/rowHeight)+3);
 return {start:first*columns,end:Math.min(total,last*columns),height:rows*rowHeight};
}
