// Build a new portable house using the same public command reducer as the workshop.
// Never reads or overwrites the user's browser saves.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {setItemCatalog} from '../src/inventory.js';import {WorkshopCommands} from '../src/workshop-commands.js';import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';import {workshopCatalog} from '../src/workshop-model.js';import {installOriginalAssets} from '../src/original-assets.js';import {installStudioAssets} from '../src/studio-assets.js';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root))),props=read('private-assets/world/properties.json'),atlas=read('private-assets/atlas.json');installOriginalAssets(props,atlas);installStudioAssets(props,atlas);
const itemCatalog=read('private-assets/items.json');setItemCatalog(itemCatalog);
const entries=workshopCatalog(props,atlas,itemCatalog).entries,catalog=new Map(entries.map(e=>[e.id,e])),bounds=[7988,11390,8020,11425];const model=new StructuredWorkshopModel({version:1,name:'Hearth Studio',squares:[],items:[],vehicles:[]},bounds,props,entries);model.blank('Hearth Studio');
const commands=new WorkshopCommands(model,catalog),receipts=[];
function commit(operations){const request={requestId:'hearth-'+receipts.length,baseRevision:model.revision,operations};const result=commands.commit(request);if(!result.ok)throw Error(JSON.stringify(result));receipts.push({request,result});}
const X=7994,Y=11401;
commit([{type:'room.add',room:{id:'hearth-main',name:'Living studio',levelId:'level:0',z:0,rect:[X,Y,X+10,Y+6],floorTile:'floors_interior_tilesandwood_01_44',wallN:'tian_masonry_ivory_1',wallW:'tian_masonry_ivory_0'}},{type:'room.add',room:{id:'hearth-bath',name:'Bathroom',levelId:'level:0',z:0,rect:[X+7,Y+6,X+10,Y+8],floorTile:'floors_interior_tilesandwood_01_0',wallN:'tian_masonry_ivory_1',wallW:'tian_masonry_ivory_0'}}]);
const wall=(axis,x,y)=>model.scene.walls.find(w=>w.axis===axis&&w.x===X+x&&w.y===Y+y).id;
const opening=(id,axis,x,y,kind,tile)=>({type:'opening.add',opening:{id,hostWallId:wall(axis,x,y),kind,tile}});
commit([opening('hearth-entry','W',10,5,'door','fixtures_doors_01_0'),opening('hearth-bath-door','N',8,6,'door','fixtures_doors_01_1'),...[1,3,4].map(x=>opening('hearth-window-n'+x,'N',x,0,'window','tian_glazing_N_1_0')),opening('hearth-window-w','W',0,2,'window','tian_glazing_W_1_0'),{type:'entry.set',x:X+9,y:Y+5,z:0}]);
function asset(family,facing){const r=read('assets/recipes/volume/'+family+'.json'),tiles=r.migration[facing];if(!tiles)throw Error('Missing facing '+family+facing);const e=entries.find(e=>e.parts.length===tiles.length&&tiles.every(t=>e.parts.some(p=>p.tile===t)));if(!e)throw Error('Missing catalogue mapping '+family+facing);return e.id;}
const place=(f,dir,x,y)=>({type:'place',assetId:asset(f,dir),x:X+x,y:Y+y,z:0});
commit([
 place('studio-storage-bed','S',0,0),place('studio-nightstand','S',2,0),place('studio-workstation','W',0,2),place('studio-office-chair','E',1,2),place('studio-upright-piano','S',5,0),place('studio-piano-bench','S',5,1),
 place('studio-functional-trainer','W',0,4),place('studio-media-console','N',3,5),place('studio-floor-speaker','N',2,5),place('studio-floor-speaker','N',6,5),place('studio-sectional-sofa','S',3,2),
 place('fridge','S',7,0),place('counter','S',9,0),place('kitchen-sink','N',9,2),place('oven','S',8,0),place('studio-breakfast-bar','S',7,2),place('studio-bar-stool','N',7,3),place('studio-bar-stool','N',8,3),
 place('shower','S',7,6),place('sink','S',9,6),place('toilet','N',9,7),place('floor-lamp','S',3,0),place('snake-plant','S',9,4)
]);
commit([{type:'objects.nudge',ids:model.scene.objects.filter(o=>o.assetId.includes('tian_studio_bar_stool')).map(o=>o.id),dx:0,dy:-.45}]);
commit([{type:'objects.nudge',ids:model.scene.objects.filter(o=>o.assetId==='tile:fixtures_bathroom_01_32').map(o=>o.id),dx:.05,dy:.05}]);
commit([{type:'objects.nudge',ids:model.scene.objects.filter(o=>o.assetId==='tile:fixtures_sinks_01_12').map(o=>o.id),dx:0,dy:.07}]);
commit([place('studio-television-85','N',4,5),place('lamp','S',0,3),place('detail-kitchen','S',9,0),place('wall-sconce','N',5,0),place('wall-sconce','N',8,0),place('wall-sconce','N',8,8),place('wall-sconce','N',3,6),place('wall-sconce','N',6,6),...[1,3,4].map(x=>place('detail-curtain','N',x,0)),place('detail-curtain','W',0,2)]);
// Physical centres, not nominal sprite/grid widths. Preserve table supports.
const idFor=family=>model.scene.objects.find(o=>o.parts.some(p=>props[p.tile]?.TianVariantFamily===family))?.id;
commit([
 {type:'objects.nudge',ids:[idFor('studio-workstation')],dx:.12,dy:0},
 {type:'objects.nudge',ids:[idFor('studio-media-console')],dx:0,dy:-.12},
 {type:'objects.nudge',ids:[idFor('studio-television-85')],dx:-.1539,dy:0,relativeToHost:true},
 {type:'objects.nudge',ids:[idFor('studio-sectional-sofa')],dx:.5,dy:.35},
 {type:'objects.nudge',ids:[model.scene.objects.find(o=>o.parts.some(p=>p.tile==='tian_detail_lamp')).id],dx:-.3,dy:.27,relativeToHost:true},
 {type:'objects.nudge',ids:[idFor('studio-piano-bench')],dx:.265,dy:0},
 {type:'objects.nudge',ids:[idFor('studio-office-chair')],dx:-.25,dy:.44}
]);
commit([place('lamp','S',2,0)]);
commit([{type:'objects.nudge',ids:[model.scene.objects.find(o=>o.x===X+2&&o.y===Y&&o.parts.some(p=>p.tile==='tian_detail_lamp')).id],dx:-.18,dy:-.16,relativeToHost:true},place('studio-water-glass','S',2,0),...['Base.Tshirt_ArmyGreen','Base.Tshirt_CamoGreen','Base.Tshirt_OliveDrab'].map(type=>({type:'place',assetId:'item:'+type,x:X,y:Y,z:0,storeInContainer:true}))]);
commit([[0,0,10,6],[7,6,10,8]].map(([x0,y0,x1,y1],i)=>({type:'roofVolume.add',roof:{id:'hearth-roof-'+i,name:'Hearth low-pitch roof',levelId:'level:0',elevationUnit:'storeys',vertices:[[X+x0,Y+y0],[X+x1,Y+y0],[X+x1,Y+y1],[X+x0,Y+y1]],profile:{axis:'Y',knots:[[X+x0,1.04],[X+x1,1.07]]},baseElevation:1,surfaceTile:'roofs_01_22',closureTile:'tian_masonry_ivory_1'}})));
const supplies=read('tools/hearth-supplies.json').map(item=>item.x===X+9&&item.y===Y?{...item,x:X+7}:item.x===X+9&&item.y===Y+1?{...item,y:Y}:item);commit(supplies.flatMap(({type,count,x,y,z})=>Array.from({length:count},()=>({type:'place',assetId:'item:'+type,x,y,z,storeInContainer:true}))));
commit(read('tools/hearth-yard.json'));
commit([place('detail-art','W',0,3),place('detail-art','N',6,0),place('detail-tea','S',8,2),place('detail-bath-mirror','S',9,6),place('detail-bath-towel','E',7,7)]);
const out=process.argv[2]?pathToFileURL(path.resolve(process.argv[2])+'/'):new URL('../../../docs/project-zomboid/evidence/363-studio-supplies/rebuilt/',import.meta.url);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(new URL('house.json',out),JSON.stringify(model.export(),null,2));fs.writeFileSync(new URL('commands.json',out),JSON.stringify(receipts,null,2));console.log(JSON.stringify({name:model.plan.name,revision:model.revision,rooms:model.scene.rooms.length,objects:model.scene.objects.length}));
