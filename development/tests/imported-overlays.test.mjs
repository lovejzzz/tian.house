import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkshopModel,workshopCatalog} from '../src/workshop-model.js';
test('wood floor overlays are catalogued as flooring but retain base floors and furniture through undo and reload',()=>{
 const overlay='floors_overlay_wood_01_0',props={base:{solidfloor:''},replacement:{solidfloor:''},chair:{IsMoveAble:''},[overlay]:{FloorOverlay:''}},atlas={regions:{base:{},chair:{},[overlay]:{}}};
 const entry=workshopCatalog(props,atlas,{items:{}}).entries.find(e=>e.source===overlay);
 assert.equal(entry.category,'Floors & terrain');
 const model=new WorkshopModel({version:1,squares:[{x:0,y:0,z:0,tiles:['base','chair']}],items:[]},[0,0,2,2],props);
 model.begin('Overlay');assert.equal(model.place(entry,0,0,0).ok,true);model.commit();
 assert.deepEqual(model.square(0,0,0).tiles,['base',overlay,'chair']);
 model.undo();assert.deepEqual(model.square(0,0,0).tiles,['base','chair']);model.redo();
 const restored=new WorkshopModel(JSON.parse(JSON.stringify(model.export())),[0,0,2,2],props);
 assert.deepEqual(restored.square(0,0,0).tiles,['base',overlay,'chair']);
 restored.begin('Replace floor');restored.place({parts:[{dx:0,dy:0,tile:'replacement'}]},0,0,0);restored.commit();
 assert.deepEqual(restored.square(0,0,0).tiles,['replacement',overlay,'chair']);
});
