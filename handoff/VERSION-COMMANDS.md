# House version commands

Implemented locally in milestone 178. These commands share the public **Workshop controls → Build commands** panel with construction commands. **House Library → Versions** uses the same version service. They are not yet advertised as WebMCP tools.

## Read and preview

**List versions** returns the current editor revision and saved version metadata, including immutable version ID, label, house name, scene ID, date, and content digest. It does not return embedded reference photos or complete scene payloads. Use IDs returned by this query; do not guess them.

Every modifying request uses the ordinary envelope:

```json
{
  "requestId": "a-new-unique-request-id",
  "baseRevision": 12,
  "operations": [
    {"type": "versions.save", "label": "Layout approved"}
  ]
}
```

Replace `12` with the current editor revision. Use **Preview commands**, inspect the result, then **Commit commands**. Preview does not write a version, change the draft, or add a recovery checkpoint.

Supported standalone operations:

| Operation | Fields | Result |
| --- | --- | --- |
| `versions.save` | `label` (1–100 characters) | Immutable named snapshot; does not create a geometry undo step or increment editor revision |
| `versions.restore` | `id` from List versions | Restore snapshot as one undoable edit; preserve current draft in a recovery checkpoint first |
| `versions.branch` | `id`, `name` (1–60 characters) | Restore as a separately identified scene with the requested house name; preserve current draft first |

Use exactly one version operation in a request. Mixing a version operation with placement, rename, another version operation, or structural edits is rejected rather than partially committed. Make separate requests based on their returned revisions.

## Retrying, manual edits and failures

Reuse the *identical request* to retry an uncertain result. A successful request's receipt is saved with the draft and undo history. Repeating it returns its original result without creating another version, checkpoint or branch—even after refresh or undo. The returned receipt describes the original execution; it does not assert that the editor still displays that result. Preview reports `alreadyApplied` and `originalRevision` for this case.

To apply a version again after deliberately undoing it, use a **new request ID and the current revision**. Reusing an ID with different contents is rejected. A new request using an old revision is rejected if the user has edited the draft; read the scene/revision and replan.

Branch scene IDs are derived from request IDs so a branch preview and commit agree. Entity IDs and their internal references remain unchanged within the new scene. The source snapshot stays immutable.

The immutable library and working draft live in separate IndexedDB databases. A library write may succeed before a draft write fails; that safe version/checkpoint is retained. The live draft and history change only after draft persistence succeeds. Reopening and retrying the identical request reuses the existing immutable record instead of duplicating it. A competing editor's draft write causes a conflict, not a last-writer overwrite. Do not reset the persistence error or automatically overwrite another editor to retry.

## Boundaries

Named versions and recovery checkpoints stay on this device. Exporting the current house does not export the whole version history or command receipt log. Version merging, portable history packages and a formal WebMCP transport remain unimplemented. These commands do not replace scene-specific walkthrough or photo-fidelity acceptance.

### Full-height open passages

Create with `opening.add` and `{id,hostWallId,kind:"passage"}` (no tile).
Remove with `opening.remove` to restore the host wall. Both operations use the same
validation as Edit rooms → Open or restore passage. A staircase using the passage
prevents restoring the wall until the staircase is moved/removed. Doors and windows
should be removed explicitly before using the manual passage toggle.
