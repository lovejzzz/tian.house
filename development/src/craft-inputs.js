// InputScript item-line decoding. Resource children and mapper execution are
// separate obligations; retaining a mapper name does not execute that mapper.
const split=value=>value.replace(/;+$/,'').split(';');
function amount(value){const n=Number(value);if(value.trim()===''||!Number.isFinite(n))throw Error(`Invalid input amount: ${value}`);return Math.max(0,Math.fround(n));}
function bracket(token){const start=token.indexOf('['),end=token.indexOf(']');if(start<0||end<start)throw Error(`Invalid input list: ${token}`);return split(token.slice(start+1,end));}
export function parseCraftItemInput(line){
 const parts=line.trim().split(/\s+/);if(parts[0]?.toLowerCase()!=='item')throw Error('Resource input requires its own parser');
 const range=parts[1]?.includes('variable')?bracket(parts[1])[0].split(':'):null;
 const min=amount(range?range[0]:parts[1]),max=range?amount(range[1]):min;
 const input={originalLine:line.trim(),resourceType:'Item',amount:min,maxAmount:max,mode:'Normal',items:[],itemTags:[],flags:[],mappers:[],itemAmounts:[],itemMaxAmounts:[],acceptsAnyItem:false,shapedIndex:-1};
 for(const token of parts.slice(2)){
  if(token.startsWith('['))for(const entry of bracket(token)){
   if(entry==='*'){input.acceptsAnyItem=true;continue;}
   const colon=entry.indexOf(':'),n=colon<0?min:amount(entry.slice(0,colon));
   input.items.push(colon<0?entry:entry.slice(colon+1));input.itemAmounts.push(n);input.itemMaxAmounts.push(colon<0?max:Math.fround(n*Math.fround(max/min)));
  }
  else if(token.startsWith('tags['))input.itemTags.push(...bracket(token));
  else if(token.startsWith('flags['))input.flags.push(...bracket(token));
  else if(token.startsWith('mappers['))input.mappers.push(...bracket(token));
  else if(token.startsWith('mode:')){
   const mode=token.slice(5).toLowerCase();if(mode==='keep')input.mode='Keep';else if(mode==='destroy')input.mode='Destroy';else if(mode!=='use')throw Error(`Unsupported item mode: ${mode}`);
  }
  else if(token.startsWith('shapedIndex:')){const n=Number(token.slice(12));if(!Number.isInteger(n))throw Error('Invalid shaped index');input.shapedIndex=n;}
  else if(token.startsWith('overlayMapper'))input.overlayMapper=true;
  else throw Error(`Unsupported input token: ${token}`);
 }
 input.itemTags=[...new Set(input.itemTags)];input.flags=[...new Set(input.flags)];
 if(input.itemAmounts.length>1&&min===max&&new Set(input.itemAmounts).size>1)input.amount=input.maxAmount=1;
 if(input.acceptsAnyItem){input.items=[];input.itemTags=[];}
 return input;
}
export function usesPartialCraftItem(input,properties){
 if(input.flags.includes('ItemCount')||input.mode==='Destroy'||input.mode==='Keep'||!properties)return false;
 if(properties.ItemType==='base:drainable')return Math.fround(Number(properties.UseDelta??.03125))<1;
 if(properties.ItemType==='base:food')return Math.abs(Math.fround(Number(properties.HungerChange??0)))>1;
 return false;
}
