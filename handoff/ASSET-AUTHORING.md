
### Reviewed source-patch detail transfer (352)

For dimensional furniture, use `source-patch` with a sourceTile and a three-vector planar patch `[origin,U,V]` in trimmed-region pixels. Inspect the source first; only fully opaque reviewed pixels are legal. The sampler rejects alpha holes and out-of-region footprints rather than silently filling them. Optional `detail:{base,strength}` removes a fitted affine RGB gradient and modulates the recipe tint with residual detail. It is an approximation, not PBR/albedo recovery. Mirrored repeat hides hard texture boundaries but can expose repetition; review at actual gameplay scale.

Record atlas and source page in recipe sourceFiles, plus materialEvidence describing source and limits. Cache identity includes source, plane/patch, resolution and normalization; UV repeats do not create redundant textures. Batch all related recipes, rebuild canonical raster/volume outputs, then inspect the real scene. Geometry thumbnails do not prove runtime textured quality.
