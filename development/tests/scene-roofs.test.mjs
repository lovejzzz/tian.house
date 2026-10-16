import test from 'node:test';import assert from 'node:assert/strict';import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';import {World} from '../src/world.js';
const props={floor:{solidfloor:''},roof:{solidfloor:'',exterior:''},wall_0:{WallW:''},wall_1:{WallN:''},chair:{solid:''}};
function setup(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props);m.structure({type:'room.add',room:{id:'r',name:'Room',levelId:'level:0',z:0,rect:[2,2,8,8],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});return m;}
const roof={type:'roof.set',roomId:'r',roof:{id:'roof-id',kind:'flat',tile:'roof'}};
test('flat roof provides rain cover and tracks room resize, persistence and undo',()=>{const m=setup(),before=m.export();m.begin('Roof');assert.equal(m.structure(roof).ok,true);m.commit();assert.ok(m.square(4,4,1).tiles.includes('roof'));const w=new World({playableBounds:m.bounds},props);w.setHousePlan(m.export());assert.equal(w.hasRainBlockingTile(4,4,1),true);assert.equal(new StructuredWorkshopModel(m.export(),m.bounds,props).scene.rooms[0].roof.id,'roof-id');assert.equal(m.structure({type:'room.resize',roomId:'r',side:'east',coordinate:10}).ok,true);assert.ok(m.square(9,4,1).tiles.includes('roof'));m.undo();assert.deepEqual(m.export(),before);m.redo();assert.equal(m.scene.rooms[0].roof.id,'roof-id');});
test('roofs cannot overwrite an upper room or leave rooftop furniture suspended on removal',()=>{const m=setup();m.structure(roof);m.place({id:'chair',parts:[{dx:0,dy:0,tile:'chair'}]},4,4,1);const before=m.export();assert.equal(m.structure({type:'roof.remove',roomId:'r'}).ok,false);assert.deepEqual(m.export(),before);assert.equal(m.structure({type:'level.copyLayout',fromLevelId:'level:0',toIndex:1,copyId:'upper'}).ok,false);assert.deepEqual(m.export(),before);});
test('invalid roof materials, unsupported roof kinds and topology changes reject without mutation',()=>{const m=setup();for(const r of [{...roof.roof,tile:'chair'},{...roof.roof,kind:'pitched'}])assert.equal(m.structure({...roof,roof:r}).ok,false);m.structure(roof);const before=m.export();assert.equal(m.structure({type:'room.split',roomId:'r',axis:'x',coordinate:5,newRoomId:'b'}).ok,false);assert.deepEqual(m.export(),before);assert.equal(m.structure({type:'roof.remove',roomId:'r'}).ok,true);assert.equal(m.square(4,4,1),undefined);});

test('gable slope recipes use both directions, odd ridge tiles and continuous six-step height bands',async()=>{const {roofCells}=await import('../src/scene-roofs.js');for(const axis of ['X','Y'])for(const span of [2,3,7,12,13,19]){const room={rect:axis==='X'?[0,0,4,span]:[0,0,span,4],roof:{kind:'gable',axis,source:'roofs_30_08'}};const cells=roofCells(room,1);assert.equal(cells.length,span*4);assert.equal(new Set(cells.map(c=>c.x+','+c.y)).size,cells.length);assert.equal(Math.max(...cells.map(c=>c.z)),1+Math.floor(Math.floor((span-1)/2)/6));if(span===7)assert.deepEqual(cells.filter(c=>axis==='X'?c.x===0:c.y===0).map(c=>Number(c.tile.split('_').at(-1))),axis==='X'?[29,28,27,99,2,1,0]:[16,17,18,106,11,12,13]);}});

test('both ridge orientations match the source atlas height at every supported step',async()=>{const fs=await import('node:fs');const atlas=JSON.parse(fs.readFileSync(new URL('../private-assets/atlas.json',import.meta.url))).regions;const {roofCells}=await import('../src/scene-roofs.js');for(const axis of ['X','Y'])for(let step=1;step<6;step++){const span=step*2+1,room={rect:axis==='X'?[0,0,2,span]:[0,0,span,2],roof:{kind:'gable',axis,source:'roofs_30_08'}};const ridge=roofCells(room,1).find(c=>axis==='X'?c.y===step:c.x===step);const r=atlas[ridge.tile];assert.equal(r.oy+r.h,256-step*32,axis+' ridge step '+step);}});

