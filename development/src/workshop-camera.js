export function panCamera(center,dx,dy,zoom){return {x:center.x+dy/(32*zoom)+dx/(64*zoom),y:center.y+dy/(32*zoom)-dx/(64*zoom)};}
export function wheelMotion(event,height=800){const unit=event.deltaMode===1?16:event.deltaMode===2?height:1;return {zoom:event.ctrlKey||event.metaKey,dx:event.deltaX*unit,dy:event.deltaY*unit};}
export function zoomCamera(renderer,center,z,px,py,factor){
 renderer.camera=renderer.project(center.x,center.y,z);
 const anchor=renderer.unscreen(px,py,z);
 renderer.zoom=Math.max(.35,Math.min(2.8,renderer.zoom*factor));
 const after=renderer.unscreen(px,py,z);
 center.x+=anchor.x-after.x;center.y+=anchor.y-after.y;
 renderer.camera=renderer.project(center.x,center.y,z);
}
