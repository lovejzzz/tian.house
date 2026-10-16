import test from 'node:test';import assert from 'node:assert/strict';
import {barricadeSprite,windowBarricadeSprites,barricadePresent} from '../src/barricades.js';
import {canClimbWindow,canToggleWindow} from '../src/windows.js';
test('wood sprite names follow installed direction switch for all four plank counts',()=>{
 const expected={W:[8,10,12,14],N:[9,11,13,15],E:[0,2,4,6],S:[1,3,5,7]};
 for(const[d,ids]of Object.entries(expected))ids.forEach((id,i)=>assert.equal(barricadeSprite(d,{plankHealth:Array(i+1).fill(100)}),`carpentry_01_${id}`));
 assert.equal(barricadeSprite('N',{plankHealth:[100,0,40,-1]}),'carpentry_01_11');
 assert.equal(barricadeSprite('N',100),null); // Old scalar does not establish material/count.
 assert.equal(barricadeSprite('N',{plankHealth:[0,0,0,0]}),null);
});
test('metal health threshold, bars and material precedence select source sprite names',()=>{
 for(const[d,base,bars]of [['W',24,55],['N',25,53],['E',28,52],['S',29,54]]){
  assert.equal(barricadeSprite(d,{metalHealth:2501,metalBarHealth:1,plankHealth:[1]}),`constructedobjects_01_${base}`);
  assert.equal(barricadeSprite(d,{metalHealth:2500}),`constructedobjects_01_${base+2}`);
  assert.equal(barricadeSprite(d,{metalBarHealth:1,plankHealth:[1]}),`constructedobjects_01_${bars}`);
 }
});
test('opposite-side sprites belong to the adjacent square; empty health arrays stop blocking',()=>{
 for(const north of [true,false]){
  const obj={x:3,y:4,z:1,props:{[north?'windowN':'windowW']:''}},state={open:true,barricades:{same:{plankHealth:[100]},opposite:{plankHealth:[100,100]}}};
  const sprites=windowBarricadeSprites(obj,state);
  assert.deepEqual(sprites.map(s=>[s.x,s.y,s.z,s.name]),[[north?3:2,north?3:4,1,north?'carpentry_01_3':'carpentry_01_2'],[3,4,1,north?'carpentry_01_9':'carpentry_01_8']]);
  assert.equal(canClimbWindow(obj.props,state),false);
  state.barricades={same:{plankHealth:[0,0]}};
  assert.equal(barricadePresent(state.barricades.same),false);assert.equal(canClimbWindow(obj.props,state),true);assert.equal(canToggleWindow(obj.props,state,obj,{x:3.5,y:4.5}),true);
 }
});
