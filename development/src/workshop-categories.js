// Classify by object meaning before broad source-sheet names or incidental flags.
// A sprite sheet can contain furniture, signs and equipment together.
export function category(tile,p){
 if(/^tian_studio_television_/.test(tile))return 'Appliances';
 const name=p.CustomName||'',label=[p.GroupName,name].filter(Boolean).join(' ');
 if(p.TianMount==='window')return 'Doors & windows';
 if(/^(?:tian_water_tank|tian_air_unit|tian_power_bank|tian_wall_vent)/.test(tile))return 'Appliances';
 if(p.TianMount==='wall'&&p.container)return 'Furniture';
 if(p.TianLight||p.TianMount==='ceiling'||p.TianMount==='table'||p.TianMount==='wall')return 'Decoration & tiles';
 if(name==='Trash')return 'Decoration & tiles';
 if(/Forge|Blower|Charcoal Burner|Incinerator|Grinder|Quern|Grinding Slab/.test(name))return 'Appliances';
 if(name==='Drying Rack')return 'Furniture';
 if(/Gallery Toilet/i.test(name))return 'Decoration & tiles';
 if(/^(Toilet|Bath|Shower|Sink)$/.test(name))return 'Appliances';
 if(/stairs/i.test(Object.keys(p).join(' ')))return 'Stairs';
 if(/^(?:Door|Window|Fence gate|Log Gate)$/.test(name)||/Curtain|Windowframe/i.test(name)||/^fixtures_(?:doors|windows)/.test(tile))return 'Doors & windows';
 if(['doorN','doorW','windowN','windowW','WindowN','WindowW','DoorWallN','DoorWallW','doorFrN','doorFrW'].some(k=>k in p)||/^door[NW]$/.test(p.type||''))return 'Doors & windows';
 if(/^(?:roofs_|e_roof_|walls_.*roofs)/.test(tile))return 'Walls & roofs';
 if('solidfloor'in p||'FloorOverlay'in p||p.MoveType==='FloorRug'||/^(floors_|blends_)/.test(tile))return 'Floors & terrain';
 if(/^(?:Sign|Road Sign|Painting|Paintings|Poster|Certificate|Notices|Banner|Flag|Clock|Statue|Bust|Female Statue|Male Statue|Mirror|Noteboard|Whiteboard|Pegboard|Menu|Child.*Drawing|Deer Trophy|Antlers|Skull|Candle|Wall Light|Wall Lamp|Chandelier|Lamp|Lights)$/.test(name)||/^(?:signs_|papernotices_|overlay_|walls_decoration|lighting_indoor)/.test(tile))return 'Decoration & tiles';
 if(/^(?:Oven|Fridge|Freezer|Microwave|Toaster|Hood|Dishwasher|Combo Washer Dryer|Washing Machine|Clothing Dryer|Computer|Television|Radio|Walkie Talkie|Terminal|Monitors|Generator|Conditioner|Dispenser|Phone|Phones|Popcorn Machine|Soda Machine|Hair Dryer|Register|Projector|Fireplace|Extinguisher)$/.test(name))return 'Appliances';
 if(/\b(?:Piano|Jukebox|Amplifier|Speaker Cabinet)\b/.test(name))return 'Furniture';
 if(/\b(?:Composter|Rain Collector Barrel|Scarecrow|Salt Lick|Trough|Swingset|Slide|Play Castle|Barbecue|Campfire|Cooking Pit|Outdoor Lamp|Standpipe|Road Cone|Gravestone|Propane Tank|Dumpster)\b/.test(label))return 'Outdoor';
 if(/vegetation|(?:^|_|\s)tree|plant|bush|flower|hedge/i.test(tile+' '+name))return 'Garden';
 if(/^(fencing_|lighting_outdoor|street_|camping_)/.test(tile))return 'Outdoor';
 if('WallN'in p||'WallW'in p||'WallNW'in p||'WallSE'in p||/^walls_|roof/i.test(tile))return 'Walls & roofs';
 if(/^(?:Table|.* Table|Bed|Beds|Mattress|Couch|Wardrobe|Cabinet|Desk|Counter|Chair|Chairs|Bench|Stool|.*Stool|Shelves|Shelf|.*Shelves|.*Shelf|Rack|Dartboard|Seat|Seating|Locker|Drawers|Ottoman|Chest|Crate|Small Crate|Tool Cabinet|Workbench)$/.test(name))return 'Furniture';
 if(/outdoor|recreational|barbecue|grill/i.test(tile))return 'Outdoor';
 if(/^appliances_|^fixtures_bathroom/.test(tile))return 'Appliances';
 // Plumbing capability outranks the generic movable-furniture fallback.
 // Keep explicit outdoor fixtures and architectural semantics above this rule.
 if('waterPiped'in p)return 'Appliances';
 if(p.IsMoveAble!==undefined||p.container||p.BedType||/^furniture_/.test(tile))return 'Furniture';
 return 'Decoration & tiles';
}
