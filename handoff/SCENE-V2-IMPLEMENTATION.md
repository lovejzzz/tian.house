# Scene v2 implementation ledger

Status: initial migration and grid topology modules; not enabled in the workshop UI.

## Current contract

`scene-document.js` preserves v1 plans in a v2 envelope. A scene has a stable ID, nonnegative revision, explicit bounds, source-grid units and level IDs. Real-world scale is unknown by default; an assigned metres-per-cell scale requires evidence. Source floor heights are not invented.

Each legacy square, inventory item and vehicle has an ID that survives export/import. Original metadata, tile order, duplicate layers, container references and optional fields are retained. The original v1 plan is an independent migration backup. Migration reports explicitly say `semanticConversion: false`; preserved tiles are not counted as recognized walls or furniture.

`scene-structure.js` introduces cell-length wall edges with `id`, `levelId`, `axis`, `x`, `y`, `tile`. A rectangular room has `id`, `name`, `levelId`, half-open `rect`, `floorTile`, `wallIds`. Adjacent rooms reference one common edge per shared boundary cell. An opening has `id`, `hostWallId`, `kind` and `tile`. This first slice supports one source-width opening per edge. It does not imply variable-width or arbitrary-height openings are implemented.

Compilation emits the existing gameplay plan: room floors, wall edges, and source-validated door/window surrounds with their panes or doors. It rejects overlapping legacy structures, missing frames, mismatched directions, duplicate edges and incomplete room boundaries. Structural source data remains intact when an opening is added. Compiling unsupported semantic objects/vertical links fails explicitly; they are not silently omitted.

The migration and structure functions return isolated documents. No existing browser save is automatically rewritten. `WorkshopCommands` still targets the v1 model; connecting scene transactions and UI is next, not already done.

## Evidence

- Three existing home templates round-trip exactly through migration and JSON export/import.
- Unknown tiles, repeated layers, custom metadata and stocked-container references survive.
- Shared-wall compilation produces one edge and a usable door opening.
- Automated World collision checks reject closed-door crossing, allow open-door crossing in both directions and retain the adjacent solid wall.
- Full suite: 312 passing tests. See `evidence/127-scene-foundation/tests.log`.
- No real browser walkthrough or rendered v2 scene acceptance yet. Collision tests are not a substitute.

## Next dependency chain

1. Scene transaction store with revision-safe undo/redo and durable identity.
2. Route new-room UI through semantic commands; display a compiled preview through the existing renderer.
3. Move/resize shared boundaries without losing hosted openings; room selection and visual handles.
4. Object identity, grouping/dependencies, stairs and floors; complete the two-room editable/walkable acceptance case.
5. IndexedDB checkpoints, import/export and recovery before enabling migration for user drafts.

The legacy layer remains necessary until recognition can prove each conversion preserves appearance and gameplay. Converting a template wholesale by guessing sprite semantics is not a valid migration.

## Update 128: transactions and shared-boundary edits

`moveRoomBoundary` adjusts adjacent rectangular rooms and preserves hosted opening IDs. Moves that would delete an opening or require a non-rectangular boundary are rejected explicitly. New wall edges never reuse an ID held by a moved edge.

`SceneSession` provides preview/execute for structural commands and undo/redo. Its IndexedDB repository performs atomic compare-and-write on scene revision, persisting history and request receipts together. Saving must finish before live session state advances. Current history uses full snapshots (60 undo steps); large-scene performance remains unmeasured.

319 tests pass. The isolated `research/scene-storage-check.html` has been exercised through browser buttons, including full page reload, undo/redo and conflicting session writes using actual IndexedDB. Evidence: `evidence/128-structural-transactions/`. This validates storage plumbing, not workshop UX or character walkthrough. Production UI integration remains next.

## Update 129: workshop canvas integration

The actual Room tool now builds semantic rooms. Edit rooms drags a boundary, preserving shared edges and their hosted openings. `StructuredWorkshopModel` bridges existing furnishing edits into the legacy layer and persists `sceneDocument` inside the export without discarding structure IDs. It shares `applySceneOperation` with SceneSession, but the UI does not yet use SceneSession's persistence/history envelope.

Actual browser evidence: draw adjacent rooms, insert shared door, move boundary, undo/redo, export, page reload, normal-game walk through door both ways and closed-door blocking. 324 tests pass. See `evidence/129-workshop-integration/`.

