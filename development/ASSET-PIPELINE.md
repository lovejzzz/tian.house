# Asset pipeline

For reusable geometry/material starting points and integration lessons, see
[ASSET-AUTHORING.md](ASSET-AUTHORING.md).

All future visual assets use three independent layers:

1. **Source recipe.** Stable ID, version, reproducible generator or raster import recipe,
   source/provenance, parameters and seed. Keep authoring sources. Original recipes live
   in `assets/recipes/originals.json`; their geometry/palettes currently live in versioned
   Python generators. External parameter dictionaries are deliberately rejected until
   a generator implements that contract. This is reusable code, not yet a visual recipe editor.
2. **Delivery atlas.** Build PNG source, encode exact lossless WebP, decode and compare
   every RGBA byte including transparent RGB. Select WebP only when smaller. Preserve
   region coordinates, anchor offsets and IDs. Source PNGs remain as authoring/recovery
   files; retaining both formats increases local disk usage while reducing image delivery.
3. **Semantic catalogue.** Every original region records family, kind, direction, state,
   multipart position, support, provenance, recipe, pixel size and original properties.
   Unknown material/support stay null, not guessed. State-only window sprites inherit
   semantics through explicit offset links. Directions share a family without collapsing
   broken/intact/open/closed states or multipart geometry.

## Build and check

Use a Python environment with Pillow and WebP support:

```sh
python3 tools/build_asset_library.py --regenerate
python3 tools/test_asset_library.py
npm test
```

Without `--regenerate`, the build packs current PNG sources. The canonical full build
regenerates all five registered original bundles. Generated runtime modules reference
selected delivery pages. `private-assets/semantic-catalog.json` is the machine-readable
index; `asset-build-report.json` records generator/source/runtime/pixel hashes, encoder
versions and byte totals. Recipe IDs and semantic tags also reach workshop search and
asset descriptions. No extra catalogue fetch is required for workshop startup.

A new original atlas must be registered before the build passes. Add semantic overrides
or explicit generator properties when defaults are insufficient; never infer distinct
asset identity from compressed bytes alone. Imported raster/3D assets require equivalent
source/recipe/semantic records before being newly introduced; legacy imported PZ pages
are not migrated by this first rollout. They retain the existing runtime importer.

## Acceptance and publication

Verify deterministic regeneration (decoded pixel hashes), region bounds, state relations,
existing saved IDs, affected placement tests, browser image decoding and visual equivalence.
Run broad tests when shared catalogue behavior changes. Do not reload an active user scene
for an asset build. Development validation uses an isolated browser. Publish only after
scene/release acceptance; source PNGs may be retained in a deployment for compatibility,
so distinguish total deployment bytes from bytes actually requested by the renderer.

### Browser fallback

Offline RGBA equality is necessary but insufficient: Chrome 155 produced different
canvas pixels for the architecture/house-detail WebP pages with translucent art.
Their recipes pin delivery to PNG and record the reason. The three other original
bundles passed browser canvas equality and use smaller WebP. Re-run
`node tools/check_asset_browser.mjs` against the isolated server on port 8883;
it launches a separate headless installed Chrome and does not touch the user's tab.
A failed comparison blocks release; retain evidence and pin the affected recipe to PNG.

Latest application: return-stair guards and dark ribbed masonry are generated through
these same recipes, packed losslessly and indexed semantically. Chrome comparison evidence
is recorded in `../../docs/project-zomboid/evidence/210-upper-shell/browser-pixels.json`.

### Isolated builds and publication

The canonical build copies registered standalone generators, current source pages and
modules into a temporary project. Regeneration, encoding and catalogue validation all
finish there before any live file is replaced. A per-project advisory lock serializes
canonical builds. Unchanged files are not rewritten. Failure while publishing rolls back
already-replaced outputs; success is reported only after publication finishes.

This protects against generator/validation failures and recoverable write errors. It is
not crash-atomic across multiple files: a process kill or machine failure during the final
replacement loop, or a reader during that brief loop, can still observe mixed outputs.
A versioned-directory manifest switch remains needed for strict concurrent-reader release
atomicity. Do not claim the current file loop provides that guarantee. Registered generators
are currently standalone; future shared generator dependencies must be staged explicitly.

