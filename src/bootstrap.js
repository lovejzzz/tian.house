// Static hosting entry point. Original-game assets remain local to this browser.
const status=document.querySelector('#load-status');
const assetURL=new URL('../private-assets/',import.meta.url);
const required=['world/manifest.json','world/properties.json','atlas.json','items.json','recipes.json','trees/manifest.json','characters/character.json','held-models/held-models.json','ground-models/held-models.json','comics.json','reading-audio/manifest.json'];
const cacheName='pz-local-assets-v1:'+assetURL.pathname;
async function launch(){await import('./main.js');}
async function boot(){
 // Local development already has an asset directory; no service worker needed.
 if(!navigator.serviceWorker?.controller&&(await fetch(new URL('world/manifest.json',assetURL))).ok){await launch();return;}
 if(!('serviceWorker'in navigator))throw Error('此浏览器不支持本地素材加载，请使用桌面版 Chrome 或 Edge。');
 const registration=await navigator.serviceWorker.register(new URL('../asset-worker.js',import.meta.url),{scope:new URL('../',import.meta.url).pathname});
 await navigator.serviceWorker.ready;
 if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
 const cache=await caches.open(cacheName);
 if(await cache.match(new URL('__complete__',assetURL))){await launch();return;}
 document.querySelector('#loading progress').hidden=true;
 status.textContent='首次游玩：选择本机 private-assets 素材文件夹';
 const note=document.createElement('p');note.textContent='素材只保存在当前浏览器，不会上传。请使用已转换的 private-assets 文件夹；原版 Steam 安装目录不能直接加载。';
 const picker=document.createElement('input');picker.type='file';picker.webkitdirectory=true;picker.multiple=true;picker.hidden=true;
 const button=document.createElement('button');button.textContent='选择本机素材文件夹';button.onclick=()=>picker.click();
 document.querySelector('#loading').append(note,button,picker);
 picker.onchange=async()=>{
  button.disabled=true;try{
   const entries=[...picker.files].map(file=>({file,path:file.webkitRelativePath.split('/').slice(1).join('/')}));
   const paths=new Set(entries.map(e=>e.path));const missing=required.filter(p=>!paths.has(p));if(missing.length)throw Error('所选文件夹缺少：'+missing.join('、'));
   const total=entries.reduce((n,e)=>n+e.file.size,0),estimate=await navigator.storage?.estimate?.();if(estimate?.quota&&total>estimate.quota-(estimate.usage||0))throw Error('浏览器存储空间不足，请释放空间后重试。');
   await cache.delete(new URL('__complete__',assetURL));let done=0;
   for(const {file,path}of entries){if(path.split('/').some(s=>!s||s==='.'||s==='..'))continue;
    const type=path.endsWith('.json')?'application/json':path.endsWith('.png')?'image/png':path.endsWith('.wav')?'audio/wav':file.type||'application/octet-stream';
    await cache.put(new URL(path.split('/').map(encodeURIComponent).join('/'),assetURL),new Response(file,{headers:{'Content-Type':type}}));
    status.textContent=`正在保存本地素材 ${++done} / ${entries.length}`;
   }
   await cache.put(new URL('__complete__',assetURL),new Response('ready'));
   note.remove();button.remove();picker.remove();status.textContent='素材已准备好，正在启动游戏…';await launch();
  }catch(error){status.textContent=error.message;button.disabled=false;picker.value='';}
 };
}
boot().catch(error=>{status.textContent='启动失败：'+error.message;console.error(error);});