Next priority: replace UI localStorage/synchronous history with persistent transactions, safely handle structural deletion/reflooring and selections, then complete multi-object dependencies and stairs. UI undo does not survive a reload yet; this was observed and must not be confused with the isolated IndexedDB session test from update128.

## Update 130: durable actual editor history

The production workshop code path now loads/saves its active draft and undo/redo history through IndexedDB. Writes are queued and version-checked atomically. LocalStorage is retained as a migration source, not the new authoritative draft store. Failed loads block overwrite; failed saves retain the live draft for export and prevent closing/applying it as if saved.

Verified in the actual editor: rename, reload, undo, reload, redo; shared-wall resize, reload, undo; two real browser tabs with stale-save rejection and newer-name preservation. 329 tests pass. Named House Library snapshots still use the older storage; unified UI/AI transaction envelopes, branch UI, large-scene history cost and the full import loop remain pending. Evidence: `evidence/130-durable-workshop/`.

## Update 131: semantic furniture and dependencies

Furniture now has stable instance/catalog IDs; tabletop decorations reference their supporting object. UI multi-selection/grouping and shared objects.move preserve child placement and stocked-container item identity. objects.remove and the Erase tool remove dependencies safely, turn removed-container stock into loose items and support undo. Invalid group moves fail atomically. Stale UI selections are filtered before movement.

335 tests pass. Actual editor evidence covers stocking a shelf, moving a restored furniture group, inspecting inventory at its new location, erasing/exporting/undoing a shelf and reloading a group. See evidence/131-semantic-objects. Group copy/rotation, structural editing completeness, full transaction unification, stairs and photo reconstruction remain pending. No deployment or full-goal completion claim.

## Update 132: independent group copies

objects.copy preserves source objects and creates independent IDs for copied instances, groups, host references and stocked inventory. Copy selected objects and Alt-pick use the same reducer and compiler as other semantic edits. Full-group collision failures roll back. Actual browser copy/undo/redo/reload/export validated two independent furnished groups; inventory inspector now refreshes after undo/redo. 337 tests pass, evidence/132-group-copy. Group rotation and placement preview remain unfinished; no deployment.

## Update 133: group placement preview

StructuredWorkshopModel.previewStructure shares the exact reducer/compiler with commit and leaves document/history untouched. Group move/copy previews render mounted children, cache per scene/selection/cell/mode, report invalid placements and block cross-level moves. Multi-cell furniture now rejects spanning structural or legacy wall edges. Actual browser evidence covers valid ghosts, partial furniture overlap rejection, wall-span rejection, successful move and undo. 339 tests pass; evidence/133-group-preview. Large-scene performance, rotation, legacy furniture conversion and remaining design phases are still open. No deployment.

## Update 134: catalog-resolved group rotation

objects.rotate resolves verified orientation families from the trusted catalog in both the adapter and SceneSession. It rotates footprint cells, host-linked tabletop items and stocked inventory, preserving IDs and fixing the selection bounding origin to prevent drift. UI supports a rotate button and R. Only common available orientations are supported; missing source directions are not invented. Actual UI/export evidence verifies S-to-E tables/shelves and retained stock. 342 tests pass; evidence/134-group-rotation. Final pointer-leave ghost cleanup has syntax validation only pending next browser reload. No deployment; full design remains incomplete.

## Update 135: vertical stair entities

Scene compilation now supports adjacent-floor staircase links, generated landings and reversible upper-floor openings. Shared stairs.add/remove/move operations preserve identity; semantic workshop placement and erase are integrated. Actual UI placement plus normal keyboard traversal reached Floor 1 and returned to Floor 0, with exported link evidence. 347 tests pass; evidence/135-semantic-stairs. Existing-stair Select/Move and full validation previews still need UI integration; legacy stairs, complete multilevel editing and later design phases remain open. No deployment.

## Update 136: stair editing UI and previews

Select/Move picks an entire semantic staircase without deleting it first; valid placement moves its stable link, R retains identity while changing direction, Alt-pick copies independently and Escape cancels safely. Placement preview and commit share structural validation, cached per scene and target. Actual browser move/rejection/undo/copy plus exported IDs verified. 349 tests pass; evidence/136-stair-editing. Legacy stairs and remaining architectural/photo phases still incomplete. No deployment.

## Update 137: rectangular split/merge

