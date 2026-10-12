import {parseCraftItemInput} from './craft-inputs.js';
import {resolveInventoryCraftInput} from './inventory.js';
import {planCraft,commitCraft} from './crafting.js';
const specs=[
 {id:'Wood_Crate_Lvl1',name:'木箱',kind:'crate',tiles:['carpentry_01_19']},
 {id:'WoodFloorLvl1',name:'木地板',kind:'floor',tiles:['carpentry_02_58']},
 {id:'WoodenWallFrame',name:'木墙框架',kind:'frame',tiles:['carpentry_02_100','carpentry_02_101']},
 {id:'WoodenWallLvl1',name:'木墙',kind:'wall',tiles:['walls_exterior_wooden_01_44','walls_exterior_wooden_01_45']},
];
let catalog=[];
export const buildingRecipes=()=>catalog;
export function loadBuildingCatalog(source){
 catalog=specs.map(spec=>{const d=source.declarations.find(d=>d.path.includes('entity '+spec.id));if(!d)return null;
  return {...spec,properties:d.properties,time:Number(d.properties.time),needToBeLearn:false,pending:[],outputs:[],mappers:{},inputs:d.children.find(c=>c.header==='inputs').values.map(line=>resolveInventoryCraftInput(parseCraftItemInput(line)))};
 }).filter(Boolean);return catalog;
}
export function planBuilding(world,player,recipe,x,y,z,rotation=0){
 if(!recipe||![x,y,z,rotation].every(Number.isInteger)||rotation<0||rotation>=recipe.tiles.length)return {ok:false,reason:'建筑参数无效'};
 if(z!==player.z||Math.hypot(x+.5-player.x,y+.5-player.y)>1.7)return {ok:false,reason:'请走近建造位置'};
 const sq=world.square(x,y,z),flags=world.flags(x,y,z);
 if(!sq||!flags.floor||flags.solid)return {ok:false,reason:'需要空闲且有支撑的地面'};
 if(recipe.kind==='crate'&&Math.floor(player.x)===x&&Math.floor(player.y)===y)return {ok:false,reason:'不能建在角色脚下'};
 if(!world.lineClear(player,{x:x+.5,y:y+.5}))return {ok:false,reason:'无法触及该位置'};
 const existing=(world.builds||[]).filter(b=>b.x===x&&b.y===y&&b.z===z&&!world.state(x,y,z,b.tile).destroyed);
 const wall=recipe.kind==='wall'||recipe.kind==='frame',frame=existing.find(b=>b.kind==='frame'&&b.rotation===rotation);
 if(wall&&(rotation===0?flags.west:flags.north))return {ok:false,reason:'这里已有墙体'};
 if(recipe.kind==='wall'&&!frame)return {ok:false,reason:'需要同方向的木墙框架'};
 if(existing.some(b=>wall?['frame','wall'].includes(b.kind)&&b.rotation===rotation&&b!==frame:b.kind===recipe.kind)||recipe.kind==='frame'&&frame)return {ok:false,reason:'这里已有同类建筑'};
 if(recipe.kind==='crate'&&(sq.tiles.some(t=>!world.state(x,y,z,t).destroyed&&'BlocksPlacement'in world.props(t))))return {ok:false,reason:'这里已有家具'};
 return {ok:true,tile:recipe.tiles[rotation],replace:recipe.kind==='wall'?frame:null};
}
export function commitBuilding(world,inventory,player,recipe,x,y,z,rotation=0){
 const placement=planBuilding(world,player,recipe,x,y,z,rotation);if(!placement.ok)return placement;
 const materials=commitCraft(recipe,inventory,player);if(!materials.ok)return materials;
 if(placement.replace)world.builds.splice(world.builds.indexOf(placement.replace),1);
 const build={x,y,z,rotation,kind:recipe.kind,recipe:recipe.id,tile:placement.tile};world.builds.push(build);world.reindexBuilds();world.revision++;
 // A newly built container starts empty. Existing map loot generation is bypassed.
 if(recipe.kind==='crate')inventory.container(`world:${x},${y},${z}:${build.tile}`,recipe.name,Number(world.props(build.tile).ContainerCapacity)||40);
 return {ok:true,build};
}
export {planCraft as planBuildingMaterials};
export function validateBuildings(builds){
 if(!Array.isArray(builds)||builds.length>100000)throw Error('存档建筑数据无效');const occupied=new Set();
 for(const b of builds){const spec=specs.find(s=>s.id===b.recipe);if(!spec||![b.x,b.y,b.z,b.rotation].every(Number.isInteger)||b.x<7680||b.x>=8960||b.y<11008||b.y>=12800||b.z< -32||b.z>32||spec.tiles[b.rotation]!==b.tile||spec.kind!==b.kind)throw Error('存档建筑数据无效');const k=`${b.x},${b.y},${b.z}:${b.tile}`;if(occupied.has(k))throw Error('存档包含重复建筑');occupied.add(k);}
}
