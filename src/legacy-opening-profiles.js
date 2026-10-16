// Reviewed diagnostic migration profiles, not recovered original 3D dimensions.
// Evidence: evidence/321-legacy-apertures/profiles.json, source page SHA256
// f3ad7955b94bdfaa894ffc7bc15965d77ccb0ff12c6279ebde9834205258173f.
// Project opaque silhouette onto the PZ wall plane, clamp the base to the floor.
// Includes the visible frame/handle envelope; generic 3D styling remains provisional.
// Opaque0/1 audit: evidence/336-privacy-doors/profiles.json, source Tiles2x-62.png.
const profiles={
 fixtures_doors_01_0:{axis:'W',glazed:false,rect:[7/64,40/192,56/64,1]},
 fixtures_doors_01_1:{axis:'N',glazed:false,rect:[4/64,41.5/192,53/64,1]},
 fixtures_doors_01_48:{axis:'W',glazed:true,rect:[7/64,40/192,56/64,1]},
 fixtures_doors_01_49:{axis:'N',glazed:true,rect:[4/64,41.5/192,53/64,1]},
};
export function legacyOpeningProfile(tile,kind,properties={}){
 const p=profiles[tile];
 if(kind!=='door'||!p||!('door'+p.axis in properties)||(('doorTrans' in properties)!==p.glazed))return null;
 return {rect:[...p.rect],evidence:'inferred from source silhouette',sourceTile:tile};
}