Shared room.split/room.merge preserve exterior wall/opening IDs and other objects while adding/removing interior partitions. UI Edit rooms now selects without accidentally resizing on a click, exposes split/merge controls and shows a split line. Actual UI exports verify 2→3→2 rooms with original openings, furniture and stairs unchanged; undo restores the partition. 352 tests pass; evidence/137-room-layout. Nonrectangular rooms, merge material UX and fully validated partition previews remain unfinished, along with later phases. No deployment.

## Update 138: whole-room flooring

Shared room.floor operation changes the selected semantic room's material. Edit rooms → Change room flooring routes a catalog selection through the same structural compiler, preserving furniture, stock, openings and stair shafts. Canvas edits are suppressed while choosing the material. Undo/redo refresh the displayed room material; this fixed a stale inspector label found in actual browser verification.

354 tests pass, including unsupported material rejection and upper-floor stair-opening preservation. Actual UI evidence verifies one room refloored, undo to hardwood, reload with persisted redo, and redo/export. Comparison with the prior split-room export proves walls, openings, objects, stairs and inventory unchanged, with exactly one room material changed. Evidence: evidence/138-room-flooring. Browser stair-shaft refloor verification is not claimed; that invariant currently has test coverage. No deployment; general architecture/photo reconstruction and independent acceptance remain incomplete.

## Update 139: copy architectural layout between levels

level.copyLayout copies editable rooms, shared walls and hosted openings to another level with new IDs and remapped references. The UI copies the floor below into the current floor. Existing overlapping rooms are rejected atomically; furnishings and vertical links are not implicitly duplicated. Actual browser copying produced six rooms across two floors, preserved furniture/inventory/stair identity, and passed undo → reload → redo. Export comparison verifies doubled walls/openings and unchanged objects/links/items.

Testing exposed an overly broad landing check: a far/side boundary wall on the upper landing was treated as an obstacle. Entering-edge clearance is already checked on the top stair cell; landing validation now permits its far/side boundary while rejecting solid objects. Normal keyboard traversal reached Floor 1 and returned to Floor 0 after copying. 357 full tests pass; 11 focused tests pass after the friendly conflict-message update. Evidence: evidence/139-floor-layout. Full floor management, roofs, reference workspace and independent photo acceptance remain open. No deployment.

## Update 140: editable floor openings

Rooms can own identified rectangular floorOpenings. Shared add/remove operations, structural compilation and document identity validation preserve voids through reflooring, save/reload and floor copying (new IDs). Split redistributes contained openings and rejects bisecting one; merge retains both sets. Occupied cells, stairs/landing conflicts, overlapping/out-of-room openings and furniture suspended over openings are rejected. World movement tests verify unsupported cells remain impassable.

UI Edit rooms exposes Draw floor opening and Fill floor opening. Actual browser drag created a 2×2 upper-floor opening; fill, undo, export, reload and fill/undo succeeded. Evidence: evidence/140-floor-openings. 361 tests pass. Final action-mode routing for switching from opening tools back to split/refloor is syntax/test checked but has not yet been browser exercised. Current openings are rectangular and above ground only; basement voids, railings, rich cross-floor rendering and the broader photo/roof phases remain unfinished. No deployment.

## Update 141: room-owned flat roofs

roof.set/remove use stable nested entity IDs and compile a material-covered roof on the next level, following its room rectangle when resized. Upper-room/structure overlap and removal beneath rooftop furniture are rejected. Room layout copying excludes roofs explicitly; split/merge of roofed rooms currently require removal first. UI provides add, remove and catalog-driven material changes. Inspector distinguishes floor and roof materials.

Actual browser evidence covers adding above an upper room, changing concrete to wood, removing, undoing, export, reload and redo/undo. Tests cover rain-blocking tiles, persistence/ID, resize, overlap, material validation and supported furniture. 364 tests pass; final inspector label changes were syntax checked and browser exercised. Evidence: evidence/141-flat-roofs. Pitched roofs, eaves, parapets, grouped footprints and richer whole-building editor rendering remain incomplete, as do the photo workflow/independent acceptance. No deployment.

## Update 142: whole-building review view

View options → Whole building renders successive physical levels rather than flattening the lower floor into the editing plane. Camera fits the building and supports panning/zooming; cutaway walls expose floor voids, circulation and furnishings. Selecting a tool/floor restores the original editor camera. Preview canvas input pans without altering the plan; inspector and pending material/layout modes are cleared.

