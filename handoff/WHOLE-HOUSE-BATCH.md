# Courtyard Studio whole-house furnishing batch

User direction: build missing assets together, place together, then inspect the whole house.
This replaces per-object checkpoints. Existing full goal remains authoritative.

Baseline: checkpoint341 / editor553,24 source objects. Batch acceptance requires one public
transaction, one saved/exported scene, whole-house view and circulation review. Source sprites
remain untouched; new geometry is approximate until visual comparison passes.

| Area | Missing | Batch action |
|---|---|---|
| Building | plain walls, provisional wood roof | source-keyed plaster and roof material, actual roof finish selection |
| Living | reading light, tea/books, wall composition | floor lamp, tea tray, mounted artwork |
| Kitchen | empty preparation surface | chopping board, bowl and produce assembly |
| Bedroom | storage, window covering, writing tools | wardrobe, drapes, notebook/coffee assembly |
| Bathroom | towel/soap storage and supplies | counter with towel/soap assembly |
| Windows | bare frames | all four glazed source openings receive drapes |
| Garden | provisional planting, no wider landscape | keep patio/path and plants; larger planting remains a separate complete landscaping batch |

Build shared templates for tabletop assemblies, wall frames/textiles and wardrobe plus floor
lamp adaptation. All dimensions, colors, mounts, semantic/source mappings and limitations are
recorded in recipes. Build all payloads before scene placement. Test supports, opening clearance,
source mappings, serialization and collision; no visual acceptance based only on test count.

Remaining after furnishing batch: interactive computer/OS volume, wall/baseboard/door detail,
large vegetation and fence, true game integration and individual light controls, roof overhang/
drainage, indirect lighting, material quality, performance and actual residence. This batch
must not be called a finished house or completed goal.

## Batch result342

Implemented and placed as one transaction554;36 total objects. Saved/exported/reloaded.
Integrated GPU sampler overflow exposed and repaired with a provisional shadow budget.
769 tests pass; real screenshots and route evidence in342-interior-batch. Door alignment remains
tight; material/detail quality, large-lamp-count scaling and the remaining scope above are open.
This is the first whole-house furnishing batch, not final architectural/visual acceptance.
