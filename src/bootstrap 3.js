// Hosted assets launch directly; code-only builds can still import a local folder.
const status=document.querySelector('#load-status');
const assetURL=new URL('../private-assets/',import.meta.url);
const required=['world/manifest.json','world/properties.json','atlas.json','items.json','recipes.json','trees/manifest.json','characters/character.json','held-models/held-models.json','ground-models/held-models.json','comics.json','reading-audio/manifest.json'];
const cacheName='pz-local-assets-v1:'+assetURL.pathname;
async function launch(){await import('./main.js');}
async function boot(){
 // Hosted builds bypass the legacy folder-import cache without deleting local saves.
 const hosted=await fetch(new URL('../hosted-assets.json',import.meta.url),{cache:'no-store'});
 if(hosted.ok&&(await hosted.json()).available){
  for(const r of await navigator.serviceWorker?.getRegistrations?.()??[])if(r.scope===new URL('../',import.meta.url).href)await r.unregister();
  if(navigator.serviceWorker?.controller){location.reload();return;}
  await launch();return;
 }
 // Local development already has an asset directory; no service worker needed.
 if(!navigator.serviceWorker?.controller&&(await fetch(new URL('world/manifest.json',assetURL))).ok){await launch();return;}
 if(!('serviceWorker'in navigator))throw Error('This browser does not support local assets. Use desktop Chrome or Edge.');
 const registration=await navigator.serviceWorker.register(new URL('../asset-worker.js',import.meta.url),{scope:new URL('../',import.meta.url).pathname});
 await navigator.serviceWorker.ready;
 if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
 const cache=await caches.open(cacheName);
 if(await cache.match(new URL('__complete__',assetURL))){await launch();return;}
 document.querySelector('#loading progress').hidden=true;
 status.textContent='First visit: choose your local private-assets folder';
 const note=document.createElement('p');note.textContent='Assets stay in this browser and are never uploaded. Choose the converted private-assets folder; the Steam installation folder cannot be loaded directly.';
 const picker=document.createElement('input');picker.type='file';picker.webkitdirectory=true;picker.multiple=true;picker.hidden=true;
 const button=document.createElement('button');button.textContent='Choose local asset folder';button.onclick=()=>picker.click();
 document.querySelector('#loading').append(note,button,picker);
 picker.onchange=async()=>{
  button.disabled=true;try{
   const entries=[...picker.files].map(file=>({file,path:file.webkitRelativePath.split('/').slice(1).join('/')}));
   const paths=new Set(entries.map(e=>e.path));const missing=required.filter(p=>!paths.has(p));if(missing.length)throw Error('The selected folder is missing: '+missing.join(', '));
   const total=entries.reduce((n,e)=>n+e.file.size,0),estimate=await navigator.storage?.estimate?.();if(estimate?.quota&&total>estimate.quota-(estimate.usage||0))throw Error('Not enough browser storage. Free some space and try again.');
   await cache.delete(new URL('__complete__',assetURL));let done=0;
   for(const {file,path}of entries){if(path.split('/').some(s=>!s||s==='.'||s==='..'))continue;
    const type=path.endsWith('.json')?'application/json':path.endsWith('.png')?'image/png':path.endsWith('.wav')?'audio/wav':file.type||'application/octet-stream';
    await cache.put(new URL(path.split('/').map(encodeURIComponent).join('/'),assetURL),new Response(file,{headers:{'Content-Type':type}}));
    status.textContent=`Saving local assets ${++done} / ${entries.length}`;
   }
   await cache.put(new URL('__complete__',assetURL),new Response('ready'));
   note.remove();button.remove();picker.remove();status.textContent='Assets are ready. Starting the game…';await launch();
  }catch(error){status.textContent=error.message;button.disabled=false;picker.value='';}
 };
}
boot().catch(error=>{status.textContent='Startup failed: '+error.message;console.error(error);});
