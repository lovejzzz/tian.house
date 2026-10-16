// Show the highest reached floor; a small downward margin avoids boundary flicker.
export function physicalViewLevel(levels,currentId,feetHeight,storeyHeight){
 if(!Number.isFinite(feetHeight)||!Number.isFinite(storeyHeight)||storeyHeight<=0)throw Error('Invalid physical view height');
 const sorted=[...levels].sort((a,b)=>a.index-b.index),current=sorted.find(l=>l.id===currentId),candidate=sorted.filter(l=>l.index*storeyHeight<=feetHeight+.01).at(-1)||sorted[0];
 if(!candidate)return null;
 if(current&&candidate.index<current.index&&feetHeight>=current.index*storeyHeight-.25)return current.id;
 return candidate.id;
}
