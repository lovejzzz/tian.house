import test from 'node:test';import assert from 'node:assert/strict';
import {prepareRenderPrograms} from '../src/prepare-render-programs.js';
test('shared renderer state is restored while shader compilation is still pending',async()=>{
 let finish;const changes=[],renderer={toneMapping:7,compileAsync(){assert.equal(this.toneMapping,0);return new Promise(resolve=>{finish=resolve;});}};
 const pending=prepareRenderPrograms(renderer,{}, {},0,v=>changes.push(v));
 assert.equal(renderer.toneMapping,7);assert.deepEqual(changes,[true]);finish();await pending;assert.deepEqual(changes,[true,false]);
});
test('synchronous and asynchronous compiler failures release the draw gate and restore render state',async()=>{
 for(const compileAsync of [()=>{throw Error('compile');},()=>Promise.reject(Error('compile'))]){
  const renderer={toneMapping:7,compileAsync},changes=[];
  await assert.rejects(prepareRenderPrograms(renderer,{}, {},0,v=>changes.push(v)),/compile/);
  assert.equal(renderer.toneMapping,7);assert.deepEqual(changes,[true,false]);
 }
});
test('capture compiler sees excluded sources hidden but restores live visibility before yielding',async()=>{
 const {prepareCapturePrograms}=await import('../src/prepare-render-programs.js');
 const media={visible:true,userData:{indirectCaptureExclude:true}},alreadyHidden={visible:false,userData:{indirectCaptureExclude:true}},lamp={visible:true,userData:{}};
 const scene={traverse:fn=>[media,alreadyHidden,lamp].forEach(fn)};let finish;
 const renderer={toneMapping:7,compileAsync(){assert.equal(media.visible,false);assert.equal(lamp.visible,true);return new Promise(resolve=>finish=resolve);}};
 const pending=prepareCapturePrograms(renderer,scene,{},0);
 assert.equal(media.visible,true);assert.equal(alreadyHidden.visible,false);assert.equal(renderer.toneMapping,7);finish();await pending;
 renderer.compileAsync=()=>{assert.equal(media.visible,false);throw Error('driver');};
 await assert.rejects(prepareCapturePrograms(renderer,scene,{},0),/driver/);assert.equal(media.visible,true);
});
