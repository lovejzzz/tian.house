// Storage-only encoding. Public house exports and the model remain ordinary
// editable JSON; old unencoded IndexedDB records keep loading unchanged.
export function internSnapshot(snapshot){
 const strings=[],ids=new Map();
 const encode=value=>{
  if(value===undefined)return ['u',0];
  if(typeof value==='string'&&value.length>=1024){if(!ids.has(value)){ids.set(value,strings.length);strings.push(value);}return ['s',ids.get(value)];}
  if(Array.isArray(value))return ['a',value.map(encode)];
  if(value&&typeof value==='object')return ['o',Object.entries(value).map(([key,item])=>[key,encode(item)])];
  return ['v',value];
 };
 return {strings,root:encode(snapshot)};
}
export function expandSnapshot(packed){
 if(!Array.isArray(packed?.strings)||packed.strings.some(s=>typeof s!=='string'))throw Error('Invalid draft string table');
 const decode=node=>{
  if(!Array.isArray(node)||node.length!==2)throw Error('Invalid draft node');
  const [kind,value]=node;
  if(kind==='u'&&value===0)return undefined;
  if(kind==='s'){if(!Number.isSafeInteger(value)||value<0||value>=packed.strings.length)throw Error('Invalid draft string reference');return packed.strings[value];}
  if(kind==='v'&&(value===null||['string','number','boolean'].includes(typeof value)))return value;
  if(kind==='a'&&Array.isArray(value))return value.map(decode);
  if(kind==='o'&&Array.isArray(value))return Object.fromEntries(value.map(pair=>{if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string')throw Error('Invalid draft property');return [pair[0],decode(pair[1])];}));
  throw Error('Invalid draft node type');
 };
 return decode(packed.root);
}
// Measure ordinary JSON without retaining its full text or UTF-8 copy. Repeated
// reference images in history share a cached byte count, not another encoded image.
export function snapshotJSONBytes(value){
 const encoder=new TextEncoder(),strings=new Map(),ancestors=new Set();
 const scalar=value=>{const json=JSON.stringify(value);return json===undefined?0:encoder.encode(json).byteLength;};
 const size=value=>{
  if(typeof value==='string'){if(!strings.has(value))strings.set(value,scalar(value));return strings.get(value);}
  if(!value||typeof value!=='object')return scalar(value);
  if(ancestors.has(value))throw new TypeError('Circular draft snapshot');
  ancestors.add(value);let bytes=2,count=0;
  if(Array.isArray(value)){for(const item of value){bytes+=(count++?1:0)+(size(item)||4);}}
  else for(const [key,item] of Object.entries(value)){const n=size(item);if(n)bytes+=(count++?1:0)+size(key)+1+n;}
  ancestors.delete(value);return bytes;
 };
 return size(value);
}

// Emit the existing v1 wire format incrementally. No full JSON string, tagged
// object tree, or uncompressed byte array is needed while compressing history.
export function* snapshotWireChunks(snapshot){
 const strings=[],ids=new Map(),ancestors=new Set();
 function* node(value){
  if(value===undefined){yield '["u",0]';return;}
  if(typeof value==='string'&&value.length>=1024){
   if(!ids.has(value)){ids.set(value,strings.length);strings.push(value);}
   yield '["s",'+ids.get(value)+']';return;
  }
  if(value&&typeof value==='object'){
   if(ancestors.has(value))throw new TypeError('Circular draft snapshot');
   ancestors.add(value);let count=0;
   if(Array.isArray(value)){yield '["a",[';for(const item of value){if(count++)yield ',';yield* node(item);}}
   else {yield '["o",[';for(const [key,item] of Object.entries(value)){if(count++)yield ',';yield '['+JSON.stringify(key)+',';yield* node(item);yield ']';}}
   yield ']]';ancestors.delete(value);return;
  }
  yield '["v",'+JSON.stringify(value)+']';
 }
 yield '{"root":';yield* node(snapshot);yield ',"strings":[';
 for(let i=0;i<strings.length;i++){if(i)yield ',';yield JSON.stringify(strings[i]);}
 yield ']}';
}
// A compression stream provides byte backpressure, but Promise microtasks alone
// do not let input/rendering run. Explicitly yield between short CPU slices.
const yieldDraftTask=()=>globalThis.scheduler?.yield?globalThis.scheduler.yield():new Promise(resolve=>setTimeout(resolve,0));
async function measureSnapshotInSlices(snapshot,yieldTask){
 const encoder=new TextEncoder(),cache=new Map(),ancestors=new Set(),stack=[{value:snapshot}];let bytes=0,start=performance.now();
 const scalar=value=>{if(typeof value==='string'&&cache.has(value))return cache.get(value);const json=JSON.stringify(value),n=json===undefined?0:encoder.encode(json).byteLength;if(typeof value==='string')cache.set(value,n);return n;};
 while(stack.length){
  const task=stack.pop();if(task.exit){ancestors.delete(task.value);continue;}const value=task.value;
  if(value&&typeof value==='object'){if(ancestors.has(value))throw new TypeError('Circular draft snapshot');ancestors.add(value);stack.push({value,exit:true});}
  if(Array.isArray(value)){bytes+=2+Math.max(0,value.length-1);for(const item of value)stack.push({value:item===undefined?null:item});}
  else if(value&&typeof value==='object'){
   let count=0;bytes+=2;for(const [key,item] of Object.entries(value)){if(item===undefined)continue;bytes+=(count++?1:0)+scalar(key)+1;stack.push({value:item});}
  }else bytes+=scalar(value);
  if(performance.now()-start>=8){await yieldTask();start=performance.now();}
 }
 return bytes;
}
export async function encodeDraftSnapshot(snapshot,{Compression=globalThis.CompressionStream,yieldTask=yieldDraftTask}={}){
 if(!Compression)return {snapshot:structuredClone(snapshot)};
 const uncompressedBytes=await measureSnapshotInSlices(snapshot,yieldTask);
 if(uncompressedBytes<256*1024)return {snapshot:structuredClone(snapshot)};
 const chunks=snapshotWireChunks(snapshot),encoder=new TextEncoder();
 let sliceStart=performance.now();
 const source=new ReadableStream({async pull(controller){
  // Backpressure bounds queued text rather than retaining the full wire document.
  let text='',next;
  while(text.length<65536){next=chunks.next();if(next.done)break;text+=next.value;}
  if(text)controller.enqueue(encoder.encode(text));
  if(next?.done)controller.close();
  else if(performance.now()-sliceStart>=8){await yieldTask();sliceStart=performance.now();}
 },cancel(){chunks.return();}});
 const data=new Uint8Array(await new Response(source.pipeThrough(new Compression('gzip'))).arrayBuffer());
 if(data.byteLength>=uncompressedBytes)return {snapshot:structuredClone(snapshot)};
 return {encoding:'gzip-interned-json-v1',data,uncompressedBytes};
}
export async function decodeDraftSnapshot(record,{Decompression=globalThis.DecompressionStream}={}){
 if(!record)return record;
 if(record.encoding===undefined)return structuredClone(record.snapshot);
 if(!['gzip-json-v1','gzip-interned-json-v1'].includes(record.encoding))throw Error('Unknown draft storage encoding');
 if(!Decompression)throw Error('This browser cannot read compressed drafts. Open this house in a browser with gzip stream support.');
 if(!(record.data instanceof Uint8Array))throw Error('Invalid compressed draft data');
 try{const value=JSON.parse(await new Response(new Blob([record.data]).stream().pipeThrough(new Decompression('gzip'))).text());return record.encoding==='gzip-interned-json-v1'?expandSnapshot(value):value;}
 catch(error){throw Error('Could not decode saved draft: '+error.message);}
}
