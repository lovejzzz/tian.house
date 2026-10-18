// three.js re-flattens an array-of-vectors uniform into a Float32Array on every draw
// call that uses it (array uniforms have no cache). The room-bounce probes (2 x 144
// vec3 in ~100 programs) and the spot-atlas rects made that the largest per-frame
// cost. A shader gets this view instead: the vectors stay the authoritative data,
// and the flat copy is refreshed at most once per render call, which three.js then
// passes straight to WebGL.
export function flatUniform(source,components,renderer){
 let cache=null,frame=-1;
 return {get value(){const now=renderer.info.render.frame,v=source.value;
  if(now!==frame||!cache||cache.length!==v.length*components){frame=now;if(!cache||cache.length!==v.length*components)cache=new Float32Array(v.length*components);for(let i=0;i<v.length;i++)v[i].toArray(cache,i*components);}
  return cache;},set value(next){source.value=next;}};
}
