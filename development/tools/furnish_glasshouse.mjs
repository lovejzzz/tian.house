import fs from 'node:fs';
import base from '../src/glasshouse-garden-v1.js';
import {WorkshopModel,workshopCatalog} from '../src/workshop-model.js';
import {installOriginalAssets} from '../src/original-assets.js';
const root=new URL('../',import.meta.url),props=JSON.parse(fs.readFileSync(new URL('private-assets/world/properties.json',root))),atlas=JSON.parse(fs.readFileSync(new URL('private-assets/atlas.json',root)));
installOriginalAssets(props,atlas);
const catalog=workshopCatalog(props,atlas,{items:{}}).entries;
const m=new WorkshopModel(base,[7988,11390,8020,11425],props);
m.plan.name='Glasshouse · Sanctuary';
function put(tile,x,y,z=0){const e=catalog.find(e=>e.source===tile);if(!e)throw Error('Missing prefab '+tile);const result=m.place(e,x,y,z);if(!result.ok)throw Error(`${tile} at ${x},${y},${z}: ${result.reason}`);}
function one(tile,x,y,z=0){const result=m.place({parts:[{dx:0,dy:0,tile}]},x,y,z);if(!result.ok)throw Error(result.reason);}
function stock(type,count,tile,x,y,z=-1){for(let i=0;i<count;i++)m.plan.items.push({type:'Base.'+type,x,y,z,storageTile:tile});}
// Natural stopping points: tea by the sofa, a reading lamp by the armchair,
// preparation on the counter, art above the sideboard, drapes along glazing.
put('tian_detail_tea',8003,11411);put('tian_detail_lamp',8002,11409);
put('tian_floor_lamp',8005,11409);put('tian_detail_kitchen',8006,11400);
put('tian_detail_books',7996,11404);put('tian_art_botanical_W',7996,11404);
put('tian_detail_tea',7999,11404);put('tian_art_abstract_W',7996,11406);
for(const x of [7997,7999,8001,8003,8005,8007])put('tian_curtain_N',x,11413);
for(const y of [11407,11409,11411])put('tian_curtain_W',8010,y);
for(const x of [8005,8007,8009])put('tian_wall_sconce_N',x,11399);
put('tian_wall_sconce_W',7996,11408);
put('tian_wall_sconce_N',7999,11399);put('tian_wall_strip_N',8001,11399);
put('tian_detail_wash',8009,11411); // entry cabinet: folded linen and hand care
// Bedside symmetry; reading nook has an accessible freestanding lamp.
for(const x of [7996,7999])put('tian_detail_lamp',x,11400,1);
put('tian_detail_books',7998,11405,1);put('tian_floor_lamp',7996,11405,1);
put('tian_art_abstract_N',7997,11399,1);put('tian_art_botanical_W',7996,11402,1);
for(const x of [7997,7999,8001])put('tian_curtain_N',x,11407,1);
// Separate work side table leaves the CRT and its standing approach clear.
put('furniture_storage_01_9',8003,11400,1);put('tian_detail_desk',8003,11400,1);
put('tian_wall_sconce_N',8002,11399,1);
put('fixtures_counters_01_77',8007,11400,1);put('tian_detail_wash',8007,11400,1);
put('tian_wall_sconce_N',8009,11399,1);put('tian_wall_sconce_N',8008,11399,1);
put('tian_wall_strip_N',8013,11402);put('tian_wall_strip_N',8015,11402);

