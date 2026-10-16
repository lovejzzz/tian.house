import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyOpeningProfile} from '../src/legacy-opening-profiles.js';
import {sceneWallVolumes} from '../src/scene-wall-volumes.js';
import {prismSolid} from '../src/prism-solid.js';
import {movePhysicalBody} from '../src/physical-body.js';
const metrics={cellSize:1,storeyHeight:3,wallHeight:3,thickness:.2};
test('reviewed legacy door profiles preserve wall jambs and lintel while admitting standing body',()=>{
 for(const [tile,axis]of [['fixtures_doors_01_0','W'],['fixtures_doors_01_1','N'],['fixtures_doors_01_48','W'],['fixtures_doors_01_49','N']]){
  const p={['door'+axis]:'',...(['fixtures_doors_01_48','fixtures_doors_01_49'].includes(tile)?{doorTrans:''}:{})},scene={levels:[{id:'g',index:0}],walls:[{id:'wall',levelId:'g',x:0,y:0,axis,tile:'wall'}],openings:[{id:'door',hostWallId:'wall',kind:'door',tile}]},before=structuredClone(scene);
  const r=sceneWallVolumes(scene,{[tile]:p},metrics);assert.equal(r.complete,true);assert.equal(r.volumes.length,1);assert.ok(r.volumes[0].collision.length>=3);
  const solids=r.volumes[0].collision.map(prismSolid),profile=legacyOpeningProfile(tile,'door',p),mid=(profile.rect[0]+profile.rect[2])/2;
  const pos=axis==='N'?[mid,-1,.901]:[-1,mid,.901],delta=axis==='N'?[0,2,0]:[2,0,0];
  assert.equal(movePhysicalBody(solids,pos,delta,[.25,.25,.9]).blocked,false);
  pos[2]=2.8;assert.equal(movePhysicalBody(solids,pos,delta,[.25,.25,.9]).blocked,true);assert.deepEqual(scene,before);
  assert.equal(legacyOpeningProfile(tile,'window',p),null);assert.equal(legacyOpeningProfile(tile,'door',{}),null);
  assert.equal(sceneWallVolumes(scene,{[tile]:{...p,TianDoorProfile:[.2,.1,.8,1]}},metrics).volumes[0].opening[0],.2);
 }
 assert.equal(legacyOpeningProfile('fixtures_doors_01_50','door',{doorW:'',doorTrans:''}),null);
});
test('corner aperture clips its jamb and retains adjacent geometry',()=>{
 const tile='fixtures_doors_01_49',scene={levels:[{id:'g',index:0}],walls:[{id:'a',levelId:'g',x:0,y:0,axis:'N',tile:'wall'},{id:'b',levelId:'g',x:0,y:0,axis:'W',tile:'wall'}],openings:[{id:'door',hostWallId:'a',kind:'door',tile}]};
 const result=sceneWallVolumes(scene,{[tile]:{doorN:'',doorTrans:''}},metrics);
 assert.equal(result.complete,true);assert.equal(result.unresolved.length,0);assert.equal(result.volumes.length,2);assert.equal(result.volumes[0].junctionClipped,true);
});