test('gable ends preserve seven-cell source geometry in the matching finish and follow rotation',async()=>{const {roofEndCells}=await import('../src/scene-roofs.js');const scene={walls:[{id:'w',axis:'W',tile:'wall_0'},{id:'n',axis:'N',tile:'wall_1'}]},room={rect:[2,2,6,9],wallIds:['w','n'],roof:{kind:'gable',axis:'X',source:'roofs_30_08'}};const ends=roofEndCells(scene,room,1);assert.deepEqual(ends.filter(c=>c.x===6).map(c=>Number(c.tile.split('_').at(-1))),[13,12,11,35,2,1,0]);assert.equal(ends.length,14);room.roof.axis='Y';const rotated=roofEndCells(scene,room,1);assert.equal(rotated.length,8);assert.ok(rotated.every(c=>c.y===2||c.y===9));});
test('gable material changes retain end geometry and roof identity; conflicting upper structures reject',async()=>{const fs=await import('node:fs'),sourceProps=JSON.parse(fs.readFileSync(new URL('../private-assets/world/properties.json',import.meta.url)));const m=setup();Object.assign(m.properties,sourceProps);const initial={id:'gable',kind:'gable',axis:'X',source:'roofs_30_08'};assert.equal(m.structure({type:'roof.set',roomId:'r',roof:initial}).ok,true);const caps=m.plan.squares.flatMap(s=>s.tiles.filter(t=>t.startsWith('walls_exterior_roofs_')));assert.ok(caps.length);m.begin('Material');assert.equal(m.structure({type:'roof.set',roomId:'r',roof:{...initial,source:'roofs_30_01'}}).ok,true);m.commit();assert.deepEqual(m.plan.squares.flatMap(s=>s.tiles.filter(t=>t.startsWith('walls_exterior_roofs_'))),caps);assert.equal(m.scene.rooms[0].roof.id,'gable');const saved=m.export();assert.equal(m.structure({type:'room.add',room:{id:'upper',levelId:m.scene.levels.find(l=>l.index===1).id,z:1,rect:[3,3,7,7],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,false);assert.deepEqual(m.export(),saved);m.undo();assert.equal(m.scene.rooms[0].roof.source,'roofs_30_08');});


test('resizing a gable across height bands adds levels, preserves identity and roundtrips history',async()=>{
 const fs=await import('node:fs'),sourceProps=JSON.parse(fs.readFileSync(new URL('../private-assets/world/properties.json',import.meta.url)));
 const m=setup();Object.assign(m.properties,sourceProps);
 assert.equal(m.structure({type:'roof.set',roomId:'r',roof:{id:'gable',kind:'gable',axis:'X',source:'roofs_30_08'}}).ok,true);
 const before=m.export();m.begin('Widen roof');
 assert.equal(m.structure({type:'room.resize',roomId:'r',side:'south',coordinate:15}).ok,true);m.commit();
 assert.equal(m.scene.rooms[0].roof.id,'gable');assert.ok(m.scene.levels.some(l=>l.index===2));
 assert.ok(m.plan.squares.some(s=>s.z===2&&s.tiles.some(t=>t.startsWith('roofs_30_'))));
 const expanded=m.export();assert.deepEqual(new StructuredWorkshopModel(expanded,m.bounds,m.properties).export(),expanded);
 m.undo();assert.deepEqual(m.export(),before);m.redo();assert.deepEqual(m.export(),expanded);
 assert.equal(m.structure({type:'room.resize',roomId:'r',side:'south',coordinate:8}).ok,true);
 assert.equal(m.plan.squares.some(s=>s.z===2&&s.tiles.some(t=>t.startsWith('roofs_30_'))),false);
});

test('gable resize rejects occupied upper volume and height overflow without changing the scene',async()=>{
 const fs=await import('node:fs'),sourceProps=JSON.parse(fs.readFileSync(new URL('../private-assets/world/properties.json',import.meta.url)));
 const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,48,48],{...props,...sourceProps});
 assert.equal(m.structure({type:'room.add',room:{id:'r',name:'Room',levelId:'level:0',z:0,rect:[2,2,8,8],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);
 assert.equal(m.structure({type:'roof.set',roomId:'r',roof:{id:'gable',kind:'gable',axis:'X',source:'roofs_30_08'}}).ok,true);
 const before=m.export();assert.equal(m.structure({type:'room.resize',roomId:'r',side:'south',coordinate:39}).ok,false);assert.match(m.lastError,/height/);assert.deepEqual(m.export(),before);
 assert.equal(m.structure({type:'room.add',room:{id:'upper',name:'Upper',levelId:'level:2',z:2,rect:[3,8,7,12],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}}).ok,true);
 const occupied=m.export();assert.equal(m.structure({type:'room.resize',roomId:'r',side:'south',coordinate:15}).ok,false);assert.match(m.lastError,/overlaps/);assert.deepEqual(m.export(),occupied);
});


test('wide gables use matching siding for full bands and source caps',async()=>{
 const {gableFinish}=await import('../src/scene-roof-finishes.js'),{roofEndCells}=await import('../src/scene-roofs.js');
 for(const axis of ['W','N']){const finish=gableFinish('walls_exterior_house_01_'+(axis==='W'?32:33),axis);assert.equal(finish.source,'walls_exterior_roofs_30_03');assert.equal(finish.offset,0);assert.equal(finish.fullTile,'walls_exterior_house_01_'+(axis==='W'?32:33));}
 const m=setup();m.structure({type:'room.resize',roomId:'r',side:'south',coordinate:15});const room=m.scene.rooms[0];room.roof={kind:'gable',axis:'X',source:'roofs_30_01'};
 const cells=roofEndCells(m.scene,room,1);assert.ok(cells.some(c=>c.tile==='walls_exterior_house_01_32'));assert.ok(cells.some(c=>c.tile==='walls_exterior_roofs_30_03_32'));assert.equal(cells.some(c=>c.tile==='wall_0'),false);
});

test('flat overhangs provide exterior rain cover and survive roof edits, undo and reload',()=>{
 const m=setup();m.begin('Overhang');assert.equal(m.structure({...roof,roof:{...roof.roof,overhang:1}}).ok,true);m.commit();assert.ok(m.square(1,1,1).tiles.includes('roof'));assert.equal(m.square(0,0,1),undefined);
 const w=new World({playableBounds:m.bounds},props);w.setHousePlan(m.export());assert.equal(w.hasRainBlockingTile(1,1,1),true);
 const exported=m.export();assert.deepEqual(new StructuredWorkshopModel(exported,m.bounds,props).export(),exported);m.undo();assert.equal(m.scene.rooms[0].roof,undefined);m.redo();assert.equal(m.scene.rooms[0].roof.overhang,1);
 for(const overhang of [-1,3,.5,NaN]){assert.equal(m.structure({...roof,roof:{...roof.roof,overhang}}).ok,false);assert.deepEqual(m.export(),exported);}
});
test('gable-end overhang extends along the ridge without lifting its slope or moving its walls',async()=>{
 const {roofCells,roofEndCells}=await import('../src/scene-roofs.js');for(const axis of ['X','Y']){
  const room={rect:[2,2,6,9],wallIds:[],roof:{kind:'gable',axis,source:'roofs_30_08'}},base=roofCells(room,1),ends=roofEndCells({walls:[]},room,1);room.roof.overhang=1;const extended=roofCells(room,1);
  assert.ok(extended.length>base.length);assert.deepEqual(extended.filter(c=>c.x>=2&&c.x<6&&c.y>=2&&c.y<9),base);assert.deepEqual(roofEndCells({walls:[]},room,1),ends);
 }
});
test('overhangs reject neighboring upper structures and lot overflow atomically',()=>{
 const m=setup();m.structure({type:'room.add',room:{id:'upper',levelId:'level:1',z:1,rect:[8,2,12,8],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});const before=m.export();assert.equal(m.structure({...roof,roof:{...roof.roof,overhang:1}}).ok,false);assert.deepEqual(m.export(),before);
 const near=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],props);near.structure({type:'room.add',room:{id:'r',levelId:'level:0',z:0,rect:[0,0,4,4],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});assert.equal(near.structure({...roof,roof:{...roof.roof,overhang:1}}).ok,false);
});
