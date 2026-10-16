// Inventory remains authoritative; slots only position its visible thumbnails.
export function shelfDisplay(items,tile,properties){
 let slots;try{slots=JSON.parse(properties[tile]?.TianDisplaySlots);}catch{}
 const minimum=properties[tile]?.TianMount==='wall'&&properties[tile]?.TianWallSide==='opposite'?-.25:0;
 const custom=Array.isArray(slots)&&slots.length>0&&slots.length<=12&&slots.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&p[0]>=minimum&&p[0]<=1&&p[1]>=minimum&&p[1]<=1&&p[2]>=0&&p[2]<=96);
 const seen=new Set(),shown=custom?items.slice(0,slots.length):items.filter(i=>{if(seen.has(i.type))return false;seen.add(i.type);return true;}).slice(0,3);
 return shown.map((item,i)=>{const [u,v,z]=custom?slots[i]:[0,0,0];return {item,x:custom?(u-v)*32:(i-(shown.length-1)/2)*10,y:custom?(u+v)*16-z:-32,size:custom?14:22,custom};});
}
