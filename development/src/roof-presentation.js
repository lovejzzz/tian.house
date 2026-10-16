import {pointInPolygon} from './polygon-footprint.js';
import {roofRenderFaces} from './roof-render.js';
const cache=new WeakMap();
// Roof visibility is a volume decision. Individual roof tiles must not wink out
// as the view cone crosses them. This only affects presentation, not exploration.
export function roofPresentation(geometry,player,visibility,explored,dt){
 if(!geometry)return new Map();
 let groups=cache.get(geometry);if(!groups){groups=new Map();for(const part of roofRenderFaces(geometry)){if(!groups.has(part.roofId))groups.set(part.roofId,[]);groups.get(part.roofId).push(part);}cache.set(geometry,groups);}
 const result=new Map();
 for(const [id,parts] of groups){
  const slopes=parts.filter(p=>p.roofFace.kind==='slope');
  const inside=slopes.some(p=>p.roofFace.height(player.x,player.y)>player.z+1e-6&&pointInPolygon([player.x,player.y],p.roofFace.vertices.map(v=>v.slice(0,2))));
  let brightness=0;
  for(const part of slopes){if(Math.hypot(part.x-player.x,part.y-player.y)>26)continue;for(const [dx,dy] of [[0,0],[-1,0],[0,-1],[1,0],[0,1]])brightness=Math.max(brightness,visibility.brightness(part.x+dx,part.y+dy,player.z,explored,true));}
  const alpha=visibility.wallAlpha(`roof:${id}`,inside?0:1,dt);
  result.set(id,{alpha,brightness});
 }
 return result;
}
