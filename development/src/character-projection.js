// 42.21.0 Core.DoPushIsoStuff: 1920 projection basis, Core.scale =
// sqrt(2)/2/10/1.5, tileScale/2, then a 1.5 character scale. The map uses
// tileScale=1 coordinates (64x32 diamonds). This is static geometric evidence;
// lighting, clothing, animation blending and pixel parity are separate work.
export const MODEL_PIXELS_PER_UNIT=1920*Math.SQRT2/40;
export const CHARACTER_ELEVATION=Math.PI/6;
export const CHARACTER_TEXTURE={width:160,height:224,density:2};
// Core world view: Rx(30) Ry(135) S(-1,1,1) Ry(angle+3pi/2).
// Browser camera view: Rx(30) Ry(-45). Factoring that view out leaves
// Ry(-angle+pi/2) S(1,1,-1); rotation alone loses source handedness.
export function characterModelTransform(angle){return {yaw:-angle+Math.PI/2,scaleZ:-1};}
export function characterProjection(){
 const {width,height,density}=CHARACTER_TEXTURE,ppu=MODEL_PIXELS_PER_UNIT*density;
 return {left:-width/(2*ppu),right:width/(2*ppu),top:height/(2*ppu),bottom:-height/(2*ppu),
  width:width/density,height:height/density};
}
