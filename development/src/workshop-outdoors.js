export function drawPool(c,p,time,alpha=1,brightness=1){
 c.save();c.globalAlpha=alpha;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+32,p.y+16);c.lineTo(p.x,p.y+32);c.lineTo(p.x-32,p.y+16);c.closePath();c.fillStyle=`rgb(${57*brightness},${122*brightness},${127*brightness})`;c.fill();c.clip();c.strokeStyle=`rgba(181,231,213,${.27*brightness})`;c.lineWidth=.8;
 for(let i=-2;i<4;i++){const y=p.y+i*11+(time*.005%11);c.beginPath();c.moveTo(p.x-36,y);c.quadraticCurveTo(p.x,y+7,p.x+36,y+2);c.stroke();}c.restore();
}
