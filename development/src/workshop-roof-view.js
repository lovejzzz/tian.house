import {roofCells,roofEndCells} from './scene-roofs.js';
const key=(x,y,z,tile)=>`${x},${y},${z}:${tile}`;
// Track generated roof ownership: a flat roof can use the same tile as a floor.
export function managedRoofTiles(scene){
 const result=new Set();for(const room of scene?.rooms||[]){if(!room.roof)continue;const base=scene.levels.find(l=>l.id===room.levelId).index+1;for(const c of [...roofCells(room,base),...roofEndCells(scene,room,base)])result.add(key(c.x,c.y,c.z,c.tile));}return result;
}
export function withoutRoofTiles(squares,managed){
 return squares.map(s=>({...s,tiles:s.tiles.filter(tile=>!tile.startsWith('roofs_')&&!tile.startsWith('walls_exterior_roofs_')&&!managed.has(key(s.x,s.y,s.z,tile)))}));
}
