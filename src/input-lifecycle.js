// Background suspension is independent of manual pause, menus and timed actions.
export function bindInputLifecycle(win,doc,clearInput){
 let suspended=doc.visibilityState==='hidden';
 const suspend=()=>{suspended=true;clearInput();};
 const resume=()=>{if(doc.visibilityState!=='hidden'){clearInput();suspended=false;}};
 win.addEventListener('blur',suspend);
 win.addEventListener('focus',resume);
 win.addEventListener('pageshow',resume);
 doc.addEventListener('visibilitychange',()=>doc.visibilityState==='hidden'?suspend():resume());
 return {get suspended(){return suspended;}};
}
