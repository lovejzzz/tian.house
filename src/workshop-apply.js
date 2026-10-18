import {migrateResidentContainers} from './resident-container-migration.js?v=1d7ffb1877ce';
import {windowSprite} from './windows.js?v=1d7ffb1877ce';
import {validateHousePlan} from './workshop-model.js?v=1d7ffb1877ce';
import {World} from './world.js?v=1d7ffb1877ce';
import {Inventory,definition} from './inventory.js?v=1d7ffb1877ce';
// Build and validate a replacement state before touching the running simulation.
export function prepareHouseState(sim,plan,bounds,atlas,{preserveStock=false}={}){
 validateHousePlan(plan,bounds);
 for(const square of plan.squares)for(const tile of square.tiles)if(tile!=='workshop_pool_water'&&!atlas.regions[tile])throw Error('Missing tile: '+tile);
 for(const wall of plan.polygonGeometry?.walls||[])for(const tile of [wall.tile,...(wall.opening?[wall.opening.frame,wall.opening.tile]:[])])if(tile&&!atlas.regions[tile])throw Error('Missing tile: '+tile);
 for(const wall of plan.polygonGeometry?.walls||[])if(wall.opening?.kind==='window'&&!wall.opening.fixed)for(const state of [{open:true},{smashed:true},{smashed:true,glassRemoved:true}]){const tile=windowSprite(wall.opening.tile,wall.opening.properties||{},state);if(tile&&!atlas.regions[tile])throw Error('Missing tile: '+tile);}
 for(const item of plan.items){definition(item.type);if(item.storageTile&&!(sim.world.props(item.storageTile).container||sim.world.props(item.storageTile).TianStorage))throw Error('Items must be stocked in a container');}
 const next=JSON.parse(sim.serialize());next.housePlan=structuredClone(plan);delete next.volumePosition;next.changes={};next.builds=[];next.explored={};
 const preview=new World({...sim.world.manifest,playableBounds:bounds},sim.world.properties);preview.setHousePlan(next.housePlan);
 const clear=p=>{const f=preview.flags(Math.floor(p.x),Math.floor(p.y),p.z);return f.floor&&!f.solid&&preview.objectOverlap(p.x,p.y,p.z)<=1e-9&&preview.polygonRuntime.penetration([p.x,p.y],p.z)<=1e-8&&[[-.18,-.18],[.18,-.18],[-.18,.18],[.18,.18]].every(([dx,dy])=>preview.floorAt(p.x+dx,p.y+dy,p.z));};
 let spawn=plan.spawn;
 if(!spawn||!clear(spawn)){const center=s=>({...s,x:s.x+.5,y:s.y+.5}),square=plan.squares.find(s=>s.z===0&&clear(center(s)))||plan.squares.find(s=>clear(center(s)));if(!square)throw Error('Add a clear floor before walking through your house');spawn={x:square.x+.5,y:square.y+.5,z:square.z};}
 next.housePlan.spawn={...spawn};Object.assign(next.player,spawn,{moving:false,running:false});
 const inv=new Inventory(next.inventory);
 const previousItems=preserveStock?migrateResidentContainers(inv.state,sim.state.housePlan,plan,sim.world.properties).stock:[];
 // Only replace workshop props that are still on the ground and unchanged.
 // Player-carried items and filled containers remain in the save.
 if(!preserveStock)for(const item of Object.values(inv.state.items))if(item.workshopPlaced&&(inv.state.containers[item.container]?.ground||item.workshopOrigin===item.container)&&!inv.state.containers[item.id]?.items.length)inv.remove(item.id);
 const stockKey=item=>JSON.stringify([item.type,item.x,item.y,item.z,item.storageTile||null]);
 const previousStock=new Map();if(preserveStock)for(const item of previousItems){const key=stockKey(item);previousStock.set(key,(previousStock.get(key)||0)+1);}
 for(const item of plan.items){const key=stockKey(item),oldCount=previousStock.get(key)||0;if(oldCount){previousStock.set(key,oldCount-1);continue;}const props=item.storageTile?sim.world.props(item.storageTile):null,id=props?`world:${item.x},${item.y},${item.z}:${item.storageTile}`:`ground:${item.x},${item.y},${item.z}`,c=inv.container(id,props?.CustomName||'Ground',props?Number(props.ContainerCapacity)||50:10000);if(!props)c.ground={x:item.x,y:item.y,z:item.z};const created=inv.create(item.type,id,{workshopPlaced:true,workshopOrigin:id,...(props?{}:{groundOffset:{x:.5,y:.5,z:0}})});const preset=presetFluid(created.type)??(created.type==='Base.WaterBottle'?'Water':null);if(created.fluid&&preset){created.fluid.type=preset;created.fluid.amount=created.fluid.capacity;}}
 return next;
}
// Sealed goods arrive with the first fluid their definition lists (a carton of
// milk is milk, a stocked water bottle is water); open vessels (mugs, kettles,
// pots) have no listed fluid and arrive empty.
export function presetFluid(type){
 const fluid=definition(type).components?.find(c=>c.header==='component FluidContainer'),list=fluid?.children?.find(c=>c.header==='Fluids');
 const first=list?.values?.map(v=>/^fluid\s*=\s*([A-Za-z]+)/.exec(v)?.[1]).find(Boolean);return first||null;
}
// Re-applying the house the save already lives in (same scene) keeps the
// resident's stock: what they ate, used or moved is not restocked from the plan,
// whether the edit came from "Live here" or the Workshop's "Use as my home".
// A different scene is a move to a new house and is stocked fresh.
export function preservesResidentStock(state,plan){const id=plan?.sceneDocument?.id;return !!id&&id===state?.housePlan?.sceneDocument?.id;}
