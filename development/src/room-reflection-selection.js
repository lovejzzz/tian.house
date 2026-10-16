// Pick only a probe inside the same authored room volume. This is a local
// reflection approximation. The renderer box-projects the room shell; reflected movement is not captured.
export function roomReflectionIndex(position,regions){
 let best=-1,distance=Infinity;
 regions.forEach((r,i)=>{
  const [x,y,z]=position,[x0,y0,x1,y1]=r.rect;
  if(x<x0||x>x1||y<y0||y>y1||z<r.minZ||z>r.maxZ)return;
  const d=(x-r.position[0])**2+(y-r.position[1])**2+(z-r.position[2])**2;
  if(d<distance){distance=d;best=i;}
 });return best;
}
