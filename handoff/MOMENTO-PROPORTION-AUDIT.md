# Momento proportion audit — checkpoint 274

Status: **not passed**. Current technical route/edit/save gates do not establish
photographic fidelity. Baseline editor468, scene in evidence/272-route-recovery.

Source: published architect plan already imported as `momento-architect-plan`.
Measurements are approximate image-axis samples, not a metric survey. The drawing
is rotated 180 degrees relative to the scene. No dimensions inferred from the
printed A3 1:50 label. Sample coordinates and calculation: evidence/274-proportion-audit/ratios.json.

| Relationship | Plan ratio | Current scene | Finding |
|---|---:|---:|---|
| Building width/depth | 1.084 | 1.125 | Approx. +3.7%; modest shell aspect difference |
| Corner cut / width | .186 | .333 | Approx. +79%; cut too large |
| Corner cut / depth | .187 | .375 | Approx. +100%; cut too large |
| Bar-side width / total | .387 | .444 | Approx. +15%; divider too far toward exhibition |
| Rear service depth / total | .451 | .375 | Approx. −17%; service region too shallow |

These hand-sampled values have about ±5px endpoint uncertainty and wall-thickness
ambiguity. They identify correction direction; they are not sub-pixel ground truth.

## Coordinated correction batch

1. Retain named checkpoint272 and all observations. Trial two-cell corner rather
   than three: predicted cut ratios .222/.250, still approximate but substantially
   closer than .333/.375. Record the remaining grid error explicitly.
2. Update ground and upper outlines and flat roof together through public commands.
   Rehost the corner sign and pipes with stable IDs where possible; inspect extra
   straight wall extensions, finish continuity and paving boundary. Do not silently
   discard reference links or supplies.
3. Compare front partition length and service region before choosing additional
   grid edits. Moving a divider requires its cabinet/shelf support, pedestrian
   clearance and counter relationship to stay coherent. Fractional dimensions
   may require general editor capability rather than a scene-specific bypass.
4. Recheck preserved doorway positions, four saved views, doors and stair route
   after structural edits. Earlier route evidence cannot validate a changed layout.

Exterior source comparison confirms three narrow dark windows, four white stools,
exposed stone around the blue corner panel, red pipework and separate steel stair
entry. Current generic white stools and weathering are stylized approximations.
Interior counter silhouette, brick/terrazzo grain and fixture dimensions still
need independent fidelity assessment; object presence alone does not pass.

## Public trial result

The two-cell ground outline preview was rejected at editor468: “Move wall
fixtures before cutting their supporting wall”. No mutation committed. This is
correct protection, but the ordinary wall-drawing tool only supports orthogonal
paths, so a replacement diagonal support cannot be staged independently.
Next implementation decision: provide an explicit, validated attachment-remapping
contract for outline edits, shared with the UI, or perform a reversible sequence
through available supports. Never bypass protection by rewriting scene JSON.

Checkpoint275 supplies independent45-degree paths through the shared walls.draw
operation and draw-walls UI. Both directions committed and undone in the real
browser; original scene restored exactly, editor472. This removes the missing
replacement-support capability; the actual coordinated outline correction remains
next. No reduction of attachment protection or scene-file rewrite.

Checkpoint276 applied the coordinated outline correction to both rooms/roof.
All old object IDs retained; openings, stair links and inventory exactly unchanged.
New cut ratios .222/.250; remaining relative differences approximately19.5%/33.4%.
Final scene evidence276/scene-final.json, editor474. Corner symbol centering remains
visually incomplete. Divider/service-region proportions not changed in this batch.

Checkpoint279 moves rear/service partition forward one cell with attachments
and WC side extensions. Depth ratio .500 vs plan .451: relative difference~11%,
previously~17%. Public revision480 retains all object IDs, inventory and stairs;
actual service-door enter/return and side exit passed. Divider remains .444 vs
.387; moving it to .333 is not a satisfactory substitute for finer placement
and would compress furniture clearance. Overall fidelity status remains open.
