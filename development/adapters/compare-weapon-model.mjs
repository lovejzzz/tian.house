import fs from 'node:fs';
import assert from 'node:assert/strict';
import {weaponStaticModel} from '../src/ground-models.js';
// Inputs correspond to WeaponModelProbe. Only the installed getter is compared.
const cases=[[-1,null,'Hammer',null],[-1,'Override','Hammer',null],[-1,'','Hammer',null],[1,'Override','Hammer',['First','Second']],[0,'Override','Hammer',[null]],[0,'Override','Hammer',['']],[1,null,'Hammer',null],[3,null,'Hammer',['First','Second']]];
const source=fs.readFileSync(process.argv[2],'utf8').trimEnd().split('\n').slice(1).map(line=>line.split('\t')[1]);
const target=cases.map(([modelIndex,staticModel,weaponSprite,weaponSpritesByIndex])=>{
 try{const result=weaponStaticModel({modelIndex,staticModel,weaponSprite,weaponSpritesByIndex},{});return result==null?'<null>':JSON.stringify(result);}
 catch(error){if(error instanceof RangeError)return 'IndexOutOfBoundsException';throw error;}
});
assert.deepEqual(target,source);
console.log(JSON.stringify({passed:true,scope:'isolated installed HandWeapon.getStaticModel; not creation or rendering',cases:target.length,source,target},null,2));
