// SDR video is encoded sRGB-like; average light energy in linear space, not bytes.
export function frameEmission(rgba){
 if(!rgba?.length||rgba.length%4)throw Error('Invalid video pixels');
 const rgb=[0,0,0],linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
 for(let i=0;i<rgba.length;i+=4)for(let c=0;c<3;c++)rgb[c]+=linear(rgba[i+c]);
 return rgb.map(v=>v/(rgba.length/4));
}
