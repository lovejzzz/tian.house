import test from 'node:test';import assert from 'node:assert/strict';
import {textileDyePixels,sourceTextureKey} from '../src/source-patch-texture.js';
const fixture=()=>({width:64,height:64,color:Uint8Array.from({length:64*64*4},(_,i)=>[128,90,60,173][i%4])});
test('dye is an optional deterministic derivative retaining source and alpha',()=>{
 const source=fixture(),copy=source.color.slice(),profile={strength:.28,seed:53};
 assert.equal(textileDyePixels(source),source);assert.equal(textileDyePixels(source,{...profile,strength:0}),source);
 const out=textileDyePixels(source,profile);assert.deepEqual(source.color,copy);assert.deepEqual(out,textileDyePixels(source,profile));
 assert.ok(new Set(out.color.filter((_,i)=>i%4===0)).size>4);
 for(let i=0;i<out.color.length;i+=4){assert.equal(out.color[i+3],173);assert.ok(Math.abs(out.color[i]-128)<12);}
 assert.notDeepEqual(out,textileDyePixels(source,{...profile,seed:54}));
 assert.throws(()=>textileDyePixels(source,{strength:2,seed:1}),/Invalid/);
});
test('dye parameters distinguish source cache entries',()=>{
 const t={kind:'source-patch',sourceTile:'cloth'};
 assert.notEqual(sourceTextureKey(t),sourceTextureKey({...t,dyeVariation:{strength:.28,seed:53}}));
});
