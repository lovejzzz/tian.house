import test from 'node:test';import assert from 'node:assert/strict';import {resolveBoneMask} from '../src/bone-mask.js';
const bones=[{name:'Root',parent:null},{name:'Spine',parent:'Root'},{name:'Spine1',parent:'Spine'},{name:'Hand',parent:'Spine1'},{name:'Leg',parent:'Root'},{name:'Prop2',parent:'Hand'}];
test('reading mask preserves lower body, half spine and full upper descendants',()=>{
 const mask=resolveBoneMask(bones,[{boneName:'Spine',weight:'.50',includeDescendants:'false'},{boneName:'Spine1'},{boneName:'Prop2'}]);
 assert.deepEqual([...mask.values()],[0,.5,1,1,0,1]);
});
test('overlap uses maximum rather than last assignment and no-mask differs from empty mask',()=>{
 for(const entries of [[{boneName:'Spine',weight:.8},{boneName:'Hand',weight:.2}],[{boneName:'Hand',weight:.2},{boneName:'Spine',weight:.8}]])assert.equal(resolveBoneMask(bones,entries).get('Hand'),Math.fround(.8));
 assert.deepEqual([...resolveBoneMask(bones,null).values()],bones.map(()=>1));
 assert.deepEqual([...resolveBoneMask(bones,[]).values()],bones.map(()=>0));
 assert.equal(resolveBoneMask(bones,[{boneName:'Missing'},{boneName:'Hand',weight:-1}]).get('Hand'),0);
 assert.equal(resolveBoneMask(bones,[{boneName:'Hand',weight:2}]).get('Prop2'),2);
});
