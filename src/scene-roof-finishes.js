// Source-atlas pairs: full wall family/base -> 30-degree gable family/half.
// Keep the finish independent of slope shingles and of room orientation.
const finishes=[
 ['walls_exterior_house_01',0,'01',0],['walls_exterior_house_01',4,'01',48],
 ['walls_exterior_house_01',16,'02',0],['walls_exterior_house_01',20,'02',48],
 ['walls_exterior_house_01',32,'03',0],['walls_exterior_house_01',48,'03',48],
 ['walls_exterior_house_01',52,'04',0],['walls_exterior_house_02',0,'04',48],
 ['walls_exterior_house_02',4,'05',0],['walls_exterior_house_02',16,'05',48],
 ['walls_exterior_house_02',20,'06',0],['walls_exterior_house_02',32,'06',48],
 ['walls_exterior_house_02',36,'07',0],['walls_exterior_house_02',48,'07',48],
 ['walls_exterior_house_02',52,'08',0],['walls_exterior_house_02',64,'08',48],
 ['walls_exterior_house_02',68,'09',0],['walls_exterior_house_02',80,'09',48],
 ['walls_exterior_house_02',84,'10',0],['walls_exterior_house_02',96,'10',48],
];
export function gableFinish(tile,axis,roof={}){
 const direction=axis==='N'?1:0;
 let match=roof.endSource?finishes.find(([, ,family,offset])=>roof.endSource==='walls_exterior_roofs_30_'+family&&(roof.endOffset??0)===offset):finishes.find(([family,base])=>tile===family+'_'+(base+direction));
 if(roof.endSource&&!match){if(!/^walls_exterior_roofs_30_\d+$/.test(roof.endSource)||![0,48].includes(roof.endOffset??48))throw Error('Choose a supported gable end material');return {source:roof.endSource,offset:roof.endOffset??48,fullTile:tile||'walls_exterior_house_01_'+(32+direction)};}
 // Unsupported wall finishes use a coherent white siding set, never a mixed band.
 match??=finishes[4];const [family,base,endFamily,offset]=match;
 return {source:'walls_exterior_roofs_30_'+endFamily,offset,fullTile:family+'_'+(base+direction)};
}
