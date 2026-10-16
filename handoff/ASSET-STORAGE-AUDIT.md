# Asset storage audit — 2026-10-13

Measured local development `apps/pz-browser/private-assets`, excluding Git history,
node_modules, docs/reference photos, source Steam installation and deployment copies.
Decimal MB/KB throughout. This is disk usage, not measured first-load traffic or decoded GPU memory.

| Type | Files | Bytes | MB |
|---|---:|---:|---:|
| PNG images | 818 | 544137972 | 544.14 |
| JSON (atlas, properties, maps, item/other data) | 198 | 100025834 | 100.03 |
| WAV | 6 | 4243720 | 4.24 |
| Total | 1022 | 648407526 | 648.41 |

Current runtime loads PNG atlas pages via Renderer.page, crops sprite regions using
atlas coordinates/offsets/scales and retains images in a page cache. The imported
atlas has 44,654 regions; this is not 44,654 distinct placeable objects. Original
procedural atlases are installed separately. Atlas JSON is 5,688,682 bytes and source
world property JSON is 4,132,803 bytes. Page loading is demand driven, but no claim is
made here that all pages or metadata have optimal download granularity.

New original cafe/masonry assets retain generator scripts and generated PNG output.
The generator is a reusable authoring source, while the PNG is currently the runtime
artifact. Imported PZ art has raster originals and metadata, not an exact recovered
procedural representation. A custom pixel array would still be image encoding;
raw arrays/JSON are not inherently smaller or more semantically identifiable.

## Exact-lossless sample experiment

Pillow encoded in-memory WebP lossless with exact=True/method=4. Each result was
decoded to RGBA and compared byte-for-byte with the original decoded RGBA, including
transparent pixels. Source/runtime files were not replaced. This is a five-page
sample, not a corpus compression guarantee or browser deployment verification.

| Page | Existing bytes | Lossless WebP bytes | Exact RGBA |
|---|---:|---:|---|
| original-cafe.png | 24632 | 9544 | yes |
| original-masonry.png | 70284 | 43844 | yes |
| Tiles2x-194.png | 1047407 | 721674 | yes |
| Tiles2x.floor-0.png | 1196182 | 758702 | yes |
| UI2-0.png | 4193990 | 550920 | yes |

Full values, raw RGBA/zlib and optimized-PNG comparisons are in
`evidence/asset-storage-audit/lossless-samples.json`. Re-optimized PNG can also grow
(original-masonry did); select encodings by measured size, not format assumptions.
Exact whole-file PNG hashing found four redundant copies totaling 2,307,445 bytes;
this does not count possible identical decoded pixels or repeated sprite regions.

## Proposed asset pipeline

1. Preserve source art/generator and stable asset IDs. Generate exact-lossless runtime
   pages, selecting only candidates smaller than source, verified by decoded pixel hash.
2. Repack/deduplicate sprites without changing trim offsets, anchors, direction/state
   identity, multipiece relationships or save IDs. Verify atlas bounds and rendered
   edges at multiple zoom factors. Do not merge damaged/intact/open/closed semantics.
3. Keep semantic metadata independent of encoding: category, state, material, family,
   direction, dimensions, support type, interaction, source/provenance and reference
   associations. Add searchable tags/visual features rather than expecting compression
   to reveal whether a pixel pattern represents a chair, window or toilet.
4. Retain procedural parameters/seed/version for originals where they reproduce art
   exactly, baking cached browser-ready pages at build time. Imported art only uses a
   recipe if exact reconstruction is proven; do not replace it with an approximation.
5. Measure full corpus bytes, first-load requests, decode time, peak memory, workshop
   scroll latency and real-browser visual equivalence before enabling in deployment.

References: PNG indexed-color and lossless compression specification
https://www.w3.org/TR/png/ ; WebP lossless bitstream specification
https://developers.google.com/speed/webp/docs/webp_lossless_bitstream_specification .
Neither semantic reindexing nor delivery conversion has been enabled by this audit.
The photo-to-scene goal and ongoing building work remain unchanged.
