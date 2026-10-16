import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {groundLocalMatrix,groundSelection,weaponStaticModel} from '../src/ground-models.js';
import {useFixtureCatalog} from './fixtures/catalog.mjs';
const near=(a,b)=>assert.ok(a.distanceTo(b)<1e-10,`${a.toArray()} != ${b.toArray()}`);
test('weapon model override distinguishes empty or null variants from absent variants',()=>{
 assert.equal(weaponStaticModel({staticModel:'',weaponSprite:'Hammer'},{}),'');
 assert.equal(weaponStaticModel({modelIndex:0,weaponSpritesByIndex:[null],staticModel:'Other'},{}),null);
 assert.equal(weaponStaticModel({modelIndex:0,weaponSpritesByIndex:[''],staticModel:'Other'},{}),'');
 assert.throws(()=>weaponStaticModel({modelIndex:3,weaponSpritesByIndex:['First','Second']},{}),RangeError);
});
test('ground weapons dispatch to weapon override and retain explicit variant identity',()=>{
 const catalog=useFixtureCatalog(),p=catalog['Base.Hammer'].properties;
 Object.assign(p,{ItemType:'base:weapon',WeaponSprite:'Hammer',StaticModel:'IgnoredScriptStatic',WeaponSpritesByIndex:'Hammer;HammerForged'});
 assert.deepEqual(groundSelection({type:'Base.Hammer'}),{name:'Hammer',weaponFallback:true});
 assert.deepEqual(groundSelection({type:'Base.Hammer',modelIndex:1,staticModel:'Other'}),{name:'HammerForged',weaponFallback:true});
 assert.deepEqual(groundSelection({type:'Base.Hammer',staticModel:'Other'}),{name:'Other',weaponFallback:true});
 p.WorldStaticModel='Base.WorldHammer';assert.deepEqual(groundSelection({type:'Base.Hammer',modelIndex:1}),{name:'WorldHammer',weaponFallback:false});
 delete p.WorldStaticModel;delete p.WeaponSprite;assert.equal(groundSelection({type:'Base.Hammer'}),null);
});
test('world attachment inverse precedes mesh transform and scale',()=>{
 const model={attachments:{world:{offset:[1,2,0],rotate:[0,0,90],scale:2}},meshTransform:new THREE.Matrix4().makeTranslation(3,0,0).toArray(),scale:2};
 // (1,0,0) -> scale 6 -> translate (9,0,0) -> subtract (1,2,0), inverse rotate and /2.
 near(new THREE.Vector3(1,0,0).applyMatrix4(groundLocalMatrix(model,{worldScale:3})),new THREE.Vector3(-1,-4,0));
});
test('weapon fallback rotates axes even without a world attachment; ground attachment is not used',()=>{
 const model={attachments:{ground:{offset:[99,99,99],rotate:[0,0,0]}}};
 near(new THREE.Vector3(1,0,0).applyMatrix4(groundLocalMatrix(model,{weaponFallback:true})),new THREE.Vector3(0,1,0));
 near(new THREE.Vector3(0,1,0).applyMatrix4(groundLocalMatrix(model,{weaponFallback:true})),new THREE.Vector3(1,0,0));
 near(new THREE.Vector3(0,0,1).applyMatrix4(groundLocalMatrix(model,{weaponFallback:true})),new THREE.Vector3(0,0,-1));
 near(new THREE.Vector3(1,2,3).applyMatrix4(groundLocalMatrix(model)),new THREE.Vector3(1,2,3));
});
