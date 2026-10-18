export function usableRoomMaterial(entry,properties,gable=false){
 if(entry?.parts?.length!==1)return false;
 const tile=entry.parts[0].tile,props=properties[tile]||{};
 return gable?/^roofs_30_\d+_\d+$/.test(tile)&&'BlockRain'in props:'solidfloor'in props;
}
