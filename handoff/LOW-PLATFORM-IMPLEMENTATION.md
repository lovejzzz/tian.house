# Low platforms and street levels

Status: runtime foundation implemented239–247; reusable paving variants exposed locally248. Straight platform browser placement/walk-through verified249; chamfer/door and persistence acceptance pending; not deployed.

The Momento exterior reference shows a raised sidewalk, a continuous chamfered curb and a
lower road with drainage. Painting a curb texture on the flat floor does not reconstruct
this relationship. Implement a reusable low-platform facility rather than a case-specific
visual strip. Use source-art pixels until dimensions have independent measurement evidence.

Implemented: `TianGroundHeight` on supported floor sprites supplies 0–16 pixel low surfaces.
World apparent height, freestanding/table-mounted objects and floor overlays share the
height; integer storey remains unchanged. Wall/ceiling/window mounts keep their host plane.
Invalid heights and clipped-out actor surfaces do not lift actors. Existing assets omit the
property and therefore retain zero offset. Tests cover crossing, return, destroyed platform,
overlay/terrain planes and mount distinctions; 598 full game tests pass.

Required before exposing an asset or applying to Momento:

- Implemented241 for full cells: only exposed E/S height differences render; equal-height neighbors have no internal seams. Implemented243: clipped-cell side faces split at neighbor intersections and suppress internal triangulation seams.
- Implemented242: raised top surface and actor support subtract indoor polygon-room pieces on partial exterior cells. Nonrectangular side faces implemented243; mixed-height furniture support validation implemented244.
- Implemented244: compiled support checks reject mixed-height objects/vehicles and raised stair cells; floor painting preserves stair footprints with rollback. Implemented245: furniture/vehicle support and stair-footprint hover checks now agree with placement, including legacy multipart furniture. Implemented246: single-cell and area floor-support previews validate the final terrain against existing objects/vehicles, and batch painting avoids rejecting intermediate states. Implemented247: adjoining raised ground requires a door threshold with sufficient leaf clearance; threshold footprint heights and return-stair conflicts are checked. Public model edits and World movement verify sidewalk → threshold → interior while closed doors still block. Browser/rendered acceptance remains pending. Do not silently elevate an interior wall or door with the sidewalk.
- Implemented240: destroyed support is removed consistently from object/overlay rendering.
- Implemented240: parked vehicles, ground items, stocked displays and workshop previews share height. Ground items query their integer support level independently of their own vertical offset; real-browser platform verification still pending.
- Implemented248: two paving colors with heights 2/4/6/8/12/16 source pixels use ordinary catalogue floor placement and the same public commands. Height badges remain visible despite truncated labels. Browser placement/save/undo acceptance still pending.
- Generate reusable paving/curb/drainage assets through the canonical recipe pipeline.
- Place through the public workshop API; preserve source-photo uncertainty about dimensions.
- Actually walk across straight and chamfered borders, place furniture on the sidewalk,
  approach the doors, save/reload and inspect both workshop and gameplay rendering.

Do not label the current scene as having a raised sidewalk. No scene changes were made by
this foundation checkpoint, and no browser-rendered platform acceptance is claimed.
