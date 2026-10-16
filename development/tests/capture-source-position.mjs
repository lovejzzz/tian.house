// Diagnostic source-coordinate view; no pixel parity assertion.
import {chromium} from 'playwright';import fs from 'node:fs';
const source=JSON.parse(fs.readFileSync(process.argv[2])).players[0],output=process.argv[3];fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});try{const page=await browser.newPage({viewport:{width:1728,height:1117}});await page.goto('http://127.0.0.1:8876/');await page.waitForFunction(()=>window.pz?.ready,null,{timeout:60000});
 await page.evaluate(async p=>{pz.sim.paused=true;Object.assign(pz.sim.state.player,{x:p.x,y:p.y,z:p.z});await pz.world.around(p.x,p.y);pz.renderer.zoom=1;pz.renderer.draw(pz.sim);},source);
 await page.waitForFunction(()=>pz.renderer.loading.size===0);await page.screenshot({path:output+'/source-position.png'});fs.writeFileSync(output+'/view.json',JSON.stringify({kind:'target-diagnostic',source_position:source,viewport:[1728,1117],zoom:1,limitations:['Different character, game state and lighting','No calibrated pixel comparison; alignment study only']},null,2));
}finally{await browser.close();}
