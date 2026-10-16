import fs from 'node:fs';import assert from 'node:assert/strict';
import {World} from '../src/world.js';import {Visibility} from '../src/visibility.js';
const rows=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').slice(1),observations=[];
for(const row of rows){const [n,g,o,c,r,vision,collide]=row.split('\t'),north=n==='true',glass=g==='true',open=o==='true',reverse=r==='true';
 const prop={[north?'doorN':'doorW']:''};if(glass)prop.doorTrans='';
 const w=new World({cells:[]},{floor:{solidfloor:''},door:prop}),squares=new Map();
 for(let x=1;x<5;x++)for(let y=1;y<5;y++)squares.set(`${x},${y},0`,{x,y,z:0,tiles:['floor']});
 squares.get('3,3,0').tiles.push('door');w.cells.set('0_0',{squares});w.change(3,3,0,'door',{open,hasCurtain:+c>0,curtainOpen:+c===2});
 const own={x:3.5,y:3.5,z:0},adj={x:north?3.5:2.5,y:north?2.5:3.5,z:0},from=reverse?adj:own,to=reverse?own:adj;
 const v=new Visibility(w),blocked=!v.line(from,Math.floor(to.x),Math.floor(to.y)),collision=!w.canStep(from.x,from.y,to.x,to.y,0);
 assert.equal(blocked,vision==='Blocked',row);assert.equal(collision,collide==='true',row);
 observations.push({north,glass,open,curtain:+c,reverse,sourceVision:vision,targetBlocked:blocked,collision});
}
console.log(JSON.stringify({kind:'source-component/successor-component',scope:'adjacent same-floor door edge, blocked vs nonblocked vision and collision',passed:rows.length,observations},null,2));
