import test from 'node:test';import assert from 'node:assert/strict';
import {polygonRoofFootprint} from '../src/polygon-roof-footprint.js';
import {compilePolygonFootprint,chamferRectangle,pointInPolygon,wallCrossesBox} from '../src/polygon-footprint.js';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {World} from '../src/world.js';
import {managedRoofTiles,withoutRoofTiles} from '../src/workshop-roof-view.js';
const props={floor:{solidfloor:''},roof:{solidfloor:'',exterior:''},wall_0:{WallW:''},wall_1:{WallN:''},chair:{solid:''}};
const roof={type:'roof.set',roomId:'r',roof:{id:'roof-id',kind:'flat',tile:'roof',overhang:0}};
function model(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,30,30],props);assert.equal(m.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[5,5,13,12],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);return m;}
function contains(cells,x,y){const c=cells.find(c=>c.x===Math.floor(x)&&c.y===Math.floor(y));return !!c&&(c.full||c.polygons.some(p=>pointInPolygon([x-c.x,y-c.y],p)));}
test('all four roof chamfers preserve exact area with continuous square eaves, including translated world coordinates',()=>{
 for(const corner of ['NW','NE','SE','SW'])for(const offset of [0,8000,-1000000])for(const d of [0,1,2]){
  const rect=[offset+5,offset+5,offset+13,offset+12],source=compilePolygonFootprint(chamferRectangle(rect,corner,3));const cells=polygonRoofFootprint(source.cells,d);
  assert.equal(cells.reduce((sum,c)=>sum+c.area,0),(8+2*d)*(7+2*d)-4.5);
  assert.ok(cells.some(c=>!c.full));assert.equal(new Set(cells.map(c=>c.x+','+c.y)).size,cells.length);
  const local=polygonRoofFootprint(compilePolygonFootprint(chamferRectangle([5,5,13,12],corner,3)).cells,d);assert.deepEqual(cells.map(c=>({...c,x:c.x-offset,y:c.y-offset})),local);
 }
 // Integer-only translations of a half-cell miss this region of continuous dilation.
 const expanded=polygonRoofFootprint(compilePolygonFootprint([[0,0],[1,0],[0,1]]).cells,1);assert.equal(contains(expanded,.8,.8),true);assert.equal(expanded.reduce((s,c)=>s+c.area,0),8.5);
});
test('concave and chamfered eaves match an independent polygon/square intersection oracle',()=>{
 const outlines=[[[2,2],[8,2],[8,5],[5,5],[5,8],[2,8]],[[2,2],[8,2],[8,8],[6,8],[6,4],[4,4],[4,8],[2,8]],chamferRectangle([2,2,10,9],'NE',3),[[2,5],[5,2],[8,5],[5,8]]];
 for(const polygon of outlines)for(const d of [0,1,2]){
  const cells=polygonRoofFootprint(compilePolygonFootprint(polygon).cells,d),index=new Map(cells.map(c=>[c.x+','+c.y,c]));
  for(let x=-.875;x<13;x+=.25)for(let y=-.8125;y<12;y+=.25){
   const expected=pointInPolygon([x,y],polygon)||polygon.some((a,i)=>wallCrossesBox(a,polygon[(i+1)%polygon.length],[x-d,y-d,x+d,y+d]));
   const c=index.get(Math.floor(x)+','+Math.floor(y)),actual=!!c&&(c.full||c.polygons.some(p=>pointInPolygon([x-c.x,y-c.y],p)));
   assert.equal(actual,expected,`${JSON.stringify(polygon)} eave ${d} at ${x},${y}`);
  }
 }
});
test('public roof edits share partial geometry with rendering, rain, support, visibility and persistent history',()=>{
 const m=model();assert.equal(m.structure({type:'room.chamfer',roomId:'r',corner:'SE',distance:3}).ok,true);const before=m.export();
 m.begin('Polygon roof');assert.equal(m.structure(roof).ok,true);m.commit();const saved=m.export(),masks=m.plan.polygonGeometry.floors.filter(f=>f.roofId==='roof-id');
 assert.equal(masks.reduce((s,c)=>s+c.area,0),51.5);assert.equal(masks.every(c=>c.z===1&&c.tile==='roof'),true);
 const w=new World({playableBounds:m.bounds},props);w.setHousePlan(saved);
 assert.equal(w.floorAt(11.1,10.1,1),true);assert.equal(w.floorAt(11.9,10.9,1),false);assert.equal(w.hasRoof(11.1,10.1,0),true);assert.equal(w.hasRoof(11.9,10.9,0),false);
 const hidden=withoutRoofTiles(m.plan.squares,managedRoofTiles(m.scene));assert.equal(hidden.some(s=>s.tiles.includes('roof')),false);assert.equal(hidden.some(s=>s.tiles.includes('floor')),true);
 assert.deepEqual(new StructuredWorkshopModel(saved,m.bounds,props).export(),saved);m.undo();assert.deepEqual(m.export(),before);m.redo();assert.deepEqual(m.export(),saved);
 assert.equal(m.structure({...roof,roof:{...roof.roof,overhang:1}}).ok,true);w.setHousePlan(m.export());assert.equal(w.floorAt(11.9,10.9,1),true);assert.equal(w.hasRoof(11.9,10.9,0),true);
 assert.equal(m.plan.polygonGeometry.floors.filter(f=>f.roofId==='roof-id').reduce((s,c)=>s+c.area,0),85.5);
});
test('cutting a roof follows the room and atomically protects rooftop occupants, while partial cells cannot support whole furniture',()=>{
 const m=model();assert.equal(m.structure(roof).ok,true);const before=m.export();m.begin('Cut roof');assert.equal(m.structure({type:'room.chamfer',roomId:'r',corner:'SE',distance:3}).ok,true);m.commit();assert.equal(m.scene.rooms[0].roof.id,'roof-id');
 const after=m.export();assert.equal(m.place({id:'chair',parts:[{dx:0,dy:0,tile:'chair'}]},11,10,1).ok,false);assert.deepEqual(m.export(),after);
 m.undo();assert.deepEqual(m.export(),before);assert.equal(m.place({id:'chair',parts:[{dx:0,dy:0,tile:'chair'}]},11,10,1).ok,true);const occupied=m.export();assert.equal(m.structure({type:'room.chamfer',roomId:'r',corner:'SE',distance:3}).ok,false);assert.match(m.lastError,/rooftop/);assert.deepEqual(m.export(),occupied);
});
test('polygon roof eaves reject boundary overflow and existing upper structures without changing scene',()=>{
 const m=model();assert.equal(m.structure({type:'room.chamfer',roomId:'r',corner:'NW',distance:3}).ok,true);assert.equal(m.structure({type:'room.add',room:{id:'upper',levelId:'level:1',z:1,rect:[13,5,17,9],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);const before=m.export();assert.equal(m.structure({...roof,roof:{...roof.roof,overhang:1}}).ok,false);assert.match(m.lastError,/overlaps/);assert.deepEqual(m.export(),before);
 const near=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props);near.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[0,0,8,8],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});near.structure({type:'room.chamfer',roomId:'r',corner:'NW',distance:3});const initial=near.export();assert.equal(near.structure({...roof,roof:{...roof.roof,overhang:1}}).ok,false);assert.deepEqual(near.export(),initial);
});