### Read-only freshness gate

`npm run assets:check` regenerates all registered originals in isolation, compares source
PNGs, selected delivery pages, runtime modules, catalogue and report byte for byte, and
fails with the stale paths. It never repairs or overwrites published outputs. Use
`npm run assets:build` for intentional regeneration. Both commands accept
`TIAN_ASSET_PYTHON` to select a Python environment with Pillow/WebP; otherwise they use
python3. This is a separate asset gate because runtime-only tests do not need Pillow.

A check pass verifies freshness under the selected encoder/runtime versions. It does
not replace browser pixel comparison or scene acceptance. Missing originals, changed
generator code or changed encoder versions require explicit rebuilding/review.

### Integrity and verification gate

`npm run assets:verify` runs pipeline regressions, isolated freshness verification and
browser pixel comparison against the isolated server (8883 by default). Override
`TIAN_ASSET_BASE_URL` only to verify another server intentionally. Browser verification
fetches without cache, verifies source/runtime SHA-256 against the local build report,
and decodes those exact fetched bytes; comparing two stale server images cannot pass.

Recipe IDs, generator paths, module paths and atlas filenames must be unique. These
checks run before any generator executes. State offsets are indexed once per atlas;
missing targets, conflicting ownership, self-links and orphan properties fail publication.
This removes the region-by-property nested scan while preserving existing catalogue bytes.
PNG-pinned recipes bypass unused WebP encoding. Their browser comparison verifies delivery
identity, not whether WebP would now be safe; changing the fallback policy needs a separate
candidate comparison.

### Installed raster import

`import_assets.py` imports into a new destination only. It stages all nine installed texture
packs beside the destination and publishes the completed directory with a same-filesystem
rename. A failed parse or publication removes staging; an existing library is never updated
in place. Canonical imports to the same destination are serialized. This directory publication
contract applies to a new import, not to the multi-file original-generator build above.

The atlas manifest records the importer hash, ordered source packs/hashes and both within-pack
and across-pack override records. Duplicate source IDs are valid in PZ; later entries win.
UI2 must be last, matching the existing library's five rain sprites. Importing unchanged
installation packs must preserve every region, anchor, scale and image hash. The import is
raster extraction, not procedural regeneration. Full imported semantic classification and
compression migration remain separate work.

`npm run assets:imports:check` validates every imported PNG hash/header/dimension and all
region bounds, coordinate types and scales without modifying files. It runs importer and
integrity regression tests and is included in assets:verify. Hash checks establish identity
to the recorded import; they do not establish visual quality or semantic completeness.
`audit_workshop_catalog.mjs` now includes explicit unavailableDetails rather than only a
missing count, so asset coverage can be checked against installed source packs.

### Supplemental installed packs

Use `python3 import_assets.py --source <installation> --add-pack <pack-stem>` to add a
previously omitted pack. It refuses duplicate pack names, existing sprite IDs and existing
page filenames. Parsing completes in staging; new pages publish first, then the manifest
switches with a single replacement. Recoverable publication errors remove additions.
A process kill before the manifest switch can leave unreferenced files requiring cleanup;
this is not automatic crash recovery. Old referenced files are never replaced.

The default full import now includes Overlays2x.floor after UI2. Its 56 existing source
FloorOverlay properties are retained; these sprites layer over structural floors and below
furniture. Raw source labels are still technical and need a separate semantic UX pass.

### Imported semantic catalogue and source queries

`npm run assets:imports:catalog` builds `private-assets/imported-semantic-catalog.json.gz`.
The check variant is part of assets:imports:check and rejects stale output. Gzip is lossless;
use Python gzip/json or Node zlib.gunzipSync to read it. The normalized document stores
sprite regions/properties, page/pack hashes and direction families once, with catalogue
entries referencing them. It includes missing-property sprite IDs and unavailable entries
without pretending they are placeable. The document is an offline tool artefact; game
startup does not fetch it.

Classification and orientation groups reuse workshop code. Their evidence is explicitly
rule-based, not exhaustive visual verification. Unknown directions/materials stay unknown.
The public Build commands → Describe asset response now includes provenance for each part:
source kind/recipe, imported pack/page hashes, exact region, anchors and source scale.
Generated originals identify their recipe; absent imported source/hash data remains null.
No private atlas metadata is used to invent real-world dimensions.

