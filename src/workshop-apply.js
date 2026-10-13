import {validateHousePlan} from './workshop-model.js?v=d56ad893ba51';
import {World} from './world.js?v=d56ad893ba51';
import {Inventory,definition} from './inventory.js?v=d56ad893ba51';
// Build and validate a replacement state before touching the running simulation.
export function prepareHouseState(sim,plan,bounds,atlas){
 validateHousePlan(plan,bounds);
 for(const square of plan.squares)for(const tile of square.tiles)if(tile!=='workshop_pool_water'&&!atlas.regions[tile])throw Error('Missing tile: '+tile);
 for(const item of plan.items){definition(item.type);if(item.storageTile&&!sim.world.props(item.storageTile).container)throw Error('Items must be stocked in a container');}
 const next=JSON.parse(sim.serialize());next.housePlan=structuredClone(plan);next.changes={};next.builds=[];next.explored={};
 const preview=new World({...sim.world.manifest,playableBounds:bounds},sim.world.properties);preview.setHousePlan(next.housePlan);
 const clear=p=>{const f=preview.flags(Math.floor(p.x),Math.floor(p.y),p.z);return f.floor&&!f.solid;};
 let spawn=plan.spawn;
 if(!spawn||!clear(spawn)){const square=plan.squares.find(s=>s.z===0&&clear(s))||plan.squares.find(clear);if(!square)throw Error('Add a clear floor before walking through your house');spawn={x:square.x+.5,y:square.y+.5,z:square.z};}
 next.housePlan.spawn={...spawn};Object.assign(next.player,spawn,{moving:false,running:false});
 const inv=new Inventory(next.inventory);
 // Only replace workshop props that are still on the ground and unchanged.
 // Player-carried items and filled containers remain in the save.
 for(const item of Object.values(inv.state.items))if(item.workshopPlaced&&(inv.state.containers[item.container]?.ground||item.workshopOrigin===item.container)&&!inv.state.containers[item.id]?.items.length)inv.remove(item.id);
 for(const item of plan.items){const props=item.storageTile?sim.world.props(item.storageTile):null,id=props?`world:${item.x},${item.y},${item.z}:${item.storageTile}`:`ground:${item.x},${item.y},${item.z}`,c=inv.container(id,props?.CustomName||'Ground',props?Number(props.ContainerCapacity)||50:10000);if(!props)c.ground={x:item.x,y:item.y,z:item.z};const created=inv.create(item.type,id,{workshopPlaced:true,workshopOrigin:id,...(props?{}:{groundOffset:{x:.5,y:.5,z:0}})});if(created.fluid&&created.type==='Base.WaterBottle')created.fluid.amount=created.fluid.capacity;}
 return next;
}
