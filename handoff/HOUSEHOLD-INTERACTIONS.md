# Household interaction acceptance

User direction 2026-10-15: real live television, a playable 88-key piano with seated Hanon practice, actual showering, then complete the home's interactions item by item. Existing full goal remains unchanged. A button or status message alone is not completion.

| Fixture | Required experience | Authoritative acceptance | Current state |
|---|---|---|---|
| Television | Power, live channel, volume/mute, stop; picture on actual TV; watch from sofa | Browser receives and plays official live video; channel failure recovers; leaving releases stream/audio | FRANCE 24 English direct HLS plays on the actual 3D screen; decoded frame RGB drives shadowed room illumination (441); remote/volume/off supported. Nearby media UUID mapping verified with actual resident (442). Seated watch/stand path implemented at1×; resident acceptance pending (danger restriction verified). Spatial speaker audio pending |
| Upright piano + bench | A0–C8,52 white/36 black keys, audible manual notes; approach bench, sit, practice Hanon, stop/stand | Geometry/pitch agreement; visible seated hands/keys follow audible notes; cancellation and save recovery | 88-key mapping corrected; manual additive audio and ascending No.1 study panel implemented; seated/full-score workflow pending |
| Shower | Enter enclosure, shut screen, run water, wash, rinse, stop, dry/exit | Visible spray and body washing, water/audio stop on exit, water supply consumed, hygiene changes progressively, no automatic wound cure | Real resident entered revised shower and completed wash; visible spray, hygiene100%, wetness100%, unchanged health33.5. Layout/entry restored by flipping mirror to bathroom face. Passive body drying added and resident100→86% verified (458);90game-minute baseline is provisional. Body-washing animation, clothing/privacy, audio, towel use and garment moisture still pending. |
| Kitchen sink | Drink, fill, wash hands/dishes with water costs | Reachable from working aisle, finite reserve respected, dirty/clean state persists | Drink/fill verified; clear-water hand rinse with progressive reserve use, persisted hand cleanliness and tap water stream verified (451). Working-face gate shared by rinse/drink/fill and kitchen route verified (452); procedural two-arm rinse with clothing rigs and cancellation verified (453), still mechanical; soap/finger contact/drying pending |
| Refrigerator | Open/close, take/store, cooling and spoilage | Door clearance, food persists; power loss affects cooling | Take/store and inspection door motion verified; six content families display actual inventory (444). Partial servings now available (448); cooling/power-loss audit and door-sweep physics pending |
| Stove/oven | Put ingredients in, temperature, cook, remove, switch off | Raw/cooked/burnt progression and residual heat; accessible doors | Real resident cooked/ate steak; target-temperature control added and tested (448). Door animation pending |
| Breakfast bar + stools | Sit at reachable seat, eat/drink, stand safely | Knee space/contact, meal items on table, no teleport through cabinets | Rest and storage exist; eating posture/placement pending |
| Sofa + TV area | Sit, lounge, watch TV, stand | Cushion compression, correct foot contact, clear route | Basic rest/compression exists; final contact and TV linkage pending |
| Bed | Sit, lie down, sleep, wake, make bed | Bedding response, fatigue progression, interruptions, safe entry/exit | Basic sleep/rest exists; cloth/contact acceptance pending |
| Toilet | Approach, sit, flush, wash hands | Privacy, plumbing cost, hygiene, cancellation | Not implemented |
| Bathroom sink/mirror | Wash hands/face, groom | Water/hygiene and reflected/visible presentation | Clear-water rinse added (451); bathroom-specific physical acceptance and grooming pending |
| Wardrobe | Store/change clothing | Character appearance, item ownership and persistence | Audit required |
| Desk/MacBook/display | Sit, use OS/project apps, close/stand | Three project introductions and links; graceful offline behavior | Existing OS retained; seated use pending |
| Functional trainer | Choose exercise/load, animate cable/weights, recover | Body and cable movement, endurance/fatigue, clear exercise envelope | Not implemented |
| Lights | Per-fixture switch/dim, retain setting | Actual light changes and saved state, no clipping | Global control exists; per-fixture audit pending |
| Curtains/windows | Draw/open, light/air effects | Geometry/state/collision, illumination update and save | Audit required |
| Doors | Open/close/lock | Door sweep, obstruction, enemy exclusion, state persistence | Basic interaction exists; sweep and lock audit pending |
| Shelves/cupboards | Open, search, transfer, organize | Reach/weight/contents and saved state | Transfers exist; door animation pending |
| Houseplants | Water and maintain | Reserve consumption, persistent plant condition | Not implemented |
| Speakers | TV/piano source routing and volume | Single source, no doubled audio, distance and mute | Not implemented |
| Cleaning/laundry/bin | Dirt accumulation, clean, wash textiles, dispose | Resource use and persisted item condition | Not implemented |

