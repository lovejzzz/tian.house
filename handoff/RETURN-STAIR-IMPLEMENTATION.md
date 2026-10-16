# Return staircase implementation

Status: runtime, scene editing, catalogue art and browser ascent/descent implemented; guards, upper-view readability and full architectural fidelity incomplete.

## Geometry contract

A return staircase connects adjacent integer floors using two half-rise flights.
`returnStairPath({x,y,z,axis,run,handedness})` describes ordered tread cells, a two-cell
half-height platform, bottom access and upper landing. Four directions and both handedness
values share one transform. The default run is three cells per flight, producing a 4×2
footprint; supported runs are 2–12. Heights are continuous fractions of one floor.
This is an architectural approximation, not a calibrated tread/riser specification.

`ReturnStairPath.transition` permits sequential cells and designated end ports only.
Adjacent parallel flights cannot be crossed sideways at unequal heights. World still
checks physical actor footprint, walls, obstacles and floor support; the path does not
create missing upper-floor support. `World.apparentZ` samples the continuous path height.
Tests traverse every cell both ways for all eight orientation/handedness combinations.
Existing source-derived straight stairs retain their previous semantics.

## Remaining integration gates

1. Scene compiler/model editing is implemented and tested: placement, selection, move,
   erase, undo and saved reconstruction. Stable asset catalogue entries/art remain pending.
2. Generate reusable stepped geometry, landing and guards with the recipe/atlas/semantic
   pipeline. Visible steps must agree with collision heights, not reuse stretched full-rise art.
3. Share placement/move/rotation/handedness controls between editor and public commands.
   Validate complete footprint, lower approach, upper landing and headroom before commit.
4. Cut the actual upper floor opening and keep ceiling fixtures outside the shaft.
5. Place Momento via public commands, walk up/down in the real browser, then verify
   undo, save/reload and export/import. Mark unknown upper rooms as inferred.

Momento candidate: x8005,y11404,z0,axis W,run2,handedness left. The shorter run leaves an internal approach cell at x8008,y11405 behind the existing
external door at x8009,y11405; its upper landing remains inside the building at
x8008,y11404. A run3 would put that landing outside the current footprint. Placed and traversed in milestone208. Actual
upper landing geometry and missing upper-story photos must not be presented as observed.

## Follow-up 210

Return stairs now have generated guards matching blocked path edges. Browser ascent and
descent also passed after replacing the provisional roof landing with an editable upper
shell through `room.addAbove`. See PROCESS.md and evidence/210-upper-shell. Upper-floor
architecture remains provisional and is explicitly annotated as inference.