### Shared shaped-ground contract

Raised floor variants may reuse an existing atlas region with `TianGroundPolygon`, a
JSON convex counterclockwise polygon of 3–8 unique vertices in the unit cell, and
`TianGroundHeight` in (0,16] source pixels. `TianGroundBase` optionally names a flat,
non-overlay floor in the same recipe bundle. The base is stored as an ordinary tile;
it is not a recursive recipe or hidden runtime state. Build validation rejects invalid
polygons and missing, recursive or elevated bases before publication.

Rendering, visible boundary faces, actor elevation, threshold clearance and furniture
support consume the same footprint. Preview and committed floor placement retain the
same base/top pair. Rotation variants share one semantic family and may share identical
atlas regions; distinct geometry must not be deduplicated by texture hash alone.

## Volumetric prototype recipes

The first physical family lives in `assets/recipes/volume/table.json`. Build with
`node tools/build_volume_assets.mjs`: deterministic mesh/collision/support output,
material and migration semantics, source hashes, gzip delivery and decompression equality.
`assets/volume/table.json.gz` is fetched/decompressed by the diagnostic browser renderer.
No new raster atlas is required for mesh-only delivery. The original sprite IDs and art
remain untouched; source-to-volume mappings are explicit approximations. This is not yet
catalogue-wide migration, textured-material acceptance, or final shipping artwork.

The volume batch now also includes `assets/recipes/volume/lamp.json` → `lamp.json.gz`.
`build-report.json` schema 2 records each delivered family independently. Mounted families
must retain actual scene support references; light parameters are compiled from the same
object transform as their mesh. Reference light/material quality remains a separate visual
gate from lossless delivery and geometry tests.

Chair and shelf recipes now share `frame-furniture-volume.js`. Placement offsets and cell
extents define rotations around the source footprint, so N/W variants do not collapse to S.
Source Facing and multipart positions must be inspected before mapping; generic geometry
is marked approximate. Separate frame members preserve actual empty spaces for rendering
and collision. A successful batch build is not evidence of catalogue-wide coverage.

Procedural timber materials store a small `texture` descriptor (kind, size, seed, physical
repeat) in the compressed volume recipe. `volume-material-texture.js` regenerates neutral
color modulation and roughness maps; its hash is included in the build report. Identical
recipes share GPU maps within a preview and dispose them on close. This is an authored
procedural material, not a lossless conversion of imported raster art. Existing images
continue through the atlas pipeline. Local UVs must move/rotate with furniture and preserve
physical texture scale; visual inspection must reject obvious algorithmic repetition.

### Atomic volume batch publication (checkpoint334)

`build_volume_assets.mjs` now prepares and validates every family before writing deliveries.
Payload names include their SHA-256; `build-report.json` schema3 is the sole runtime index.
Only after all referenced files exist does a same-directory rename publish the complete new
manifest. Runtime reads one manifest snapshot, validates safe paths/unique IDs and verifies
compressed byte size/hash before decoding geometry. Late generator or manifest-write failure
leaves the old manifest usable. Keep old hashed files while older pages may still reference
them; fixed-name legacy payloads remain historical artifacts and are no longer loaded or
used by tests. Future cleanup must account for retained manifests / active releases.

The guarantee is reader consistency on the local same-filesystem build, not power-loss
fsync durability or a remote CDN deployment transaction. Host deployment must upload immutable
payloads before switching its manifest and retain previous referenced payloads. A corrupted
immutable file fails closed and requires repair; it is never silently trusted. Tests inject
late generation/publication failure and corrupt bytes, and load an old snapshot after a new
publication. These checks complement, not replace, browser visual acceptance.

### Generator dependency and exit-status discipline

Register transitive generator imports in each consuming recipe, including runtime package manifests, implementation files and licenses. The studio raster generator shares the upholstery hull implementation with 3D and explicitly stages its Three.js dependency; registering only the volume recipe is insufficient.

Use `npm run assets:rebuild:verify` for sequential regeneration, pipeline tests and read-only freshness verification. It short-circuits on failure. When running commands separately, inspect each exit status before starting the next step; a later passing test is never evidence that an earlier build succeeded.
