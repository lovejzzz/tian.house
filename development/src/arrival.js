const clamp=x=>Math.max(0,Math.min(1,x));
export const smoothArrival=x=>{const t=clamp(x);return t*t*t*(t*(t*6-15)+10);};
// Preserve the exact on-screen position when the preview expands to full screen.
export function fullscreenCamera(camera,zoom,rect,width,height){return {x:camera.x+(width/2-rect.left-rect.width/2)/zoom,y:camera.y+(height/2-rect.top-rect.height/2)/zoom};}
export function arrivalFrame(from,to,progress){const t=smoothArrival(progress);return {camera:{x:from.camera.x+(to.camera.x-from.camera.x)*t,y:from.camera.y+(to.camera.y-from.camera.y)*t},zoom:Math.exp(Math.log(from.zoom)+(Math.log(to.zoom)-Math.log(from.zoom))*t),cover:1-smoothArrival((progress-.65)/.35),roof:1-smoothArrival((progress-.25)/.65),menu:1-smoothArrival(progress/.3)};}
