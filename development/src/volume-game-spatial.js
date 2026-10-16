import {createSolidIndex} from './solid-index.js';
import {prismSolid} from './prism-solid.js';
import {movePhysicalBody} from './physical-body.js';
import {sweepSolidBox} from './convex-solid.js';
// Combat and horizontal NPC motion use the same compiled surfaces as the player.
// Stair routing and vertical NPC transitions remain separate navigation work.
export class VolumeGameSpatial {
 constructor(metrics){this.metrics=metrics;this.setVolumes([]);}
 setVolumes(volumes){const cells=list=>list.flatMap(v=>(v.collision||[]).map(c=>c.kind==='convex'?c:prismSolid(c)));this.solids=createSolidIndex(cells(volumes));this.sightSolids=createSolidIndex(cells(volumes.filter(v=>v.role!=='glass')));}
 point(actor){const m=this.metrics;return [actor.x*m.cellSize,actor.y*m.cellSize,actor.z*m.storeyHeight+.9];}
 move(actor,dx,dy){const start=this.point(actor),m=this.metrics,result=movePhysicalBody(this.solids,start,[dx*m.cellSize,dy*m.cellSize,0],[.25,.25,.9]);actor.x=result.position[0]/m.cellSize;actor.y=result.position[1]/m.cellSize;return Math.hypot(result.position[0]-start[0],result.position[1]-start[1])>1e-7;}
 clearViewPoints(start,end){const half=[.001,.001,.001];return !this.sightSolids.query(start,end,half).some(s=>sweepSolidBox(s,start,end,half));}
 clearSight(a,b){const m=this.metrics,eye=actor=>[actor.x*m.cellSize,actor.y*m.cellSize,actor.z*m.storeyHeight+1.6],start=eye(a),end=eye(b),half=[.001,.001,.001];return !this.sightSolids.query(start,end,half).some(s=>sweepSolidBox(s,start,end,half));}
 clearAttack(a,b){const start=this.point(a),end=this.point(b),half=[.015,.015,.015];return !this.solids.query(start,end,half).some(s=>sweepSolidBox(s,start,end,half));}
}
