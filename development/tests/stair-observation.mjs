// Controlled source-component probe results, never a full-game traversal trace.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {stairHeight} from '../src/stairs.js';
const directory=process.argv[2],sourceFile=path.join(directory,'source.tsv');
const rows=fs.readFileSync(sourceFile,'utf8').trim().split('\n').slice(1).map(line=>{
 const [type,fbo,x,y,z,height]=line.split('\t');return {type,fbo:fbo==='true',x:+x,y:+y,z:+z,height:Math.fround(+height)};
});
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const source of[true,false]){
 const trace={schema_version:1,scenario:'pz-42.21-stair-height-component',provenance:{kind:source?'source-component':'successor-component',build:source?'42.21.0 Steam 25485521':'browser-stair-height-v1',adapter:source?'StairHeightProbe.java':'tests/stair-observation.mjs',normalization:'Parse Java Float.toString as IEEE-754 float32; exact comparison, no tolerance',raw_captures:source?[{path:'source.tsv',description:'Output of installed IsoGridSquare.getApparentZ on controlled fixtures',sha256:sha(sourceFile)}]:[],limitations:['Constructed square fixtures; not an actual in-game traversal or rendering capture']},steps:rows.map(r=>({action:{type:r.type,fbo:r.fbo,x:r.x,y:r.y,z:r.z},result:{ok:true},state:{height:source?r.height:stairHeight(r.type,r.x,r.y,r.z,{fbo:r.fbo})}}))};
 fs.writeFileSync(path.join(directory,source?'source.json':'target.json'),JSON.stringify(trace,null,2)+'\n',{flag:'wx'});
}
