// Navigation facets separate complete window/door assets from raw wall openings.
export function openingType(entry,properties){
 const tile=entry.source||'',p=properties[tile]||{};
 if(p.TianMount==='window'||/curtain|drape/i.test(tile+' '+entry.name))return 'Curtains';
 if(entry.id?.startsWith('garage:')||/^fixtures_doors/.test(tile)||'doorN'in p||'doorW'in p)return 'Doors';
 if(/^tian_glazing_|^fixtures_windows_(?!detailing)/.test(tile)||'windowN'in p||'windowW'in p)return 'Windows';
 return 'Parts';
}
export function catalogPage(total,page,size=60){const pages=Math.max(1,Math.ceil(total/size)),current=Math.max(0,Math.min(page,pages-1));return {pages,page:current,start:total?current*size+1:0,end:Math.min((current+1)*size,total)};}
