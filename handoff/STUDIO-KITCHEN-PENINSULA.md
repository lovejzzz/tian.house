# Hearth Studio: integrated sink and breakfast peninsula

User direction (2026-10-15): kitchen breakfast bar and sink should be an integrated design typical of a compact studio. Research/design decision; not yet implemented or accepted.

Current builder places an independent breakfast-bar asset at offset (7,2), a separate wall-side kitchen sink at (9,2), and two differently oriented stools. The physical and visual connection is missing.

## Proposed arrangement

Use one connected L-shaped kitchen/peninsula composition. Put the sink near the attached end, with an uninterrupted dry preparation/eating surface extending toward the living space. Seat one or two people on the living-room side, away from the sink bowl/splash zone. Match worktop height, edge profile and material across the connection; preserve real sink cavity and working water interaction. Keep hob against the wall for extraction. Add dishwasher/bin/storage on the kitchen side, real knee space under the dining overhang, and a reachable stopcock/plumbing cabinet concept. These additions require functional implementation, not only painted cabinet doors.

Provisional authored targets, not measured existing-room dimensions or building-code assertions: worktop about 90 cm; seating overhang about 30 cm; each seat about 60 cm wide; working aisle about 100–110 cm, then explicitly test door/drawer and fridge swings plus stool pull-back. Final dimensions must be chosen from the current scene's usable space. Do not enlarge the studio merely to fit the furniture.

## Implementation/acceptance

Use reusable cabinet, sink-cutout and continuous-worktop assembly parameters, not a scene-only mesh that hides overlapping assets. Preserve IDs/save compatibility where possible and use public workshop operations. Verify uninterrupted countertop, water use, preparation space, seating contact/leg clearance, kitchen access and entry/bath routes in a real visitor walk. No saved-scene mutations were performed during research.

## References checked

- IKEA kitchen planning guide: connected U-shaped peninsula with outer overhang and stools: https://www.ikea.com/es/en/files/pdf/0a/61/0a610c65/ikea_kitchen_planning_guide_eng.pdf
- IKEA peninsula kitchen: preparation, storage and social uses within one kitchen composition (medium-size example, not evidence of studio prevalence): https://www.ikea.com/ca/en/rooms/kitchen/gallery/a-modern-kitchen-is-the-heart-of-a-stylish-and-functional-home-pub9cd0e5c0/
- Livingetc interviews: example peninsula integrates sink, dishwasher and bin, with breakfast seating on the other side; circulation and scale pitfalls: https://www.livingetc.com/advice/kitchen-peninsula-mistakes

The recommendation is a design inference from these examples and the current layout. No claim that all or most studios use this layout.

## Implementation trial 425 (not accepted)

Parameterized the breakfast worktop to 2.09 × 0.98 × 0.925 m with 0.30 m dining overhang and 0.60 m end cabinet clearance. This is a candidate connector, not an accepted kitchen layout. Public workshop preview of an atomic bar E→S rotation plus both stools on the south dining side was rejected: the eastern stool intersects the oven assembly. Offline diagnosis of the same public scene query confirmed stool bfa7739c-ffb5-405a-841d-c30ca4b868af against oven 31a3d170-8177-42cf-9beb-993fb70b7354. No commit was attempted; browser revision remains 582. Replan the whole kitchen including oven access before accepting the peninsula. Do not bypass collision validation or claim countertop contact alone proves a usable kitchen.

## Trial 426 — connected layout saved, ergonomics still pending

Replanned the whole kitchen: fridge S (7,0), cooker S (8,0), preparation cabinet S (9,0); sink N (9,2), breakfast peninsula S (7,2), stools N (7,3)/(8,3). North-facing sink is usable from the inner working aisle, rather than burying its cabinet front against the connector. Counter/sink bodies are now 0.78m wide with 0.11m offsets to respect centred 0.20m walls. Peninsula 2.11 × 0.80m, offset (0,0.09), top 0.925m. Geometry tests confirm matched top elevation and exact meeting X edge/Y extent. Small manufacturing chamfers remain, so this is joined modules, not a single seamless slab.

Public command studio-peninsula-426 committed revision 582→583, preserving 49 object identities and moving mounted objects/stock with hosts. Real visitor walked around the peninsula into the working aisle and drank from the sink; thirst 7.4→0.3, completion message confirmed. Reloaded the page and reopened workshop preview; layout persists. Portable builder and stocked-container coordinates updated, output in evidence/426.

Not accepted as final: whole-cell object moves leave stools too far from the eating edge; add per-instance fine placement through public editor and shared geometry/support/collision before claiming comfortable seating. Appliance/cabinet door sweeps are not animated or verified. No new three-day resident test, lighting acceptance or deployment.
