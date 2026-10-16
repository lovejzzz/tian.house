// Height semantics checked against the installed 42.21.0 getApparentZ method.
// World traversal and renderer parity require separate game-level evidence.
export const STAIR_TYPES=['stairsTN','stairsTW','stairsMN','stairsMW','stairsBN','stairsBW'];
export function stairType(properties){return STAIR_TYPES.find(type=>type in properties)||null;}
export function stairHeight(type,x,y,z,{fbo=true}={}){
 if(!STAIR_TYPES.includes(type))return z;
 // Preserve Java float operations, including clamping and intermediate rounding.
 const f=Math.fround,t=Math.max(0,Math.min(1,f(type.endsWith('N')?y:x))),offset=f(fbo?.1:0);
 const middle=f(f(.3333)+offset),top=f(f(.6666)+offset);
 const [low,high]=type[6]==='T'?[top,1]:type[6]==='M'?[middle,top]:[f(.01),middle];
 return f(f(z)+f(low+f(f(high-low)*f(1-t))));
}