Actual browser reviewed two floors, a void and roof, toggled cutaway, panned, returned to Edit rooms and reloaded. Export after all view interactions is exactly identical to 141 export; console errors empty. Syntax checked; no broad test rerun for this rendering-only change. Evidence: evidence/142-building-view. Tall foreground objects/cross-level interleaving and large-scene performance need further validation; no claim of universal depth-order correctness. Roof variants and photo workflow remain incomplete. No deployment.

## Update 143: source-driven gable slopes and stale draft compilation

roofCells generates 30-degree source slope pieces with X/Y ridges, odd-span ridge tiles and six-step height bands; height limits and unavailable assets reject. UI can add gables and rotate ridges, retaining roof identity when replacing a flat roof. Actual source atlas inspection and Rosewood placement established the recipe. Browser testing caught reversed height ordering in the Y ridge family; corrected to 109−step and added an atlas offset check. Both orientations now visually join.

Reload then exposed a second issue: restoreEditorSnapshot overwrote freshly compiled semantic tiles with stale cached arrays. It now recompiles current and historical semantic plans atomically before adoption. A regression verifies both initial restore and redo discard stale materialized tiles. Actual reload and undo/redo validate the corrected ridge. Export preserves original roof ID and furniture. 367 tests pass. Evidence: evidence/143-gable-roofs.

This is slope generation, not finished roof parity: gable-end infill, eaves, joins, UI material selection and broad multi-band visual acceptance remain open. The UI currently reports gable material selection unavailable rather than converting it to flat. No deployment; full objective remains active.

## Update 144: gable end infill and roof materials

Gables generate source-matched end caps with supporting wall bands. The catalog replaces the complete slope material while retaining roof identity and end geometry. Browser verification covered X/Y orientation and dark shingle selection; same-cell draw order was corrected to end-first/slope-last after visible cap overlap. Seven focused roof tests pass after that correction; prior full suite passed 369 tests. Evidence: evidence/144-gable-ends includes screenshots, UI export and source sheet. Eaves, joins, end finish selection and multi-band visual verification remain unfinished. No deployment.

## Update 145: roof height bands follow room resizing

Shared room.resize now ensures roof levels after boundary changes, reusing roof.set derivation and covering neighboring roof rooms. Atomic validation rejects height overflow and occupied upper volume. 371 tests pass including widening/shrinking, identity, persisted history and rejection rollback.

Actual UI widened the upper room from 5 to 13 cells; export confirms level 3 creation and unchanged roof identity. Undo → reload → redo produces identical complete exported JSON. Evidence: evidence/145-roof-resize. Multi-band visualization exposes mismatched full-height end-wall finish versus sloped siding, which remains a real visual defect. Resize edge affordance and floating inspector occlusion also need work. Not deployed; broader goal remains active.

## Update 146: projected room edge picking and docked tools

Room resize uses a zoom-independent 10px projected-edge hit region, supports both sides and prefers the selected room on a shared edge. Interior clicks select only. Selected boundaries show midpoint handles. Room controls dock in the library, clearing the lower canvas.

Actual UI dragged from outside the south edge and exported exactly one expected room rectangle change; test edit undone. 373 tests pass, including zoom, exterior hit, interior rejection and shared-edge selection. Evidence: evidence/146-room-editing. Narrow-screen, material-picker switching and touch validation remain open, as does the gable finish defect. No deployment.

## Update 147: compatible room finish picker

Room material picking stays docked, hides unrelated actions, exposes cancellation and restores the ordinary catalog on exit. Catalog and commit share usableRoomMaterial validation. Mixed tilesandwood atlas identifiers no longer imply Wood; descriptive names take precedence.

UI exercised applying tile flooring, returning to room tools and canceling selection. Browser confirms corrected facet counts. 376 tests pass. Evidence: evidence/147-material-picker. Immediate reload after undo still showed the applied finish; pending-draft navigation timing needs investigation, so persistent rollback is not claimed for this run. Gable filter UI, narrow screens and end-finish mismatch remain open. Not deployed.

## Update 148: draft navigation protection

DraftPersistence tracks queued/in-flight writes. The editor guards beforeunload while writes remain, storage failed, or an edit is pending; a clean saved draft does not block navigation. Listener removed on close. 378 tests pass, including queued write lifetime and failed-write protection.

