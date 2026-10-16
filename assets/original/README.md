# Tian House original interiors

`tools/make_interior_rugs.py` produces the original Linen area rug, Moss border
rug and Oatmeal entry runner. These are deterministic pixel illustrations drawn
from geometric weaving patterns; they contain no copied game or reference-photo
pixels. Output: `private-assets/original-interiors.png` and
`src/original-assets.js`. All three are grouped, movable floor overlays available
by name in the workshop. Their underlying structural floor stays intact.

The palette is warm linen, moss green and oatmeal, designed for the Glasshouse
interior renovation. Dimensions are 3×2, 3×2 and 2×1 grid squares respectively.

## Sanctuary furnishings

`tools/make_house_details.py` draws 37 original pixel sprites: tea and books,
kitchen/desk/toiletry clusters, lamps, drapes, framed art, shelter boards,
ventilation grilles, water tanks, air/power cabinets and twelve monthly pantry
cabinets. Run with Python + Pillow. Output is `private-assets/original-house-details.png`
and `src/house-detail-assets.js`; no reference photograph pixels are included.
`tools/furnish_glasshouse.mjs` reproduces the curated Sanctuary plan from the
preserved Garden edition. Runtime metadata registers every sprite in the workshop.

Tabletop objects use the supporting furniture's Surface height consistently in
play, workshop, previews and thumbnails. Wall/window attachments require matching
supports. Lamps toggle a local visual glow; air/power equipment and ventilation
are architectural representations, not a certified or year-long shelter simulation.

## Café furnishings

`tools/make_cafe_assets.py` generates 28 original procedural sprite parts in
`private-assets/original-cafe.png` and the registry `src/cafe-assets.js`. Run
with Python + Pillow. The five-cell rounded L service counter has four complete
orientations, continuous timber cladding and a reusable convex collision polygon
for each cell. Explicit prefab anchors support sparse shapes whose rotated
bounding-box corner is empty. Espresso machine and grinder each have four
orientations and bind to a table surface; they are decorative equipment, not
coffee-making interactions. No reference-photo or source-game pixels are copied.
The counter outline is a visual study of the Momento reference; its dimensions
are inferred, not measured from a plan. Browser evidence: milestone 188.

## Tall steel sash windows

`tools/make_architectural_windows.py` deterministically draws `private-assets/original-architecture.png` and `src/architectural-assets.js`: two directions, four gameplay states each. Original Pillow geometry, no copied image pixels. `TianWindowProfile` stores normalized aperture bounds `[left,top,right,bottom]` in a one-cell wall material plane. Compiler, surround renderer and traversal share this profile. Only closed base entries appear in the catalog; numeric suffix offsets select open, smashed and glass-removed artwork. Compatible with editable N/W and diagonal walls; legacy tile-wall migration remains pending. Verified in milestone192; not a claim of final photo fidelity.

## Masonry and café service details (193)

`tools/make_masonry_assets.py` creates `original-masonry.png` / `masonry-assets.js`: deep blue painted brick, chalk brick, weathered plaster and exposed brick; each has N/W wall, door-surround and standard window-surround forms. All pixels are procedural. Numeric offsets retain the wall compiler contract. `TianDerivedAsset=true` keeps automatically chosen surrounds out of the placement catalog; all remain registered for rendering and saved scenes. Materials are still single-face wall definitions, not dual-face finish support.

`make_cafe_assets.py` now also includes four-direction pour-over kettle/drippers and paper cups/menu stand. All are supported countertop decorations and have no invented brewing behavior. Material/detail placement, photo bindings and exact persistence comparisons are recorded in milestone193.

## Modular window sills and wall display shelves (195)

`make_cafe_assets.py` adds N/W continuous sill rails and three-tier dark timber/steel wall shelves, bringing its atlas to 40 parts. The shelf is empty geometry with a real `shelves` container; six `TianDisplaySlots` position actual stocked inventory on its three tiers. No stock is baked into the art. The sill is a low modular rail for the current tall-window aperture; its height is not measured from the reference. `TianOpeningCompatible=window` permits wall/window support but rejects doorways. The photos inform form and placement, never copied pixels. Existing PZ one/two-tier wall shelves were inspected before making this missing three-tier form.

Milestone194 added independent wall-face assignments around the existing masonry definitions. That is scene data and inspection support, not a new runtime camera.

Milestone197 adds two reusable continuous plaster materials (warm umber and ivory), each with N/W solid, door-surround and window-surround sprites. The cafe atlas adds a plain dark service door with closed/open N/W states, plus an opaque full-height charcoal wall curtain. These are deterministic original geometry and texture marks generated by `tools/make_masonry_assets.py` and `tools/make_cafe_assets.py`, not recolored copies of source-game or reference-photo pixels. The curtain mounts to a solid wall; it does not imply an unseen opening. The door has ordinary working open/close behavior; the photographed raised threshold is not yet reproduced.
