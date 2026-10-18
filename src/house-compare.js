// Same house for the purpose of "edit the house I live in": structure, tiles, items
// and vehicles, compared independently of key order.
const stable=v=>Array.isArray(v)?'['+v.map(stable).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}':JSON.stringify(v);
const part=v=>Array.isArray(v)&&!v.length?null:v??null; // a missing list and an empty one are the same
export const sameHouse=(a,b)=>['sceneDocument','squares','items','vehicles'].every(k=>stable(part(a?.[k]))===stable(part(b?.[k])));
