# Independent wall finishes

Status: implemented and browser-verified in milestone 194; not deployed.

Select a room using **Edit rooms**. **Change interior wall finish** paints its room-facing sides; **Change outer wall finish** paints the opposite sides (including the adjacent room's side on a shared wall). Choose a catalog material with both N/W orientations. Doors, windows and attached objects retain their identities.

**Inspect room finishes** renders the selected room-facing finishes even on front walls. Switch **View options → Room finish inspection** off to return to the normal fixed-camera view. This inspection changes neither the saved scene nor the gameplay camera.

Public commands use the existing revisioned build envelope:

```json
{"type":"room.finish","roomId":"ROOM_ID","side":"room","wallN":"tian_masonry_chalk_1","wallW":"tian_masonry_chalk_0"}
```

Use `side: "outside"` for the opposite faces, or one wall:

```json
{"type":"wall.finish","id":"WALL_ID","roomId":"ROOM_ID","side":"room","tile":"tian_masonry_chalk_1"}
```

Single-wall commands also accept `positive`/`negative`: the left/right half-plane of the canonical directed edge, not compass-facing sprite names. `wall.finishes` stores optional tiles for these keys; `wall.tile` remains the fallback. `wall.material` changes that fallback; explicit face overrides take precedence. The compiler rejects invalid directions and incompatible opening surrounds on either assigned face.

The default compiler uses the face toward the fixed isometric camera. `{finishRoomId}` is an explicit transient compiler option for inspection. Room boundary movement and chamfering preserve finishes; copied floors retain them. Newly created partition walls still use default materials. Performance at the 50k-cell limit and runtime dynamic camera views have not been established by these tests.