Actual UI undo → observed Saved → reload → export restores the original floor material. Evidence: evidence/148-draft-navigation. This confirms durable completed writes; the earlier immediate-reload symptom is consistent with an interrupted async write, not a directly captured IndexedDB abort. Native dialog behavior under slow storage and crash recovery remain unverified. Not deployed; full goal remains active.

## Update 149: reversible room removal

Shared room.remove prunes only unreferenced room walls/openings and removes owned floor/roof geometry. Furnishings, spawn, supplies/vehicles and connecting stair dependencies reject first; compiler validates the resulting scene. UI adds Remove selected room.

380 tests pass. Browser removed an empty upper room, exported, undid, then rejected removing the stair room. Export checks prove one room removed with objects/links/openings unchanged, and complete pre-edit JSON restored after undo/rejection. Evidence: evidence/149-remove-room. Whole-floor deletion and remaining architecture/photo work stay open. Not deployed.

## Update 150: coherent gable finish families

Source inspection identified the correct white house siding caps (30_03 rather than 30_15). Added 20 source-wall/gable finish mappings, resolving each boundary independently and using matching full-height bands. Automatic unsupported finishes fall back to one coherent white set; explicit old endSource values remain supported and may still need finish pairing.

381 tests pass; seven-cell geometry remains unchanged with the new material-half indices. Actual 13-cell gable rendering now has continuous siding without the central mismatched band. Evidence: evidence/150-gable-finishes includes source comparison sheets and browser screenshot. Not all mapped finishes have individual visual acceptance. Eaves, joins, manual finish UX and photo stages remain incomplete; no deployment.

## Update 151: structural versioned command batches

WorkshopCommands now previews through StructuredWorkshopModel instead of the legacy-only WorkshopModel. Dotted scene operations share the editor reducer, catalog placements share its support rules, and semantic rename updates scene metadata. Draft reconciliation runs before live adoption.

384 tests pass, including mixed room/furniture/name batches, late collision atomicity, manual-edit invalidation, dependency rejection and undo/redo. Evidence: evidence/151-structural-commands. This is module verification, not authentic browser AI acceptance. Public browser integration, durable receipts and unified persistence remain incomplete. No deployment.

## Update 152: command receipts in editor snapshots

Idempotency receipts now belong to the model and travel with draft/history snapshots. Restoring an older snapshot defaults to empty receipts. Receipt validation checks unique request IDs, parsed request fingerprints, and revision/change consistency; adapters on one model share receipts.

386 tests pass, covering undo→serialize/restore→retry without reconstructing the undone room, changed-body rejection, cross-adapter retries and corrupt snapshot rejection. Evidence: evidence/152-command-receipts. Actual browser command integration and persist-before-success semantics remain open; serialized model tests are not crash-recovery acceptance. Not deployed.

## Update 153: persist-before-adoption command boundary

commitAndSave stages complete editor snapshots, runs shared command validation, and persists plan/history/receipts together before adopting live state. Model mutation entry points reject concurrent writes while persistence is pending. Failure leaves the live snapshot unchanged and releases the lock.

388 tests pass, including delayed persistence visibility, concurrent mutation rejection, failure atomicity and retry. Evidence: evidence/153-persisted-commands. Browser integration must disable editing controls while awaiting this boundary and remains unimplemented; no browser acceptance claimed. Full query/capture/reference workflows remain open. No deployment.

## Update 154: public browser command panel

Workshop controls → Build commands exposes scene structure reads, bounded asset search, JSON batch validation and persist-before-adoption commit. Native modal isolation and disabled controls protect in-flight writes. Current preview is a validation/count summary, not a visual ghost preview.

Authentic UI used public scene data to submit room.add + roof.set, revision 70→71. Reload/retry kept revision 71 and one new room. Undo→retry kept revision 72 and the original six rooms. No hidden state/file edits were used. Receipt-aware preview now identifies already-applied requests. 388 tests pass; evidence: evidence/154-command-panel (request, observations, screenshots).

Formal tool transport, scoped queries, full asset pagination, visual previews/captures, walkthrough and reference workflow remain unfinished. Not photo reconstruction acceptance and not deployed.

## Update 155: complete asset query traversal and descriptions

WorkshopAssetQueries adds bounded stable pagination and ID descriptions with source-grid footprint, orientation family, condition and relevant raw support/mount properties. Detached output prevents catalog mutation. Command panel exposes page navigation and asset details.

