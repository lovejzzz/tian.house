// Keep raw imported metadata intact on disk; correct verified semantic conflicts.
export function correctSourceProperties(properties){
 for(const id of ['fixtures_bathroom_02_26','fixtures_bathroom_02_27']){
  const p=properties[id];if(p?.CustomName!=='Toilet'||p.GroupName!=='Wooden')continue;
  const copy={...p};delete copy.doorW;delete copy.doorFrN;properties[id]=copy;
 }
}
