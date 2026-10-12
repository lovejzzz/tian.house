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