390 tests pass. Authentic UI traversed all 227 chair results over eight pages with 227 unique IDs and disabled Next at the end; a piano search reset to offset zero. Described chair orientations and grand-piano footprint. Evidence: evidence/155-asset-queries. Raw properties are not complete interaction/stand-position semantics. Formal tools, reference workflow and full acceptance remain incomplete; no deployment.

## Update 156: scoped structural scene reads

Read scene now accepts optional integer level and spatial bounds. Projection retains complete boundaries/openings of intersecting rooms, object host families and both staircase endpoint levels. It labels partial results and dependency IDs and includes spatially filtered legacy records instead of silently hiding them. Results are detached, read-only projections, not importable scene documents.

392 tests pass. Actual public browser UI queried a ground-floor region (one room, 16 boundary segments, one stair, levels 0 and 1) and the upper middle room (gable roof and floor opening preserved). No missing room wall references; revision stayed 72. Invalid level rejected with visible feedback. Evidence: evidence/156-scene-queries. Visual inspection exposed a narrow input, corrected to full width with a visible label. This is structural query support, not a full reference/interaction tool interface; no deployment.

## Update 157: persisted raster reference import and evidence notes

Reference photos now imports local PNG/JPEG/WebP through the public file chooser, displays the original raster, and saves name, group, credit, evidence type, notes and optional known-length evidence through reference.add/update/remove on the shared command boundary. Scene validation covers the records; image data travels with house exports and undo snapshots. Known lengths do not implicitly set metresPerCell.

395 tests pass. Actual UI imported a local game screenshot, edited source/group/Approximate notes, refreshed, exported and reimported the house. Exported raster bytes equal the input exactly (hash in evidence/157-reference-import/export-check.json). Browser testing discovered JPEG bytes inside a .png-named screenshot; import now detects content format instead of trusting the filename MIME. Added this lesson to the SRE domain-validation guidance.

This is an initial modal reference manager, not the final side-by-side photo workspace. Limits: eight images, 1 MiB each, 4 MiB total. Embedded images duplicate storage across history/receipts; larger-photo blob storage and House Library quota behavior need further work. No annotations, entity bindings, scale calibration, From photos entry or automatic reconstruction yet. The fixture is not a real reference-photo acceptance case. Foundational architecture gaps remain; not deployed.

## Update 158: live reference dock beside building tools

Pin beside scene closes the manager and opens a nonmodal reference dock with photo selector, evidence classification, credit, notes and known-length evidence. At wide widths the dock occupies a third grid column; at 1100 px or narrower it replaces the catalog, preserving canvas space. Closing restores the catalog; the top reference button reopens the last pin without a modal. Details remain editable through the manager.

Actual browser verification: pinned reference remained visible while selecting a room, changing Hardwood to Oakwood and undoing back to Hardwood. Removing the photo cleared the dock; undo restored it. New house cleared the previous house's photo; undo restored the matching reference. At 900 px the dock was visible, catalog hidden; closing restored catalog visibility. Default viewport restored after testing. Evidence: evidence/158-reference-dock (screenshots, public DOM after floor edit). Syntax and diff checks passed; this UI-only change did not add structural model tests.

Pinned selection is session UI state, not a saved camera/reference view. No region annotations, object bindings, calibration or automatic reconstruction yet. Thumbnail grouping and large-photo storage remain pending. No deployment or final photo acceptance claimed.

## Update 159: photo region annotations and room/object bindings

Reference manager supports drag-box regions in normalized original-image coordinates, per-region labels/notes/evidence classification and optional stable room/object IDs. Shared reference.annotate/unannotate operations provide create/update/delete with validation and atomic history. Removed scene targets leave unresolved evidence rather than silently discarding the annotation. IDs participate in scene-wide identity validation.

Pinned photos show clickable region overlays plus keyboard-accessible annotation buttons. A bound room/object selects the corresponding editor tool and level and centers the canvas. Room/object selection updates the matching pinned region state. Browser testing exposed room outlines disappearing without canvas hover; selected outlines now remain visible and are restricted to their owning level.

396 tests pass. Actual UI dragged a region, bound a ground-floor room, saved, refreshed and exported it; clicking the region selected the room, selecting another room cleared its active state, selecting the bound room restored it. Removing annotation then Undo restored the binding. Evidence: evidence/159-reference-annotations includes export metadata and screenshot. Actual UI verified room bindings; object focus uses existing group selection but does not yet have separate browser acceptance. This test uses a game screenshot fixture, not photo fidelity acceptance. Line annotations, calibration, cross-photo matching and AI reconstruction remain incomplete. No deployment.

