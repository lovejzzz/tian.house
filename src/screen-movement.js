// Horizontal camera basis for a Z-up orbit camera. Input y is positive down-screen.
export function screenMovement(x,y,yaw){
 const c=Math.cos(yaw),s=Math.sin(yaw);
 return [-s*x+c*y,c*x+s*y];
}