// Replan the bunker, retaining both original staircase connections.
const oldStairs=m.plan.squares.filter(s=>s.z===-1).flatMap(s=>s.tiles.filter(t=>/carpentry_02_(9[678])$/.test(t)).map(tile=>({...s,tile})));
m.plan.squares=m.plan.squares.filter(s=>s.z!==-1);m.plan.items=m.plan.items.filter(i=>i.z!==-1);m.index();
for(let x=7996;x<=8011;x++)for(let y=11401;y<=11415;y++){one('floors_exterior_tilesandstone_01_0',x,y,-1);m.square(x,y,-1).room=0;}
for(let x=7996;x<=8011;x++)for(const y of [11401,11416])one('walls_commercial_03_1',x,y,-1);
for(let y=11401;y<=11415;y++)for(const x of [7996,8012])one('walls_commercial_03_0',x,y,-1);
for(const s of oldStairs){one('floors_exterior_tilesandstone_01_0',s.x,s.y,-1);one(s.tile,s.x,s.y,-1);}
for(let x=7994;x<=7996;x++)for(let y=11411;y<=11412;y++)one('floors_exterior_tilesandstone_01_0',x,y,-1);
one('fixtures_doors_01_0',7996,11411,-1);
const wallN=(x0,x1,y,door)=>{for(let x=x0;x<=x1;x++)one(x===door?'fixtures_doors_01_1':'walls_commercial_03_1',x,y,-1);};
const wallW=(x,y0,y1)=>{for(let y=y0;y<=y1;y++)one('walls_commercial_03_0',x,y,-1);};
// Pantry: 12 numbered monthly cabinets with three accessible aisles.
wallW(8002,11401,11406);wallN(7996,8001,11407,8001);
let month=1;
for(const y of [11401,11403,11405])for(let x=7996;x<=7999;x++){
 const tile='tian_ration_'+month++;put(tile,x,y,-1);
 for(const [type,n]of [['Rice',10],['Pasta',8],['TinnedBeans',16],['CannedCorn',8],['PeanutButter',2],['TunaTin',8]])stock(type,n,tile,x,y);
}
put('tian_art_notice_W',7996,11406,-1);put('tian_art_notice_W',8002,11406,-1);put('tian_wall_strip_N',7998,11401,-1);
// Galley kitchen beside the landing, outside the bulk-storage room.
put('appliances_refrigeration_01_8',8005,11401,-1);
put('appliances_cooking_01_5',8006,11401,-1);
put('fixtures_counters_01_77',8007,11401,-1);put('fixtures_sinks_01_9',8007,11401,-1);
put('fixtures_counters_01_77',8005,11403,-1);put('tian_detail_kitchen',8005,11403,-1);
put('tian_wall_strip_N',8006,11401,-1);
// Service room: two independent water reserves, air intake/return, batteries.
wallW(8008,11401,11405);wallN(8008,8011,11406,8009);
put('tian_water_tank',8008,11402,-1);put('tian_water_tank',8009,11402,-1);
put('tian_air_unit',8011,11401,-1);put('tian_power_bank',8011,11404,-1);
put('tian_wall_vent_N',8010,11401,-1);put('tian_wall_strip_N',8009,11401,-1);
put('furniture_shelving_01_28',8010,11401,-1);
// Private washroom, with clear standing spaces and storage for hygiene supplies.
wallW(8008,11407,11409);wallN(8008,8011,11407);wallN(8008,8011,11410,8009);
put('fixtures_sinks_01_2',8009,11407,-1);put('fixtures_bathroom_01_0',8011,11407,-1);
put('fixtures_bathroom_01_32',8011,11409,-1);put('walls_decoration_01_10',8009,11407,-1);
put('furniture_storage_01_9',8008,11408,-1);put('tian_detail_wash',8008,11408,-1);
stock('Soap2',12,'furniture_storage_01_9',8008,11408);stock('ToiletPaper',24,'furniture_storage_01_9',8008,11408);
put('tian_wall_sconce_N',8010,11407,-1);
// Sleep room is separated from the working/utility area by a door.
wallW(8006,11411,11415);wallN(8006,8011,11411,8007);
for(let x=8006;x<=8011;x++)for(let y=11411;y<=11415;y++)one('floors_interior_tilesandwood_01_40',x,y,-1);
put('furniture_bedding_01_25',8008,11412,-1);put('furniture_storage_01_9',8007,11412,-1);put('furniture_storage_01_9',8010,11412,-1);
put('tian_detail_lamp',8007,11412,-1);put('tian_detail_books',8010,11412,-1);
put('tian_rug_linen_0',8008,11414,-1);put('tian_art_botanical_N',8009,11411,-1);
put('furniture_storage_01_1',8011,11414,-1);
// Common room has a work/communications desk, dining and a reading corner.
put('carpentry_01_32',7998,11408,-1);put('tian_detail_tea',7998,11408,-1);
put('furniture_seating_indoor_03_45',7998,11407,-1);put('furniture_seating_indoor_03_47',7998,11410,-1);
put('furniture_seating_indoor_02_24',7998,11413,-1);put('carpentry_02_9',7999,11415,-1);put('tian_detail_books',7999,11415,-1);
put('tian_rug_moss_0',7998,11414,-1);put('tian_floor_lamp',7997,11413,-1);
put('furniture_storage_01_9',8004,11414,-1);put('tian_detail_radio',8004,11414,-1);
put('furniture_seating_indoor_03_47',8004,11415,-1);
put('tian_wall_sconce_W',7996,11413,-1);put('tian_wall_vent_W',7996,11414,-1);
put('location_community_medical_01_88',8000,11407,-1);
put('tian_art_notice_W',8006,11412,-1);put('tian_wall_strip_N',8003,11401,-1);
// Entry supply shelf never obstructs the main stair foot or secondary exit.
put('furniture_shelving_01_26',8003,11409,-1);
for(const [type,n]of [['Bandage',20],['FirstAidKit',2],['Battery',24],['Notebook',4],['Book',8]])stock(type,n,'furniture_shelving_01_26',8003,11409);
put('location_business_machinery_01_32',8005,11408,-1);
for(const type of ['Hammer','Saw','Screwdriver'])stock(type,1,'location_business_machinery_01_32',8005,11408);
put('furniture_storage_02_0',8005,11406,-1);
// Occupancy 001: exact household supplies, never procedural loot in this edition.
m.plan.deterministicContainers=true;
for(const [type,n] of [['Steak',2],['Chicken',2],['Butter',1]])stock(type,n,'appliances_refrigeration_01_8',8005,11400,0);
for(const type of ['TinOpener','Pot','Saucepan','Bowl','KitchenKnife','Fork','Spoon'])stock(type,1,'fixtures_counters_01_77',8006,11400,0);
for(const [type,n]of [['TinnedBeans',4],['Cereal',2],['PeanutButter',2],['Rice',2],['Pasta',2]])stock(type,n,'fixtures_counters_01_77',8008,11400,0);
for(const type of ['TinOpener','Pot','Saucepan','Bowl','KitchenKnife','Fork','Spoon'])stock(type,1,'fixtures_counters_01_77',8007,11401,-1);
for(const [type,n]of [['TinnedBeans',4],['Cereal',2],['PeanutButter',2]])stock(type,n,'fixtures_counters_01_77',8005,11403,-1);
stock('BookCarpentry1',1,'furniture_storage_01_9',7999,11400,1);
stock('Book',2,'furniture_storage_01_9',7999,11400,1);
stock('BookCarpentry1',1,'furniture_shelving_01_26',8003,11409,-1);
const plan=m.export();
for(const sq of plan.squares)if(sq.z>=0)sq.tiles=sq.tiles.map(t=>t==='walls_commercial_02_0'?'tian_glazing_W_1_0':t==='walls_commercial_02_1'?'tian_glazing_N_1_0':t);
// Pair neighboring glazing modules into unobstructed picture panes.
for(const axis of ['N','W'])for(const sq of plan.squares){
 const single=`tian_glazing_${axis}_1_0`;if(sq.z<0||!sq.tiles.includes(single))continue;
 const next=plan.squares.find(s=>s.z===sq.z&&s.x===sq.x+(axis==='N'?1:0)&&s.y===sq.y+(axis==='W'?1:0)&&s.tiles.includes(single));if(!next)continue;
 for(const [i,s]of [sq,next].entries()){s.tiles=s.tiles.filter(t=>t!==`tian_curtain_${axis}`);s.tiles=s.tiles.map(t=>t===single?`tian_glazing_${axis}_2_${i}`:t);s.tiles.push(`tian_picture_drape_${axis}_${i}`);}
}
fs.writeFileSync(new URL('src/showcase-house.js',root),'// Curated Sanctuary furnishing and bunker plan; tools/furnish_glasshouse.mjs.\nexport default '+JSON.stringify(plan)+';\n');
console.log(plan.name,plan.squares.length,'squares',plan.items.length,'stocked supplies');
