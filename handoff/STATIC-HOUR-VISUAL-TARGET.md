# Tian House — Static Hour visual target

Added 2026-10-14 at the user's request. Part of the active goal, not an optional polish
backlog. The four supplied screenshots are the primary reference for lighting, prop
detail and indoor atmosphere. Sims 4 remains the building-usability reference; the
volumetric architecture, photo workflow and full acceptance scope remain unchanged.

## Reference evidence

Exact local copies and SHA256 provenance are in [the manifest](references/static-hour/manifest.json).
The game name is supplied by the user. No release-status claim or inference about the
reference game's renderer, engine, lighting algorithm or asset construction is needed.
These screenshots are reference documents, not runtime textures or distributed game art.

| Reference | Visible qualities to learn from |
| --- | --- |
| [Archive, wide](references/static-hour/archive-wide.jpg) | Cool green room ambience, a bright desk work area, dark perimeter with readable silhouettes; shelf frames, drawer handles, paper stacks, boxes and equipment create several scales of detail. |
| [Break room](references/static-hour/break-room.jpg) | Warm wood/seating zone, cooler kitchen and machine accents; lamps, illuminated signs, chair legs, sink recesses, cups and table objects; generous circulation amidst occupied surfaces. |
| [Newsroom](references/static-hour/newsroom.jpg) | Warm local desk pools, red sign accent and cooler adjoining rooms; knobs, drawers, papers, cables and chair bases; uneven but functional desk arrangements. |
| [Archive, close](references/static-hour/archive-close.jpg) | Shelf-edge highlights and soft grounded shadows, varied box/book arrangements, a lit exit sign, wall trim and drawer detail; narrow but intentional routes through stored objects. |

## Required visual qualities

1. **Light has a visible reason.** Windows, lamps, screens and signs establish local
   brightness and color. Falloff, wall blocking and shadows agree with their location.
   Lit screens/signs illuminate nearby surfaces where appropriate; emissive color alone
   is not sufficient. Changing a light must change its contribution.
2. **Darkness preserves information.** Use restrained cool/warm zones, soft transitions,
   local highlights and subtle indirect fill. Furniture legs, door edges and usable paths
   remain distinguishable in shadow. Avoid uniform brightness, crushed blacks, excessive
   bloom and a global green/sepia filter standing in for lighting.
3. **Objects feel constructed.** Visible edges have believable thickness and appropriate
   bevels. Drawers, pulls, shelf uprights, chair frames, lamp stems, equipment controls,
   seams and recessed surfaces read at the intended viewing distance. Rotating the camera
   must retain volume. Small detail may use textures/normal maps if it does not fake the
   silhouette or interaction geometry.
4. **Materials differ.** Wood, painted metal, paper/cardboard, upholstery, glass and plastic
   have coherent scale, roughness, highlight response and restrained wear. A flat brown
   table with identical roughness everywhere is a prototype, not the quality target.
5. **Objects belong somewhere.** Contact shadows and supports anchor furniture and clutter.
   Papers, books, boxes, cups, cables and equipment form usable work/storage arrangements;
   vary their distribution deliberately. Do not sprinkle noise or duplicate identical
   stacks uniformly. Preserve chair pull-out space, doors and walking routes.
6. **Composition survives play.** Near-isometric views, sensible cutaways and room-by-room
   lighting support readable depth. Keep our house welcoming and site-appropriate; these
   office screenshots do not require every home to become dark, aged or office-themed.

## Implementation and acceptance

- Add visual checks to the existing complete room-plus-yard gate: a furnished work/living
  area with lamps, storage, tabletop objects, textiles, wall details and adjoining outdoor
  light. Reference motifs are adapted to the room's function, never forced into it.
- Build by families: structural silhouettes and mounts → material library → lights →
  clustered detail. Geometry, material, light/mount parameters and variation seeds live
  in reusable recipes and semantic records. All furnishings remain editable through the
  same workshop operations; move/rotate/reload must retain visual and physical consistency.
- Capture the actual browser at normal gameplay zoom and a closer inspection view, in
  daylight and at night, plus a lamp-off/on comparison. Record viewport, camera, quality
  settings and scene/version. Compare a coherent occupied room and its circulation,
  not only isolated swatches or one carefully framed prop.
- For each of the six criteria above, attach reference crop/view, our capture, concrete
  observed differences, pass/fail and next correction. Keep unresolved differences visible.
  Test counts and an automated similarity score cannot independently approve aesthetics.
- Walk and edit the furnished scene; check surfaces, occlusion, door paths, stairs and
  input responsiveness under the same lighting. Verify on the target MacBook/browser
  against the active goal's performance budgets. Optimize with shared geometry/materials,
  instancing, compressed delivery and suitable LOD without erasing close-range quality.
- Carry this rubric into development cases, frozen independent acceptance and the
  Hawke's Bay capstone. Full visual acceptance is required before final release.

## Current gap

Checkpoint324 has a neutral structural preview and one untextured parametric table
family. It does **not** meet this reference: motivated interior lighting, differentiated
materials, detailed prop families, purposeful dressing and whole-room atmospheric
comparisons are still pending. Adding this document does not change their completion status.


## User visual correction — 2026-10-14

Preserve PZ authored material detail while adding true volume. Generic smooth boxes and
procedural replacement textures do not satisfy the target. Follow
[SOURCE-MATERIAL-AND-GI.md](SOURCE-MATERIAL-AND-GI.md) for source color/painted-light separation,
whole-room comparisons and visibility-aware indirect-light experiments. Explore a custom
browser-appropriate GI pipeline; do not claim UE5/Lumen parity without evidence. This adds
visual requirements and does not reduce any existing scope or completion criteria.

## User refinement — restrained highlights and domestic materials

2026-10-14: Lamps should provide enough light without washed-out white clipping.
Preserve colour and surface detail on diffusers, pale walls, upholstery and bedding;
retain readable shadow paths. Treat “close to the eye” as a perceptual target, not a
claim that a fixed display reproduces human visual dynamic range. Compare daylight,
night and lamps off using fixed framing/exposure, avoiding exposure pumping and a
flat bright ambient wash. Screen output remains bounded by the user's display.

Replace overly white large furnishings with a coordinated everyday home palette:
warm taupe/oat upholstery, linen beige, muted sage and brown bedding, and wood casework.
Retain source texture detail, roughness and weave; colour changes alone do not complete
material fidelity. Keep modest whites for ceramics and small accents. Apply the palette
as one recipe batch, preserving stable IDs, placement, interaction and saved houses.
