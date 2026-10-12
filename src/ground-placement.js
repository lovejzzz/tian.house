// ISTransferAction.GetDropItemOffset followed by IsoWorldInventoryObject's
// constructor. RNG distribution is adapted; source RNG stream parity is separate.
export function groundDropPlacement(item,tile,apparentZ,{center=false,seatedZ=null,random=Math.random}={}){
 let x=Math.fround(random()),y=Math.fround(random());
 let z=apparentZ(x,y)-tile.z;
 if(seatedZ!==null)z=Math.floor(seatedZ);
 if(center){x=(3+Math.floor(random()*4))/10;y=(3+Math.floor(random()*4))/10;z=apparentZ(x,y)-tile.z;}
 const rotation=(item.worldZRotation??-1)<0?Math.floor(random()*360):item.worldZRotation;
 // Java constructor casts incoming offsets before checking the zero sentinel.
 x=Math.fround(x);y=Math.fround(y);z=Math.fround(z);
 if(x===0)x=Math.fround(Math.floor(random()*1000)/1000);
 if(y===0)y=Math.fround(Math.floor(random()*1000)/1000);
 return {groundOffset:{x,y,z},worldXRotation:0,worldYRotation:0,worldZRotation:rotation};
}
