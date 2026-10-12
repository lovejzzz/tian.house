// Source-derived sprite layout, with inferred initial states from import_trees.
// The summer leaf layer is provisional until matching-date source captures exist.
export function treeSprites(tree){const {tileset,stage,evergreen}=tree;if(!Number.isInteger(stage)||stage<0||stage>5)throw Error('Unsupported tree growth stage');const jumbo=stage>=4,base=jumbo?tileset.replace('_1','JUMBO_1'):tileset,index=jumbo?stage-4:stage,stride=jumbo?2:4;return evergreen?[`${base}_${index}`]:[`${base}_${index}`,`${base}_${stride*3+index}`];}
