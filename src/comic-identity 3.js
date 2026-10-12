let catalog=null;
export function setComicCatalog(data){
 if(data?.schema_version!==1||!Array.isArray(data.entries)||!data.entries.length||data.entries.some(e=>typeof e.key!=='string'||typeof e.title!=='string'||!Number.isInteger(e.issues)||e.issues<0||typeof e.inPrint!=='boolean'))throw Error('Invalid comic catalog');
 catalog=data;
}
export function comicIdentity(entry,issue,baseName,formats){
 const numbered=entry.issues!==0;
 const identity=entry.key+(numbered?'#'+issue:'');
 const number=numbered?'#'+String(issue).padStart(String(entry.issues).length,'0'):'';
 const template=formats[numbered?'IGUI_MagazineName':'IGUI_MagazineNameNoIssue'];
 return {identity,displayName:template.replace(/%([123])/g,(_,n)=>[baseName,entry.title,number][Number(n)-1])};
}
export function initializeComic(item,properties,baseName,randomInt=n=>Math.floor(Math.random()*n)){
 const callback=properties.OnCreate;
 if(!['ItemCodeOnCreate.onCreateComicBook','ItemCodeOnCreate.onCreateComicBookRetail'].includes(callback))return;
 if(item.modData?.literatureTitle!==undefined)return;
 if(!catalog)throw Error('Comic catalog is not loaded');
 const retail=callback.endsWith('Retail');
 if(retail&&!catalog.entries.some(e=>e.inPrint))throw Error('The comic catalog has no in-print series');
 let entry;do{entry=catalog.entries[randomInt(catalog.entries.length)];}while(retail&&!entry.inPrint);
 const issue=entry.issues?randomInt(entry.issues):0;
 const named=comicIdentity(entry,issue,baseName,catalog.formats);
 item.modData={...item.modData,literatureTitle:named.identity};item.displayName=named.displayName;
}
