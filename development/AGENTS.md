# Tian House asset workflow

All new or changed visual assets must follow [the asset pipeline](ASSET-PIPELINE.md):
reusable source recipe, exact-lossless delivery atlas, and semantic catalogue.
Keep stable IDs, anchors, state/direction variants and multipart relationships compatible
with existing saves. Do not substitute an approximate redraw for a lossless conversion.
Use the canonical asset build after editing original generators; never ship generator-only
output. New `original-*.png` pages without registered recipes fail the build.
Preserve the source/provenance of imported raster art; an import/packing recipe is valid,
but do not claim it reconstructs the art procedurally. Unknown semantic facts remain null.

For new families, consult [the authoring field guide](ASSET-AUTHORING.md) for existing
geometry/support templates and failure-driven checks before inventing a new path.

## Current project direction

Follow [active goal v2](../handoff/ACTIVE-GOAL-V2.md) for the user-directed volumetric workshop upgrade, preserved scope and acceptance order. Existing 2D evidence is historical; preserve saves and use one authoritative scene for both renderers during migration.
