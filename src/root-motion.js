// Deferred translation on the source's default Y bone axis. Turning/root
// rotation and multi-track weights must be supplied by their graph consumers.
export function projectRootDelta(delta,renderedAngle,scale){
 const [x,,z]=delta,y=-z,c=Math.cos(renderedAngle),s=Math.sin(renderedAngle);
 return {x:-(x*c-y*s)*scale,y:-(x*s+y*c)*scale};
}
export function rootPosition(channels,time){
 const curve=channels.find(c=>c.bone==='Translation_Data'&&c.kind===2);
 if(!curve||!curve.times.length)throw Error('Missing root translation channel');
 const t=curve.times,v=curve.values;
 if(time<=t[0])return [...v[0]];if(time>=t.at(-1))return [...v.at(-1)];
 let i=1;while(t[i]<time)i++;
 const a=(time-t[i-1])/(t[i]-t[i-1]);return v[i].map((x,j)=>v[i-1][j]+(x-v[i-1][j])*a);
}
export function rootInterval(channels,start,end){const a=rootPosition(channels,start),b=rootPosition(channels,end);return b.map((x,i)=>x-a[i]);}
