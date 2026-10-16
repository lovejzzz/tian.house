import {Renderer} from './render.js';
import {groundHeight} from './ground-height.js';

// Preview a standalone placement with the same floor renderer and material layers
// as the world. Never mutate the active renderer's camera, context or world.
export function drawGroundThumbnail(entry,canvas,source,properties,retry=()=>{}){
 if(!entry.parts?.length||!entry.parts.every(p=>'solidfloor'in(properties[p.tile]||{}))||!entry.parts.some(p=>groundHeight({tiles:[p.tile]},properties)))return false;
 const cells=entry.parts.map(p=>({x:p.dx,y:p.dy,z:0,tiles:[properties[p.tile]?.TianGroundBase,p.tile].filter(Boolean)}));
 const atlas=source.atlas;
 for(const s of cells)for(const tile of s.tiles){const region=atlas.regions[tile];if(!region)return false;if(!source.page(region.page)){source.loading.get(region.page)?.then(()=>{if(canvas.isConnected)retry();});return true;}}
 const world={properties,props:tile=>properties[tile]||{},state:()=>({}),square:(x,y,z)=>cells.find(s=>s.x===x&&s.y===y&&s.z===z)};
 const renderer=new Renderer(canvas,world,atlas,null);renderer.page=name=>source.page(name);
 const points=cells.flatMap(s=>[0,groundHeight(s,properties)/96].flatMap(h=>[[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>renderer.project(s.x+u,s.y+v,h))));
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;
 const scale=Math.min((canvas.width-14)/width,(canvas.height-12)/height,2),c=canvas.getContext('2d');
 c.save();c.translate((canvas.width-width*scale)/2-left*scale,(canvas.height-height*scale)/2-top*scale);c.scale(scale,scale);
 for(const s of cells.sort((a,b)=>a.x+a.y-b.x-b.y))for(const tile of s.tiles)renderer.floor(tile,s);
 c.restore();return true;
}