## Update 160: compact draft/history storage with lossless recovery

IndexedDraftRepository now encodes large snapshots by interning repeated long strings before gzip, retaining old plain-record reads and raw fallback where compression is unavailable or not beneficial. Explicit tagged nodes prevent collisions with document properties and preserve optional undefined values. Compression completes before the compare-and-swap transaction; its failure cannot advance the stored revision. Saved status exposes persisted and pre-compression byte counts. Public house exports remain ordinary JSON.

400 tests pass, covering image-bearing history, exact request fingerprint recovery, legacy reads, codec collisions and corrupt/unsupported data rejection. Actual browser loaded its old draft, renamed the test house and wrote 1,356 KiB instead of 18,716 KiB; reloaded the compressed draft, undid the rename, then exported. The full parsed export equals pre-test export (24), including image bytes and annotations. Evidence: evidence/160-compressed-drafts.

This reduces IndexedDB payloads, not in-memory snapshot duplication or House Library localStorage quotas. Large-photo blob storage, worker scheduling and performance at target scene sizes remain open. No deployment and no full photo reconstruction acceptance.

## Update 161: IndexedDB house library with retained legacy backup

House Library now stores immutable compressed records in IndexedDB, keyed by a SHA-256 digest of the complete saved plan. Existing localStorage rows migrate on initialization without modifying/removing the legacy backup. Duplicate saves use serialized read/write transactions. Invalid legacy content is surfaced, not silently replaced. Saving, creating, importing and loading houses await preservation; editing and modal cancellation are blocked while preservation is in flight, with navigation guarded.

404 tests pass. fake-indexeddb is a development-only dependency for migration, concurrent deduplication, large compressed records and failed-legacy tests. Actual browser migrated existing saved houses, saved Reference Library Test with image and annotation, created an empty house, refreshed and reloaded the saved house. One identical saved copy was present. Export comparison found only intentional name and scene edit-revision changes (38→40); geometry, objects, images, annotations and other content matched. Evidence: evidence/161-indexed-library. Original working name restored afterward.

LocalStorage is retained only as migration backup for the library; other game persistence is unchanged. This does not make browser storage unlimited, nor solve large catalog rendering or in-memory history costs. Explicit version branching, large-photo import and complete photo workflow remain unfinished. No deployment.

## Update 162: evidence-backed room-span scale calibration

Scene scale can now explicitly map a saved known length to the full X or Y span of an annotated, bound room. scene.calibrate/clearCalibration share the command transaction and retain source reference, annotation, room, axis, cell span and measurement description. Geometry and sprite sizes are unchanged. Room inspectors display cells before calibration and approximate metre dimensions afterward. Changed/deleted source evidence or changed room span flags the recorded scale for review rather than silently recalculating it.

407 tests pass. Actual UI used an explicitly synthetic 3.6 m / 3-cell anchor, showed approximately 3.60 × 6.00 m for the 3 × 5 room, and restored the scale after reload. Changing known length to 3.9 m kept 1.200 m/cell while showing an evidence-changed warning. Three undos restored the original uncalibrated state and removed test measurement data. Evidence: evidence/162-reference-calibration. This is an explicit source-grid unit conversion, not perspective photogrammetry, pixel-to-metre inference or physically validated furniture sizes. Independent measurements and final real-photo acceptance remain open. No deployment.

## Update 163: photo-first House Library entry and large reference imports

New house now reveals Blank plot / From photos. Both preserve the current house before creating a blank draft; From photos awaits draft saving before opening the reference manager. Saving locks the editor/library and protects navigation. Preservation failure keeps the current house; a new-draft save failure is reported distinctly from preservation failure.

A real development photo (Momento exterior) exposed the previous 1 MiB upload barrier: the original is 3,362,584 bytes. The importer now accepts PNG/JPEG/WebP sources up to 20 MiB, prepares local working copies for oversized sources (up to 2048 pixels, bounded encoding/downsampling), and keeps the existing 1 MiB per-image/4 MiB total stored budget. Small accepted originals keep their bytes. Provenance records original dimensions, byte count and SHA-256; working copies are labelled. Originals are never overwritten or uploaded. Browser decoding remains on the main thread; HEIC, worker processing and target-scale performance remain open.

