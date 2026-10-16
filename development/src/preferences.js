const KEY='tian-house-preferences-v1';
export function normalizePreferences(value={}){return {volume:Number.isFinite(value.volume)?Math.max(0,Math.min(1,value.volume)):.65,zoom:Number.isFinite(value.zoom)?Math.max(.6,Math.min(3,value.zoom)):1.55,reducedMotion:value.reducedMotion===true};}
export function readPreferences(){try{return normalizePreferences(JSON.parse(localStorage.getItem(KEY))||{});}catch{return normalizePreferences();}}
export function storePreferences(value){const prefs=normalizePreferences(value);localStorage.setItem(KEY,JSON.stringify(prefs));return prefs;}
