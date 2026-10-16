import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {sceneFurnitureVolumes} from '../../src/scene-furniture-volumes.js';
import {installOriginalAssets} from '../../src/original-assets.js';import {installStudioAssets} from '../../src/studio-assets.js';
import {scenePhysicalMetrics} from '../../src/scene-physical-dimensions.js';
import {movePhysicalBody} from '../../src/physical-body.js';import {sweepSolidBox} from '../../src/convex-solid.js';
const root=new URL('../../',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root)));
const save=read('evidence/403/stuck-save.json'),plan=save.housePlan,scene=plan.sceneDocument,props=read('private-assets/world/properties.json'),atlas=read('private-assets/atlas.json');installOriginalAssets(props,atlas);installStudioAssets(props,atlas);
const assets=read('assets/volume/build-report.json').assets.map(a=>JSON.parse(gunzipSync(fs.readFileSync(new URL('assets/volume/'+a.delivery,root)))));
const volumes=sceneFurnitureVolumes(scene,plan,props,assets,scenePhysicalMetrics(scene)),p=save.volumePosition.position,half=[.25,.25,.9],solids=volumes.flatMap(v=>v.collision.map(c=>({...c,source:v.id})));
for(const delta of [[.1,0,0],[-.1,0,0],[0,.1,0],[0,-.1,0]]){const end=p.map((v,i)=>v+delta[i]);console.log(JSON.stringify({delta,result:movePhysicalBody(solids,p,delta,half),hits:solids.map(s=>({id:s.source,hit:sweepSolidBox(s,p,end,half)})).filter(h=>h.hit)}));}
