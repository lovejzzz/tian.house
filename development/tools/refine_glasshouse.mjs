// Reproducible interior renovation of the archived first edition.
import fs from 'node:fs';
import first from '../src/glasshouse-v1.js';
import {WorkshopModel,workshopCatalog} from '../src/workshop-model.js';
import {installOriginalAssets} from '../src/original-assets.js';
const root=new URL('../',import.meta.url);
const props=JSON.parse(fs.readFileSync(new URL('private-assets/world/properties.json',root)));
const atlas=JSON.parse(fs.readFileSync(new URL('private-assets/atlas.json',root)));
installOriginalAssets(props,atlas);
const catalog=workshopCatalog(props,atlas,{items:{}}).entries;
const m=new WorkshopModel(first,[7988,11390,8020,11425],props);
m.plan.name='Glasshouse · Garden residence';
function put(tile,x,y,z=0){
 const e=catalog.find(e=>e.source===tile);
 if(!e)throw Error('Missing catalog prefab: '+tile);
 const r=m.place(e,x,y,z);if(!r.ok)throw Error(r.reason);
}
function remove(tile,x,y,z=0){const sq=m.square(x,y,z);sq.tiles=sq.tiles.filter(t=>t!==tile);}
// Kitchen and laundry share the north service wall below the upstairs bathroom.
for(const x of [8006,8008,8009]){remove('carpentry_02_21',x,11400);put('fixtures_counters_01_77',x,11400);}
// Keep the sink above its replacement counter in draw order.
remove('fixtures_sinks_01_9',8009,11400);put('fixtures_sinks_01_9',8009,11400);
put('fixtures_counters_01_158',8006,11399);
put('fixtures_counters_01_158',8008,11399);
put('appliances_laundry_01_4',8001,11400);
put('appliances_laundry_01_12',8002,11400);
put('furniture_shelving_01_37',8001,11399);
put('furniture_shelving_01_40',8003,11400);
// Guest powder room: door faces dining circulation, no bedroom access needed.
for(let y=11399;y<=11401;y++)put('walls_interior_house_01_0',8000,y);
for(let x=7996;x<=7999;x++)put(x===7998?'fixtures_doors_01_1':'walls_interior_house_01_1',x,11402);
for(let x=7996;x<=7999;x++)for(let y=11399;y<=11401;y++)put('floors_exterior_tilesandstone_01_0',x,y);
put('fixtures_sinks_01_2',7997,11399);put('fixtures_bathroom_01_0',7999,11399);
put('walls_decoration_01_10',7997,11399);
// Dining and piano lounge: grounded furniture groups, clear stair approach.
put('tian_rug_moss_0',7999,11404);
for(const x of [7999,8000]){remove('furniture_seating_indoor_03_4',x,11403);put('furniture_seating_indoor_03_45',x,11403);}
for(const x of [7999,8000]){remove('furniture_seating_indoor_03_7',x,11406);put('furniture_seating_indoor_03_47',x,11406);}
put('furniture_storage_01_9',7996,11404);
put('vegetation_indoor_01_10',7996,11407);
put('tian_rug_linen_0',8002,11410);
put('furniture_seating_indoor_02_20',8005,11410);
put('furniture_storage_01_52',8002,11409);
put('vegetation_indoor_01_12',8009,11410);
put('tian_rug_runner_0',8007,11412);
// Bedroom has bedside storage, a reading corner and a distinct work area.
put('furniture_storage_01_9',7996,11400,1);
put('furniture_storage_01_9',7999,11400,1);
put('tian_rug_linen_0',7997,11402,1);
put('furniture_seating_indoor_02_20',7997,11405,1);
put('furniture_storage_01_52',7998,11405,1);
put('vegetation_indoor_01_10',7999,11406,1);
put('furniture_shelving_01_37',8002,11399,1);
put('walls_decoration_01_10',8006,11399,1);
put('fixtures_bathroom_01_28',8007,11399,1);
put('furniture_shelving_01_40',8005,11399,1);
// Terrace: plants and grill frame the existing outdoor table.
put('vegetation_indoor_01_12',7996,11412,1);
put('vegetation_indoor_01_12',8009,11412,1);
put('appliances_cooking_01_36',8009,11408,1);
// Garage keeps a clear car bay and an accessible service wall.
put('location_business_machinery_01_32',8016,11403);
put('furniture_shelving_01_28',8012,11402);
put('furniture_shelving_01_28',8015,11402);
// Bunker: separate first-aid storage from food and tools.
put('location_community_medical_01_88',8006,11401,-1);
put('furniture_storage_02_28',8002,11410,-1);
put('furniture_shelving_01_28',8007,11401,-1);
fs.writeFileSync(new URL('src/showcase-house.js',root),'// Renovated from the preserved first edition; tools/refine_glasshouse.mjs.\nexport default '+JSON.stringify(m.export())+';\n');
console.log('Renovated',m.plan.name, 'with',m.plan.squares.length,'squares');
