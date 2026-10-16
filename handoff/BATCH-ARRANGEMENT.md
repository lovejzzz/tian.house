# Simultaneous furniture arrangement

`objects.arrange` is available in the workshop's public Build commands panel and
shared scene reducer. Use it for layout swaps or multiple independent groups that
would collide only while applying their moves one at a time.

```json
{
  "requestId": "living-room-layout-1",
  "baseRevision": 12,
  "operations": [{
    "type": "objects.arrange",
    "transforms": [
      {"ids": ["cabinet-a"], "dx": 2, "dy": 0, "turns": 2},
      {"ids": ["cabinet-b"], "dx": -2, "dy": 0}
    ]
  }]
}
```

Read the current scene for real IDs and revision; preview, then commit. Each group
rotates around the existing selection bounds using verified catalogue facings,
then translates by integer grid cells. Translation defaults to zero; omitted or
zero turns retains orientation. Mounted objects follow their support. Every group
is evaluated against the same original scene, including contents identified by
stable item IDs. Each object and its dependent children may belong to only one
transform. Final placement still must satisfy collisions, supports, locks and lot
bounds. Invalid results leave scene/history unchanged; successful requests remain
one undoable, idempotent saved transaction.

This operation changes existing furniture only. It does not batch-create assets,
rehost independent wall fixtures, or introduce a dedicated visual layout planner.
Users can access the same advanced command panel as the AI.

Verification: `apps/pz-browser/tests/scene-arrangement.test.mjs` covers occupied
container swaps, stock ownership, mounted objects, persistence, undo/redo and
invalid final results. `apps/pz-browser/evidence/411/replay.mjs` recreates the real
Studio media-wall rearrangement from the preserved resident export with exactly
the same 45-object result, without the former temporary parking move.