408 tests pass. Actual browser opened New house → From photos, preserved the previous four-level fixture, exposed the large original rejection, then imported the same real image after the fix. The working copy is 964,903 bytes at 2000 × 1333. Saved source/evidence notes, pinned image, named and saved Momento Brewers · Photo study; old houses remained listed. Reloaded, reopened the photo and exported again: complete parsed exports match exactly, and exported original SHA-256 matches downloaded source. Evidence: evidence/163-photo-entry. The photo is an input, not reconstruction success: the scene is still empty, other views and formal case freezing remain next. No deployment.

## Update 164: grouped reference inspection and frozen first development inputs

Reference manager now groups thumbnail buttons by room/group, while the pinned selector uses the same optgroups. Both manager and dock expose an enlarged inspection dialog with Fit, accessible 100–400% zoom, scroll/drag panning and a pinch-wheel path. The viewer is read-only, preserves image aspect ratio, renders existing annotation boxes, and isolates keys from scene tools.

408 tests pass; changed modules pass syntax checks. Actual browser imported three more real photographs, recorded observations/unknowns, saved the four-image study and reloaded it. Enlarged counter photo verified 400% overflow (2995×1996 in a 1166×499 viewport), pointer drag changed scroll from (914.5,748.5) to (814.5,698.5), Fit restored full view and Escape returned to the manager. Native trackpad pinch has code support but was not physically verified. Four stored photos total 2,263,813 bytes; original hashes match local source files. Evidence: evidence/164-reference-inspection.

MOMENTO-DEVELOPMENT-CASE.md freezes source inputs and explicit fidelity/editability/walkthrough gates. It records general-tool gaps exposed by actual photos, including the chamfered corner, curved counter and fixture mounting. No plan/dimension drawing has been used; dimensions and hidden spaces remain unknown. This is preparation of a development case, not completed architecture foundations, reconstruction, unseen acceptance or deployment.

## Update 165: room/object edit locks shared by UI and command batches

entities.lock explicitly locks/unlocks existing rooms and objects. A room lock protects its structure, floor, roof, holes, boundary walls and hosted openings; furniture remains separately editable. An object lock protects its record and mounted descendants, so moving/removing a host with a locked child also rejects. UI inspectors expose lock/unlock, and object selection refreshes after history changes. Locks are edit guards, not authentication: explicit unlock, document replacement and undo remain available. Legacy tiles, arbitrary regions and inventory quantities are not separately lockable yet.

The shared reducer compares protected state before/after operations; direct structural adoption has the same guard. Protected snapshots omit unrelated references instead of cloning every embedded image again. Tests exposed uppercase full-height Window flags falling through the old placement ownership detection; these now route through the existing wall-opening path.

411 tests pass: room changes, direct glass placement, mounted families, atomic batch rejection, exports and undo. Actual browser locked the left fixture room, rejected a roof operation and a public command preview containing rename+resize, reloaded and observed the lock, unlocked and successfully changed the floor to oak. The unlocked roof attempt independently rejected because of the floor above, correctly retaining structural constraints. Undo restored floor, lock and original Momento photo study; complete exported study equals the pre-test export. Evidence: evidence/165-entity-locks. Object/mounted behavior has unit coverage; separate actual UI furniture-lock walkthrough remains pending. No deployment.

## Update 166: persistent comparison viewpoints

Scene views now validate and store named camera center/zoom, floor, full-building/cutaway/lower-floor/grid display, reference ID and viewport dimensions. view.save/remove share commands, persistence and undo. View options → Saved views supports save, update, restore and removal. Restore reopens a linked reference, returns the editor to selection mode, restores display toggles and warns when the viewport dimensions differ or the reference was removed. This is fixed-isometric framing, not perspective camera estimation or photograph alignment.

413 tests pass, including view export/update/remove/undo and invalid camera-state batch rejection. Actual browser saved a ground-floor fixture view linked to its reference; changed floor, fit camera and cutaway; restored the same visible composition and ground/full-wall state. Saved view and linked photo restored after refresh. Removal followed by Undo restored the saved view. Full-building restore, changed-viewport warning and missing-reference warning have not yet received separate actual UI acceptance. Before/restored screenshots were visually inspected; no pixel-exact comparison claim is made.

Undo cleanup returned to Momento Brewers · Photo study: complete exported content equals its pre-test export. Evidence: evidence/166-saved-views, including saved camera metadata and screenshots. The cafe is still unbuilt and the broad foundation, development examples, independent acceptance and deployment gates remain open. No deployment.
