# Hearth Studio — single-resident design brief

User-directed next visual acceptance scene, 2026-10-14. Preserve Courtyard Studio and all
previous library entries. This brief supersedes its three-room layout for the next sample,
not the broader goal. Status: design and production batch in progress, not accepted house.

## Spatial design

One 10 × 6 m open living room plus an attached 3 × 2 m bathroom (66 m² at 1 m grid),
2.8–3 m ceiling. The 60 m² initial estimate is expanded slightly to preserve a usable
training area, circulation and real equipment proportions. Avoid a spare dining room,
separate bedroom corridor, outdoor yard or additional empty rooms in this sample.

Coordinates below are local metres, north at y=0. Initial grid proposals must be corrected
against actual generated furniture and a walkthrough before acceptance:

| Zone | Position / envelope | Reason |
|---|---|---|
| Double bed | NW, x0.2–1.8 y0.2–2.3 | 1.6 × 2 m mattress, bedside access on east; warm reading light |
| Wardrobe / sleep divider | x2–3 y0–2 | Screens bed from work area, storage without another room |
| Computer desk | north wall x3–5 y0–0.8 | 1.8 m desk, MacBook, external monitor, keyboard/mouse, task light; chair pullback |
| Upright piano | north wall x6–7.53 y0.15–0.77 | 1.53 × .62 × 1.21 m reference; bench in front, away from sink/heat |
| Kitchen | east wall x9–10 y0–4 | Fridge, preparation, sink and hob; preparation space between water and heat |
| Breakfast bar | x7–9 y3–3.8 | Two seats south of bar; kitchen aisle to north; no redundant dining table |
| Media console | x3–5.2 y2–2.45 | 2.2 m console and 85-inch television, speakers beside it; front faces south |
| L sofa | x3–6 y4–6 | Faces television; chaise on west side, leaves east-side entry route |
| Functional trainer | west wall x0–.9 y3.5–5.5 | Faces east; reserve x.9–3 y3.5–5.5 for cables/exercise, not furniture storage |
| Entrance | east wall y5 | Short route to bar, living, bathroom; shoe storage/hooks outside swing path |
| Bathroom | x7–10 y6–8 | Opaque door from living; shower, toilet, basin, mirror, extraction and towels |

The training zone is shared open floor, not a hidden collision solid. Cable range must be
reviewed for the selected exercise; no promise that all trainer exercises fit. Routes must
remain usable while kitchen/bath doors open and desk/stools/bench are occupied.

## Production batch and finish direction

Produce together: upholstered L sofa, upright piano + bench, laptop + external monitor
workstation, 85-inch screen + low cabinet, two floorstanding speakers, cable trainer,
breakfast bar + stools. Reuse and improve bed, wardrobe, kitchen and bathroom families.
Each remains independently editable; do not bake a furnished apartment into one mesh.

Warm off-white walls, mid-tone source-derived timber floor, oatmeal upholstery, walnut
furniture, restrained dark metal. Bathroom gets source-derived ceramic floor, not timber.
Keep authored texture variation, bevels, seams, cushion loft, speaker cones, piano keys,
trainer cables/pulleys, handles and hardware. Primitive geometry is a dimensional scaffold,
not visual acceptance. Do not globally relabel unrelated legacy sprites as these products.

Lighting: soft warm practical lamps around 2700–3000 K as art direction, neutral daylight,
reading/task light and kitchen/bath work light. Preserve exposure when comparing direct
and indirect contributions. No permanent orange full-room filter; television is not a large
uncontrolled light source. Existing probe experiment remains opt-in until leakage/update
and full-room visual review pass.

Supplement: bedside surface, clothes/shoes, laundry basket, towels, soap, kitchen bin,
small kettle/coffee setup, curtains, books and one plant. Initially tidy and coherent; later
clutter is a separate resident-driven layer. No random props added merely to fill space.

## Sources and assumptions

- Samsung QN85C manufacturer drawing: 85-inch display 1892.2 × 1081.9 × 27.2 mm without stand;
  https://image-us.samsung.com/SamsungUS/samsungbusiness/tv-ci-resources/Dimensions_QN85C.pdf
- Yamaha U-series manufacturer specification: U1 153 × 62 × 121 cm;
  https://uk.yamaha.com/en/musical-instruments/pianos/products/upright-pianos/u-series/specs.html
- BodyKore equipment manual explicitly requires working space for full cable extension;
  https://media.bodykore.com/pdfs/GR_638_Manual_7282eda5b2.pdf
- Remaining sizes, colors and arrangement are our design assumptions, not claimed user facts.

## Acceptance

Named separate save; reload/export/import; all listed objects represented and selectable;
realistic dimensions; warm day/night screenshots; source texture comparison; no wall gaps;
walk entrance → desk → bed → piano → training area → kitchen/bar → bathroom → sofa.
Inspect door sweeps, stool/chair/bench pullback, side-of-bed access, TV sightline, appliances,
waterproof floor and light invalidation. Mark unsupported interactions and approximate art
explicitly. No production deployment until the complete scene has been visually reviewed.

## First integrated batch351

Created ten original furniture families (384 geometry parts), four orientations each,80
catalogue sprite regions. Catalogue sprites are projections of the same geometry, not another
hand-drawn model. Compressed delivery and semantic catalogue are built canonically; native
Tian IDs avoid replacing unrelated PZ furniture. The portable house was built with public
WorkshopCommands and imported through House Library. Previous Courtyard Studio is preserved.

