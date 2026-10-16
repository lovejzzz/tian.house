import fs from 'node:fs';
import assert from 'node:assert/strict';
import {actorWeaponLevel,recipeWearModifier} from '../src/recipe-wear.js';
const result=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').slice(1).map(row=>{
 const [categories,levelString,weaponString,maintenanceString]=row.split(',');
 const level=Number(levelString),player={skillLevels:{maintenance:3,axe:level,spear:level,smallblade:level,longblade:level,blunt:level,smallblunt:level}};
 const primary=categories==='NONE'?null:{ItemType:'base:weapon',Categories:categories.split('+').map(s=>'base:'+s.replaceAll('_','').toLowerCase()).join(';')};
 const weapon=actorWeaponLevel(player,primary),maintenance=recipeWearModifier(player,{ItemType:'base:weapon'},primary,[]);
 assert.equal(weapon,Number(weaponString));assert.equal(maintenance,Number(maintenanceString));
 return {categories,level,weapon,maintenance};
});
console.log(JSON.stringify({passed:true,scope:'installed character weapon-level and explicit-character maintenance getters only',cases:result},null,2));
