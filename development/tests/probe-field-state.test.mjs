import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector2,Vector3,Vector4} from 'three';
import {writeProbeField,withProbeField} from '../src/probe-field-state.js';
const make=()=>({count:{value:0},bounds:{value:[new Vector4(),new Vector4()]},positions:{value:[new Vector3(),new Vector3()]},heights:{value:[new Vector2(),new Vector2()]},coefficients:{value:Array.from({length:18},()=>new Vector3())}});
const regions=[{rect:[0,0,4,4],position:[2,2,1.35],minZ:0,maxZ:3}];
const values=n=>[Array.from({length:9},()=>new Vector3(n,n,n))];
test('second-bounce capture uses a full preceding generation only during drawing',()=>{
 const f=make();writeProbeField(f,regions,values(1));const before=JSON.stringify(f);
 withProbeField(f,regions,values(2),()=>{assert.equal(f.count.value,1);assert.equal(f.coefficients.value[8].x,2);assert.deepEqual(f.positions.value[0].toArray(),[2,2,1.35]);});
 assert.equal(JSON.stringify(f),before);
});
test('failed capture restores published uniforms so gameplay never sees partial lighting',()=>{
 const f=make();writeProbeField(f,regions,values(.5));const before=JSON.stringify(f);
 assert.throws(()=>withProbeField(f,regions,values(9),()=>{throw Error('render cancelled');}),/render cancelled/);
 assert.equal(JSON.stringify(f),before);
 assert.throws(()=>withProbeField(f,regions,[],()=>{}),/Incomplete/);
 assert.equal(JSON.stringify(f),before);
});
