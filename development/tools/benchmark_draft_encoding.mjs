// Run each mode in a separate process so peak RSS measurements are independent.
// Synthetic repeated-photo history, not a browser performance acceptance test.
import {randomBytes} from 'node:crypto';
import {encodeDraftSnapshot,internSnapshot} from '../src/workshop-snapshot-codec.js';
const mode=process.argv[2]??'stream';
if(!['stream','legacy'].includes(mode))throw Error('Usage: node benchmark_draft_encoding.mjs [stream|legacy]');
const image='data:image/jpeg;base64,'+randomBytes(1024*1024).toString('base64');
const snapshot={plan:{image},undoStack:Array.from({length:60},(_,i)=>({before:{image,i},after:{image,i:i+1}}))};
const start=performance.now();let record;
if(mode==='stream')record=await encodeDraftSnapshot(snapshot);
else {
 const json=JSON.stringify(snapshot),raw=new TextEncoder().encode(json);
 const data=new Uint8Array(await new Response(new Blob([JSON.stringify(internSnapshot(snapshot))]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
 record={data,uncompressedBytes:raw.byteLength};
}
console.log(JSON.stringify({mode,rawBytes:record.uncompressedBytes,storedBytes:record.data.byteLength,elapsedMs:Math.round(performance.now()-start),peakRssKiB:process.resourceUsage().maxRSS}));
