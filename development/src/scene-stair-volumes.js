import {straightStairPath,returnStairPath} from './return-stair-path.js';
import {wallVolume} from './wall-volume.js';
// Provisional solid-flight geometry from functional path; original art is not reconstructed.
export function sceneStairVolumes(scene,{cellSize,storeyHeight,maxRiser=.18}){
 if(![cellSize,storeyHeight,maxRiser].every(v=>Number.isFinite(v)&&v>0))throw Error('Provide explicit stair dimensions');
 const levels=new Map(scene.levels.map(l=>[l.id,l.index])),volumes=[];
 for(const link of scene.verticalLinks||[]){
  const z=levels.get(link.fromLevelId);if(link.kind!=='stairs'||!Number.isFinite(z)||levels.get(link.toLevelId)!==z+1)throw Error('Stairs must connect adjacent floors');
  const spec={...link,z},path=link.shape==='return'?returnStairPath(spec):straightStairPath({...spec,run:link.shape==='straight'?link.run:3});
  if(!link.shape){const heights=[.01,.4333,.7666,1];path.cells.forEach((c,i)=>{c.low=z+heights[i];c.high=z+heights[i+1];});}
  for(const [cellIndex,c]of path.cells.entries()){
   const rise=(c.high-c.low)*storeyHeight,count=Math.max(1,Math.ceil(rise/maxRiser)),gx=c.gx||(!c.gy?1:0),gy=c.gy,n=[-gy,gx];
   for(let i=0;i<count;i++){
    const t=(i+.5)/count,centre=[(c.x+.5+gx*(t-.5))*cellSize,(c.y+.5+gy*(t-.5))*cellSize],top=(c.low+(c.high-c.low)*(i+1)/count)*storeyHeight,base=z*storeyHeight;
    const a=centre.map((v,k)=>v-n[k]*cellSize/2),b=centre.map((v,k)=>v+n[k]*cellSize/2);
    const mesh=wallVolume({id:`stair:${link.id}:${cellIndex}:${i}`,a,b,base,height:top-base,thickness:cellSize/count});
    volumes.push({...mesh,stairId:link.id,levelId:link.fromLevelId,toLevelId:link.toLevelId,role:'stair',geometryEvidence:'approximate solid flight',supportTop:top});
   }
  }
 }
 return volumes;
}
