import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeDraftSnapshot,decodeDraftSnapshot,internSnapshot,expandSnapshot,snapshotJSONBytes,snapshotWireChunks} from '../src/workshop-snapshot-codec.js';
import {randomBytes} from 'node:crypto';
test('large image-bearing history and request fingerprints roundtrip losslessly with materially smaller storage',async()=>{
 const image='data:image/jpeg;base64,'+randomBytes(65536).toString('base64'),plan={name:'House — café',image};
 const snapshot={plan,revision:30,undoStack:Array.from({length:30},(_,i)=>({label:'Edit '+i,before:{...plan,n:i},after:{...plan,n:i+1}})),redoStack:[],commandReceipts:[{fingerprint:JSON.stringify({requestId:'r',operations:[{type:'reference.add',image}]})}]};
 const encoded=await encodeDraftSnapshot(snapshot);assert.equal(encoded.encoding,'gzip-interned-json-v1');const rawBytes=new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;assert.ok(encoded.data.byteLength<rawBytes*.08);
 assert.deepEqual(await decodeDraftSnapshot(encoded),snapshot);assert.equal(snapshot.plan.image,image);
});
test('legacy records and browsers without compression retain ordinary snapshots',async()=>{
 const snapshot={plan:{name:'Small'},undoStack:[]};const encoded=await encodeDraftSnapshot(snapshot);assert.deepEqual(encoded,{snapshot});assert.deepEqual(await decodeDraftSnapshot({revision:5,snapshot}),snapshot);
 const large={text:'x'.repeat(300000)};assert.deepEqual(await encodeDraftSnapshot(large,{Compression:null}),{snapshot:large});assert.equal(await decodeDraftSnapshot(undefined),undefined);
});
test('corrupt or unsupported encoded drafts fail explicitly without returning empty history',async()=>{
 await assert.rejects(decodeDraftSnapshot({encoding:'unknown',data:new Uint8Array()}),/Unknown/);
 await assert.rejects(decodeDraftSnapshot({encoding:'gzip-json-v1',data:new Uint8Array([1,2,3])}),/decode/);
 await assert.rejects(decodeDraftSnapshot({encoding:'gzip-json-v1',data:[]}),/Invalid/);
 await assert.rejects(decodeDraftSnapshot({encoding:'gzip-json-v1',data:new Uint8Array()},{Decompression:null}),/cannot read/);
});

test('interned nodes cannot collide with document keys or discard optional undefined values',()=>{
 const snapshot={strings:['not a table'],root:['s',0],value:undefined,nested:JSON.parse('{"__proto__":null,"constructor":"ordinary text"}'),array:[undefined,'s',0],image:'a'.repeat(3000)};
 const packed=JSON.parse(JSON.stringify(internSnapshot(snapshot)));assert.deepEqual(expandSnapshot(packed),snapshot);
 assert.throws(()=>expandSnapshot({strings:[],root:['s',7]}),/reference/);
});

test('streamed wire format preserves v1 compatibility and exact Unicode JSON byte counts',()=>{
 const snapshot={name:'住宅 🌿 café',missing:undefined,items:[undefined,null,false,0,'\"\\\n', '\ud800'],image:'image'.repeat(1000)};
 assert.equal(snapshotJSONBytes(snapshot),Buffer.byteLength(JSON.stringify(snapshot)));
 const wire=JSON.parse([...snapshotWireChunks(snapshot)].join(''));
 assert.deepEqual(wire,internSnapshot(snapshot));
 assert.deepEqual(expandSnapshot(wire),snapshot);
 const circular={};circular.self=circular;assert.throws(()=>snapshotJSONBytes(circular),/Circular/);
});
test('large repeated image history can encode without a monolithic JSON allocation',async()=>{
 const image='data:image/jpeg;base64,'+randomBytes(1024*1024).toString('base64');
 const snapshot={plan:{image},undoStack:Array.from({length:60},(_,i)=>({before:{image,i},after:{image,i:i+1}}))};
 const encoded=await encodeDraftSnapshot(snapshot);
 assert.ok(encoded.uncompressedBytes>160*1024*1024);
 assert.ok(encoded.data.byteLength<2*1024*1024);
 const restored=await decodeDraftSnapshot(encoded);assert.deepEqual(restored,snapshot);
});

test('large saves yield to browser tasks while preserving shared subtrees',async()=>{
 const shared={name:'shared',values:Array.from({length:10000},(_,i)=>({i,text:'Tile '+i}))};
 const snapshot={plan:shared,undoStack:[{before:shared,after:shared}]};let yields=0;
 const encoded=await encodeDraftSnapshot(snapshot,{yieldTask:async()=>{yields++;}});
 assert.ok(yields>0);assert.equal(encoded.uncompressedBytes,Buffer.byteLength(JSON.stringify(snapshot)));
 assert.deepEqual(await decodeDraftSnapshot(encoded),snapshot);
 const circular={};circular.self=circular;await assert.rejects(encodeDraftSnapshot(circular),/Circular/);
});
