import fs from 'node:fs';import assert from 'node:assert/strict';import {projectRootDelta} from '../src/root-motion.js';
const rows=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').slice(1),tolerance=1e-6;let maximumError=0;
for(const row of rows){const [x,y,z,angle,scale,expectedX,expectedY]=row.split('\t').map(Number),out=projectRootDelta([x,y,z],angle,scale);const error=Math.max(Math.abs(out.x-expectedX),Math.abs(out.y-expectedY));maximumError=Math.max(maximumError,error);assert.ok(error<=tolerance,row);}
console.log(JSON.stringify({kind:'source-component/target-component',passed:rows.length,tolerance,maximumError,scope:'default Y bone-axis projection, rendered-angle rotation, loaded scale; no gameplay or blending claim'},null,2));