Current house:66 m²,2 rooms,35 objects,2 roof volumes,6 openings. All35 placed objects resolve
in the 3D renderer; no unresolved openings. Bathroom uses original ceramic source pixels.
Saved house and public command receipts live in evidence/351-hearth-studio. First import
survived reload; final revisions imported and saved. Full final-revision reload still pending.

Actual route: trainer area → central aisle → sofa/bar side passage → E-open bathroom door
→ bathroom. After moving the blocking floor lamp, x8000.635/y11406.298 was grounded/clear;
inside bathroom x8002.455/y11407.598 grounded/clear. This is diagnostic-body validation, not
full character interaction or a three-day residence. Initial floor lamp blocked the narrow
route and was moved to the bed area. South-boundary lights previously pointed outside;
fixed generic wall-attached volume orientation to point into the sole occupied adjacent room.
Added two sconces behind the sofa after night review showed that zone was too dark.

Night screenshot uses experimental first bounce,2 probes; initial capture1389ms, warmed final
capture116ms. Not a performance acceptance claim. Direct shadows remain sharp; no spatial
probe visibility, no final fabric/wood source-material treatment. Furniture is still visibly
simplified. Laptop OS, TV, piano and trainer interactions are not implemented for these new
objects. Shoe/laundry storage, bathroom mirror/ventilation, bedside surfaces and smaller
household supplies remain to be completed. Do not describe this as a finished cozy interior.

## Iteration 352 — batch source-detail transfer

Added reviewed planar PZ wood/cloth patches to all ten studio recipe families and the bed/curtain recipes. Geometry remains original; imported source pixels supply small-scale surface detail. An affine RGB gradient is removed before tint modulation to reduce doubled baked illumination. This is not recovered PBR albedo. Patches use mirrored repeat, with explicit source tile/coordinates, source file hashes and limitations in recipes. Small source resolution and mirrored repetition limit fidelity. Catalog thumbnails remain approximate geometry previews without runtime texture transfer.

Reloaded final revision 11 through the real browser: 35 furnishings, two rooms, six openings, zero unresolved furnishings/openings. Temporary visitor walked to x7999.116/y11404.300, grounded and clear; original game state stays isolated. Day/night screenshots in evidence/352-source-detail. Night first-bounce study: two probes,124 ms capture, no within-room visibility correction. Browser error log empty. 794 Node tests passed; canonical raster regeneration/check and volume build passed.

Visual review remains NOT accepted: sofa/wood detail is subtle at whole-room scale; wall shadows remain hard, some furnishings too regular, kitchen/bar still plain. No UE5/GI parity claim, no deployment. Remaining household fittings, interactions, soft lighting and residence checks remain open.

## Layout review 357 — work/media conflict (supersedes initial placement table)

User correctly identified desk seating directly behind the freestanding TV. Revised using public commands, stable object IDs and original furniture count: workstation now W-facing variant at local(0,2), facing into the room from west window; chair E variant at(1,3), facing desk. Mounted task lamp moves/rotates with its host. Floor lamp moved to(3,0), plant to(8,1). Actual initial walk exposed the proposed floor lamp at(2,3) intruding into chair pullback; corrected rather than accepting collision-only preview. Media console remains at(3,2) as a room divider; there is no longer a permanent seat behind it. Cable concealment at its rear is still an open requirement, not implemented by moving the desk. No assertion that TV heat alone makes any rear position unsafe.

Research: Samsung installation guidance calls for ventilation clearance, subject to model/manual, and OSHA desk guidance requires clear working/leg space and adaptable posture:
- https://www.samsung.com/uk/support/tv-audio-video/how-to-mount-a-samsung-tv/
- https://www.osha.gov/etools/computer-workstations/components/desks
- https://www.osha.gov/etools/computer-workstations/components/work-space

Planning targets (design assumptions, not legal minima): unobstructed chair pullback, dedicated TV rear service/wire route, no cables across circulation, exercise cable working envelope separate from seating, bar stools considered occupied/pulled out. Remaining review: bathroom approach with stools pulled out; bed side/foot access; piano bench use; screen glare; freestanding TV back finish/cable management. Current walkthrough is not a complete occupied-furniture ergonomics acceptance. Preserve old screenshots as failed arrangement evidence.

## Finish review358

Studio main floor now uses imported fine timber `floors_interior_tilesandwood_01_44` rather than rustic deeply jointed `_40`; original `_40` remains unchanged for all other houses. Added reviewed source-floor reprojection mapping for44, retaining source page hashes and the same assumed1m repeat scale. Public room.floor command559→560, saved to House Library. Reproducible builder updated without regenerating/overwriting historical IDs. This is material selection and imported-pixel reprojection, not an improved source-resolution or GI claim.

## Courtyard batch382

The actual saved home now has a4×5m paved entrance court east of the entry, with a2m
clear approach extending to the east plot boundary. An E-facing bench sits on the court's
side, clear of the door approach, with two planters at the southern corners. This is a
basic court, not finished landscaping: no outdoor lighting, weather-appropriate planting
scheme or final paving detail acceptance yet. Existing snake-plant models are provisional
sheltered decorative pots, not a validated outdoor climate planting recommendation.
Public commands561→562 saved44 paving cells and3 furnishings together. Shared3D rendering,
actual door crossing/walking, House Library save/export and reload were verified.
Reproducible source operations live in tools/hearth-yard.json; build_hearth_studio.mjs
accepts an explicit output directory so regenerating a portable template need not overwrite
old evidence. Actual browser export (stable IDs) and fresh rebuilt template (new IDs) remain
separate artifacts; the rebuilt template was not imported over the resident's house.
