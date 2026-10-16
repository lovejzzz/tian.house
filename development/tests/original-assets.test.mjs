import test from 'node:test';
import assert from 'node:assert/strict';
import {installOriginalAssets} from '../src/original-assets.js';
import {workshopCatalog,WorkshopModel} from '../src/workshop-model.js';
test('original rugs are complete catalog prefabs and survive move/undo without removing flooring',()=>{
 const props={floor:{solidfloor:''}},atlas={regions:{floor:{}}};installOriginalAssets(props,atlas);
 const catalog=workshopCatalog(props,atlas,{items:{}});
 for(const [source,size]of [['tian_rug_linen_0',6],['tian_rug_moss_0',6],['tian_rug_runner_0',2],['tian_rug_linen_w_0',6],['tian_rug_moss_w_0',6],['tian_rug_runner_w_0',2]]){
  const entry=catalog.entries.find(e=>e.source===source);assert.equal(entry.parts.length,size);
  const plan={version:1,name:'Rug test',squares:[],items:[]};
  for(let x=0;x<8;x++)for(let y=0;y<8;y++)plan.squares.push({x,y,z:0,tiles:['floor']});
  const m=new WorkshopModel(plan,[0,0,8,8],props);m.begin('Place rug');m.place(entry,2,2,0);m.commit();
  for(const p of entry.parts)assert.deepEqual(m.square(2+p.dx,2+p.dy,0).tiles,['floor',p.tile]);
  m.undo();assert.ok(m.plan.squares.every(s=>s.tiles.length===1));m.redo();
  assert.equal(m.plan.squares.flatMap(s=>s.tiles).filter(t=>t.startsWith('tian_rug')).length,size);
 }
});
