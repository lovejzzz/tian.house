// Low platforms use source-art pixels, as door thresholds do (96 per storey).
// Not a second floor: doors, routing and persistence retain their integer level.
export function groundHeight(square,properties={},contains=()=>true){
 let height=0;
 for(const tile of square?.tiles||[]){
  const p=properties[tile]||{},value=Number(p.TianGroundHeight);
  if(!('solidfloor'in p)||'FloorOverlay'in p||p.MoveType==='FloorRug'||!Number.isFinite(value)||value<0||value>16||!contains(tile))continue;
  height=Math.max(height,value);
 }
 return height;
}
// Wall/ceiling fixtures retain their architectural mounting plane. Freestanding
// and table-mounted furnishings follow the local supporting ground surface.
export function groundObjectLift(tile,square,properties={}){
 const p=properties[tile]||{};
 if(['wall','ceiling','window'].includes(p.TianMount)||['WallN','WallW','WallNW','WallSE','doorN','doorW','windowN','windowW','TianReturnStair'].some(k=>k in p))return 0;
 return groundHeight(square,properties);
}

export function groundFloorLift(tile,square,properties={}){
 const p=properties[tile]||{};
 return groundHeight(('FloorOverlay'in p||p.MoveType==='FloorRug')?square:{tiles:[tile]},properties);
}

// Render and interaction queries must agree after a supporting tile is destroyed.
export function supportedGroundSquare(world,square){
 if(!square)return square;
 return {...square,tiles:square.tiles.filter(tile=>!world.state(square.x,square.y,square.z,tile).destroyed)};
}
