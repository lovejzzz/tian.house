// AnimBoneWeight defaults and AnimationTrack max-assignment semantics.
// null bindings mean no mask; an explicit empty list masks every bone out.
export function resolveBoneMask(bones,bindings){
 if(bindings==null)return new Map(bones.map(b=>[b.name,1]));
 const weights=new Map(bones.map(b=>[b.name,0]));
 const children=new Map();for(const b of bones){if(!children.has(b.parent))children.set(b.parent,[]);children.get(b.parent).push(b.name);}
 for(const binding of bindings){
  if(!binding?.boneName||!weights.has(binding.boneName))continue;
  const value=Math.fround(Number(binding.weight??1));
  const descendants=binding.includeDescendants===undefined||binding.includeDescendants===true||binding.includeDescendants==='true';
  const pending=[binding.boneName],seen=new Set();
  while(pending.length){const name=pending.pop();if(seen.has(name))continue;seen.add(name);
   weights.set(name,Math.max(weights.get(name),value));
   if(descendants)pending.push(...children.get(name)??[]);
  }
 }
 return weights;
}
