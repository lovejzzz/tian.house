import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url),report=JSON.parse(await readFile(new URL('private-assets/asset-build-report.json',root),'utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 const response=await page.goto(process.env.TIAN_ASSET_BASE_URL||'http://127.0.0.1:8883/');
 if(!response?.ok())throw Error('Local application is unavailable');
 const results=await page.evaluate(async pages=>{
  const load=async(name,expected)=>{
   const response=await fetch('private-assets/'+name,{cache:'no-store'});
   if(!response.ok)throw Error('Atlas request failed: '+name+' '+response.status);
   const bytes=await response.arrayBuffer();
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
   if(hash!==expected)throw Error('Server atlas does not match local build: '+name);
   const url=URL.createObjectURL(new Blob([bytes]));
   try{
    const im=new Image();im.src=url;await im.decode();
    const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
    const ctx=c.getContext('2d');ctx.drawImage(im,0,0);
    return {sha256:hash,size:[im.width,im.height],pixels:ctx.getImageData(0,0,im.width,im.height).data};
   }finally{URL.revokeObjectURL(url);}
  };
  const result=[];
  for(const p of pages){const [a,b]=await Promise.all([load(p.source,p.sourceSha256),load(p.runtime,p.runtimeSha256)]);const equal=JSON.stringify(a.size)===JSON.stringify(b.size)&&a.pixels.length===b.pixels.length&&a.pixels.every((v,i)=>v===b.pixels[i]);result.push({source:p.source,runtime:p.runtime,equal,size:a.size,sourceSha256:a.sha256,runtimeSha256:b.sha256});}
  return result;
 },report.pages);
 const out=new URL('../../../docs/project-zomboid/evidence/asset-pipeline/',import.meta.url);await mkdir(out,{recursive:true});
 await writeFile(new URL('browser-decode.json',out),JSON.stringify({browser:browser.version(),results},null,2)+'\n');
 if(results.some(r=>!r.equal))throw Error('Browser rendered pixels differ');
 console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
