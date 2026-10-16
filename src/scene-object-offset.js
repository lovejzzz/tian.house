// Fine placement is stored in source-grid units alongside the stable tile anchor.
// Keeping it within half a cell preserves legacy inventory/state identities.
export function objectOffset(object){const offset=object?.placementOffset;if(offset===undefined)return [0,0];if(!Array.isArray(offset)||offset.length!==2||offset.some(v=>!Number.isFinite(v)||Math.abs(v)>.5))throw Error('Furniture fine offset must stay within half a grid cell');return offset;}
const cache=new WeakMap();
export function sourceObjectOffset(plan,x,y,z,tile){
 const scene=plan?.sceneDocument;if(!scene)return [0,0];let index=cache.get(scene);if(!index){index=new Map();const levels=new Map(scene.levels.map(l=>[l.id,l.index]));for(const o of scene.objects)for(const p of o.parts)index.set(`${o.x+p.dx},${o.y+p.dy},${levels.get(o.levelId)}:${p.tile}`,objectOffset(o));cache.set(scene,index);}return index.get(`${x},${y},${z}:${tile}`)||[0,0];
}
