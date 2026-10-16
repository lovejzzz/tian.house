// Work-face frame comes from the same authored geometry transform as the sink.
// This is a standing-side/reach gate, not pathfinding or automatic repositioning.
export function withinFixtureWorkFace({point,forward,width},position,maxDistance=1.05){
 const length=Math.hypot(forward[0],forward[1]);if(length<1e-8||!(width>0))return false;
 const dx=position[0]-point[0],dy=position[1]-point[1],nx=forward[0]/length,ny=forward[1]/length;
 const front=dx*nx+dy*ny,side=Math.abs(dx*ny-dy*nx);
 return front>=.12-1e-8&&front<=maxDistance+1e-8&&side<=width/2+.15+1e-8;
}
