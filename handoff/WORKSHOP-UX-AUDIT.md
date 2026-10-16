# Workshop UX audit — 2026-10-12

Scope: the workshop and House Library. This is a successor usability revision,
not complete Project Zomboid fidelity acceptance or a new occupancy trial.

## Findings and implemented changes

| Finding | User cost | Change |
| --- | --- | --- |
| New empty lot was buried under level/view controls | New project could not be found | First card in House Library is New house |
| Starting blank erased the draft without archiving it | Accidental loss of a house | Archive before clearing; abort if storage fails; undo restores original geometry and name |
| House library appeared twice; import/export occupied the construction header | Mixed navigation and file operations | One Library entry; import/export inside Library |
| Every property and level control was always visible | Less canvas, long sidebar scrolling | Remove right sidebar; compact floor/view controls; contextual bottom options |
| Ten word-heavy tools and fifteen category text chips | Too much reading and weak hierarchy | Consistent original SVG icons, active state, instant hover/focus hints, accessible labels |
| Raw asset identifiers reached accessible names | Internal implementation leaked into use | Human object names and orientation only |
| Current category silently restricted search | Objects looked missing | Entering a query searches the whole library; clearing restores prior category |
| Large duplicate preview/name/category block in inspector | Repeated information | Compact selected object preview with rotate/favorite |
| Earlier house editions filled Library before new creation | Hard to find current work | New/latest collection first; saved houses separate; earlier editions collapsed |
| Rename appeared successful but did not reliably enter undo history | Name reverted on later undo | Input updates draft, blur commits one rename transaction |

At the default 1280px width, the canvas column grows from 824px to 1016px
(about 23% wider). All building tools remain available. Labels are retained where
meaning matters: House Library, New house, Walk through, house/object names,
style choice and errors. Icons do not replace accessible names or status feedback.

## Authentic verification

- Created an empty lot through Library; original Glasshouse appeared in Saved houses.
- Dragged a room, placed a door and glazing, exercised undo/redo and set an entry point.
- Saved a house copy, loaded it and entered the game; walked from 8002,11405 to 8002,11407.
- Exported Courtyard Study through product controls; inspected exported JSON to verify its actual name.
- Reproduced the rename failure before repair, then verified rename undo/redo and saved-copy title.
- Searched for linen table lamp from Essentials; result found through automatic whole-library search.
- Rotated/favorited a picture window; selected card and contextual toolbar updated.
- Used floor arrows and opened view settings; toggled cutaway/grid and dismissed with Escape.
- Checked default 1280px, 960×640 and 700×720 layouts, including Library at 700px.
  No document horizontal overflow at measured narrow widths. Restored browser viewport afterward.
- 277 automated tests pass, including archive-before-new and storage-failure preservation.

Private evidence: `pz-browser-research/runs/workshop-ux-001` contains before/after
screenshots, exported plan, walkthrough evidence, test results and deployment record.

## Remaining usability work

This is an agent-performed task audit, not a study with independent participants.
Touchscreen interaction and screen-reader speech were not physically tested.
Wall-object placement still uses the tile ground anchor: clicking a rendered wall
face can place glass inside a room rather than onto that wall. The temporary
Courtyard Study is a workflow fixture, not an architecturally reviewed template;
wall-face picking and attachment snapping remain a concrete next improvement.