## Shared implementation rules

- Actions belong to simulation; renderer shows the same action, no second hidden scene/state.
- Reach and obstruction checks before start; cancellation on movement/exit; no lingering audio, particles or video.
- Media requires an explicit user gesture. External channel failure must remain visible, not replaced with fake footage.
- Source records: FRANCE 24 official English stream https://www.youtube.com/watch?v=HvZt-nh9sGg and https://www.france24.com/en/live; real browser playback verified2026-10-15. Initial NASA ISS stream failed (recording unavailable); replaced rather than accepted. NASA https://www.nasa.gov/live/ and official ISS stream https://www.youtube.com/watch?v=jKHvbJe9c_Y (researched2026-10-15). This is an internet television channel, not access to paid cable subscriptions. Embedded playback must be tested before acceptance.
- Hanon original exercises are public-domain compositions. Ascending figure reference https://www.hearandplay.com/webinar3.pdf (C E F G A G F E). Current ascending study is explicitly labeled; do not present it as the full exercise or all60 exercises.
- Current piano voice is original additive synthesis, not recorded acoustic piano; timbre acceptance is pending.
- Shower must use water gradually; interrupted wash retains only actual completed hygiene improvement. Clothing/privacy and towel use require explicit design, not disappearing inventory.

### 486: Piano timing
Audio-clock lookahead transport replaces frame-triggered score timing; late notes skip rather than burst. Both hands share timestamps, tempo locks until stop, tab-hide/close cancels playback. Isolated production-panel browser flow checked at60/120BPM and full995 tests pass. Seated approach, in-world keys/hands, full Hanon transcription and audio-output acceptance remain pending.

### 487: Piano bench access
Added public Sit at piano using compiled keyboard/bench geometry, same-floor front-face pairing, reach and clear-gap checks. Normal simulation rest guard and1x survival remain. Support faces keyboard. Real resident attempts were denied by nearby danger, then side reach; positive seating/stand visual acceptance remains unproven. Audio still belongs to modal; seated performance/key/hand integration pending. Full998tests pass, not a substitute for this failed live acceptance.

### 488: Resident seating verified
Fixed radius-only rest warnings to respect physical visibility while retaining alerted threats. Fixed piano discovery at the bench to use actual keyboard geometry rather than whole-tile blocking. Actual resident sat facing the keyboard, stood and walked away; screenshots in evidence/488. This supersedes the blocked seating attempt in487, but does not complete piano practice: hands remain at rest and the modal still owns audio.

### 489: Practice in the room
The house now owns the ascending-study audio transport after the panel closes. It drives88 physical key pitches and both arm targets on the resident. Two real30BPM runs completed and returned to sitting. A crossed-arm failure was corrected using world-space shoulder positions. See evidence/489. Remaining: fingers, wrist/contact refinement, smooth transitions, recorded audio quality, full score, updated performance acceptance. This is not final piano acceptance.

### 490: Toilet state and flush
Timed use/flush now changes persistent dirty state and hand hygiene, with finite water consumption and interruption/reach checks. Emergency water retrieval is collapsed separately. Actual resident completed use and flush; the subsequent basin rinse required repositioning. Evidence490. Missing toilet seated animation, flush visuals/audio and dry-toilet waste handling; not final visual acceptance.

### 491: Toilet contact and bathroom loop
Added transformed front-use gate and rigid seat contact; actual side approach rejected, front approach seated successfully, completed and stood. Flushed, rinsed hands (30→60%) and drank water normally. No garment/flush animation acceptance; body pose remains approximate. Full1008 tests pass. See PROCESS491 and evidence/491.

495: carried Water Bottle, Apple and Orange now have inventory-ID-driven handheld presentation using the same delivered food geometry as fridge contents. Real bottle drink and fridge→Orange→eat verified in browser; effects remain completion-only and cancellation leaves food/water unchanged. Mouth contact uses a provisional arm IK and palm offset. Cap handling, fruit peeling/bite states, grip fingers, tray/spoon foods and seated meals remain open; unsupported foods retain their functional inventory action without invented prop substitutions. Evidence495 and PROCESS495 record validation and failures.

496: “Sit and watch TV” now checks the actual nearest cushion support, seat facing and seated-eye physical visibility, not the standing visitor position. Real breakfast-bar stools omit the action; sofa offered it and played FRANCE24 while resident sat facing screen. Decoded-frame illumination captured, then normal stand/remote-off exercised. Eye offset/cone remain authored approximations; arbitrary furniture layouts still need broader testing. Evidence496.
