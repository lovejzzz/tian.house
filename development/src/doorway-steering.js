// Optional approach steering, never a position snap or collision bypass.
// Explicit lateral player input always wins. Caller still runs normal swept collision.
export function doorwayVelocity(position,velocity,host,{halfWidth=.25,frameWidth=.05,reach=.9}={}){
 if(!host?.hostEndpoints||!host.opening)return velocity;
 const [a,b]=host.hostEndpoints,length=Math.hypot(b[0]-a[0],b[1]-a[1]);
 if(!length)return velocity;
 const t=[(b[0]-a[0])/length,(b[1]-a[1])/length],n=[-t[1],t[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
 const rel=[position[0]-a[0],position[1]-a[1]],distance=dot(rel,n),normalSpeed=dot(velocity,n),lateralSpeed=dot(velocity,t),speed=Math.hypot(...velocity);
 if(!speed||Math.abs(lateralSpeed)>.1||distance*normalSpeed>=0||Math.abs(distance)>reach||Math.abs(distance)<.02)return velocity;
 const [left,,right]=host.opening,usable=right-left-2*frameWidth-2*halfWidth;
 if(usable<=0)return velocity;
 const offset=(left+right)/2-dot(rel,t);
 if(Math.abs(offset)>.45||Math.abs(offset)<.01)return velocity;
 const lateral=Math.max(-speed*.65,Math.min(speed*.65,offset*6));
 const forward=Math.sign(normalSpeed)*Math.sqrt(speed*speed-lateral*lateral);
 return [n[0]*forward+t[0]*lateral,n[1]*forward+t[1]*lateral];
}
