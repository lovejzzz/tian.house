import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {StructuredWorkshopModel} from '../src/structured-workshop-model.js';
import {workshopCatalog} from '../src/workshop-model.js';
import {SceneSession} from '../src/scene-session.js';
const properties={...JSON.parse(fs.readFileSync(new URL('../private-assets/world/properties.json',import.meta.url))),floor:{solidfloor:''},wall_0:{WallW:''},wall_1:{WallN:''},mug:{TianMount:'table'}};
const atlas=JSON.parse(fs.readFileSync(new URL('../private-assets/atlas.json',import.meta.url))),catalog=workshopCatalog(properties,atlas,{}).entries;catalog.push({id:'tile:mug',source:'mug',parts:[{dx:0,dy:0,tile:'mug'}]});
function setup(){const m=new StructuredWorkshopModel({version:1,squares:[],items:[]},[0,0,20,20],properties,catalog);m.begin('Room');m.structure({type:'room.add',room:{id:'room',name:'Room',levelId:'level:0',z:0,rect:[1,1,18,18],floorTile:'floor',wallN:'wall_1',wallW:'wall_0'}});m.commit();m.begin('Furnish');for(const[id,x,y]of [['tile:carpentry_01_32',7,7],['tile:mug',7,7],['tile:furniture_shelving_01_26',8,5]])assert.equal(m.place(catalog.find(e=>e.id===id),x,y,0).ok,true);m.place({itemType:'Base.WaterBottle',storeInContainer:true},8,5,0);m.commit();return m;}
test('verified rotation preserves identities, support and stock while changing source-facing sprites',()=>{
 const m=setup(),before=m.export(),[table,mug,shelf]=m.scene.objects,ids=[table.id,shelf.id],stockId=m.scene.legacy.items[0].id;m.begin('Rotate');assert.equal(m.structure({type:'objects.rotate',ids}).ok,true);m.commit();
 const [t,d,s]=m.scene.objects;assert.deepEqual(m.scene.objects.map(o=>o.id),[table.id,mug.id,shelf.id]);assert.equal(t.assetId,'tile:carpentry_01_35');assert.equal(s.assetId,'tile:furniture_shelving_01_25');assert.equal(d.hostId,t.id);assert.ok(t.parts.some(p=>t.x+p.dx===d.x&&t.y+p.dy===d.y));
 assert.equal(m.scene.legacy.items[0].id,stockId);const item=m.plan.items[0];assert.ok(s.parts.some(p=>s.x+p.dx===item.x&&s.y+p.dy===item.y&&p.tile===item.storageTile));
 m.undo();assert.deepEqual(m.export(),before);m.redo();assert.equal(new StructuredWorkshopModel(m.export(),m.bounds,properties,catalog).scene.objects[0].assetId,t.assetId);
});
test('unavailable rotation is rejected atomically and the session uses the same catalog resolver',async()=>{
 const m=setup(),ids=[m.scene.objects[0].id,m.scene.objects[2].id],before=m.export();assert.equal(m.structure({type:'objects.rotate',ids,turns:1}).ok,false);assert.deepEqual(m.export(),before);
 const repo={async save(){},async load(){}};const session=await SceneSession.create(m.scene,properties,repo,catalog),request={sceneId:m.scene.id,baseRevision:m.scene.revision,requestId:'rotate',operations:[{type:'objects.rotate',ids}]};const preview=session.preview(request);assert.equal(preview.ok,true);assert.equal((await session.execute(request)).ok,true);assert.deepEqual(session.read().objects,preview.scene.objects);
});

test('cycling the available rotations does not drift the furniture group',()=>{
 const m=setup(),before=m.export(),ids=[m.scene.objects[0].id,m.scene.objects[2].id];assert.equal(m.structure({type:'objects.rotate',ids}).ok,true);assert.equal(m.structure({type:'objects.rotate',ids}).ok,true);assert.deepEqual(m.scene.objects,before.sceneDocument.objects);assert.deepEqual(m.plan.items,before.items);
});
