// Event-driven idle time is not FPS. Call only with an explicit continuous RAF sample.
export function summarizeRenderSample(cpuMs, cadenceMs, info) {
 const stats=values=>{
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  const percentile=p=>sorted.length?Number(sorted[Math.ceil(p*sorted.length)-1].toFixed(2)):null;
  return {samples:sorted.length,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),maxMs:sorted.length?sorted.at(-1):null,framesOver50ms:sorted.filter(v=>v>50).length,framesOver100ms:sorted.filter(v=>v>100).length};
 };
 return {cpuSubmission:stats(cpuMs),browserFrameCadence:stats(cadenceMs),lastFrame:{drawCalls:info.render.calls,triangles:info.render.triangles},allocatedResourceCounts:{geometries:info.memory.geometries,textures:info.memory.textures},gpuTime:'not measured',memoryBytes:'not measured'};
}
