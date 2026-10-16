# Momento Brewers — development case v2 (drawing-assisted)

Status: active development; drawing-assisted layout, interior/exterior assets and street approach implemented through checkpoint268. Overall photo fidelity and the full completion gate remain unaccepted. Source: [Studio Hoon project, photographs by Beezy Studio](https://www.archdaily.com/983949/momento-brewers-cafe-studio-hoon). Source originals remain outside public game assets. The browser study is named **Momento Brewers · Photo study**.

## Input contract

Four photographs, identified by exact source URLs and original SHA-256 in [input manifest](evidence/164-reference-inspection/input-manifest.json): exterior corner (_1), coffee bar (_6), adjoining wall (_9), counter reverse (_8). All four are already imported through the public workshop UI, with local working-copy provenance. Total stored image payload is 2,263,813 bytes.

The initial v1 used photographs only. Since checkpoint202, the architect's published A-01 floor plan has been imported and used to correct topology; the current case is v2, drawing-assisted. Source and transition evidence: [plan correction](evidence/202-plan-correction/source.json). Published area and printed drawing scale are not a verified pixel-to-metre calibration. Hidden upper-storey arrangements and adopted grid scale remain explicit hypotheses. The historical v1 photographs and earlier failures remain retained as evidence.

Target: walkable reconstruction in the declared isometric game style, with editable building structure and reusable furniture/fixture assets. Perspective pixels are not directly comparable to a fixed isometric screenshot; use correspondences, proportions, counts, topology and material/shape evidence. Do not imply photogrammetric accuracy.

## Required correspondences

| Input | Required scene features | Evidence boundary |
|---|---|---|
| Exterior corner | Blue brick facade, tall recessed dark-framed windows and sills, exposed rough masonry, side steel door, stools and paved frontage | Preserve the visible corner shape. Neighbouring upper-storey interiors are not observed. |
| Coffee bar | Dark vertically boarded counter with curved front, grinder, espresso machine, kettle, cups, pendants, hanging plant, white brick, grey floor and visible conduits | Do not invent exact staff aisle dimensions or concealed appliances. |
| Counter reverse | Twin windows with continuous sill, product shelves and cabinet, menu board and cups, shared counter/grinder, ceiling spots | Shared counter and grinder must resolve to the same scene objects, not duplicates. |
| Adjoining wall | Dark door and raised threshold, brown wall panel, curtain, relationship to adjacent bar | The door does not establish a bathroom; the curtain does not establish a second exit. Hidden functions remain inferred. |

Each row needs photo regions bound to scene entities, a comparable saved scene view, and a pass/fail difference note. Small objects may be editable decorations when no corresponding game behavior exists; do not label them functional equipment.

## Structural and asset gaps exposed by these inputs

- The generic 45-degree chamfer shell is now implemented and tested in the public editor, runtime and save path (183). This removes the rectangular-shell limitation; it does not yet prove the photographed corner. Polygon flat roofs now follow the outline, with 0–2 grid-square eaves and shared rendering/runtime masks (184). Single diagonal doors now support catalog placement, E toggling, two-way walking and save recovery (185). Single diagonal windows now support normal-based approach, open/close and two-way climbing (186). Single/picture fixed full-height glazing now supports diagonal and orthogonal structural walls (187). Polygon pitched roofs and fine facade attachments remain unsupported and must be addressed where required by the input. A rectangular substitute cannot be counted as a matching corner.
- A reusable four-direction rounded L counter with partial-cell collision is now available (188). Its proportions and final placement still require photo comparison; availability does not establish fidelity.
- Equipment needs supported countertop placement, retained host bindings and accessible operating positions. Separate appearance from usable gameplay behavior.
- Sills, shelves, conduits, pendant lights and curtains require usable mounting/offset semantics; flattening all of them into blocking floor objects is invalid.
- Saved comparison views, named version recovery and versioned public commands are now implemented. Photo annotations can bind rooms, objects, walls, windows, doors, roofs, stairs and floor openings; several photos can point to the same stable entity. Cross-photo correspondences before construction, usable-position inspection and complete command transport remain gaps. The reference workspace alone does not complete the foundational phase.

## Build and review sequence

1. Complete the general structure/asset/editor capabilities needed for these requirements before committing the reconstruction. Keep general tests independent of this cafe.
2. Annotate matching windows, counter and equipment in the input photographs. Record the proposed spatial graph and uncertain connections.
3. Submit an editable shell through public workshop commands; inspect openings, wall transitions and circulation before furnishing.
4. Add the counter, equipment and primary fixtures, then finish visible details and lighting. Track every missing or approximate anchor explicitly.
5. Save a named checkpoint at shell, furnished and reviewed stages; compare all four inputs and fix differences through the same public rules.

## Completion gate

- Every required feature above is present, editable and correctly associated across photos; any unresolved anchor prevents passing fidelity review.
- Exterior approach → actual entrance → customer counter standing position → window sill positions forms a playable route. Separately test a staff route to equipment where a service passage is adopted; mark hidden parts inferred. No path may cross solid counter/wall or rely on teleporting.
- Test supported interactions through normal character input. A generic decorative coffee machine does not prove coffee-making functionality.
- Move/rotate a counter assembly and verify attached equipment follows; undo restores it. Change wall finish without losing openings; verify collision and display from both relevant sides.
- Save, refresh, reopen, export/import and undo preserve complete semantic content including references and annotations; demonstrate recovering an earlier named checkpoint.
- Capture the finished scene and each target station, recorded route/actions and unresolved differences. Do not pass merely because unit tests are green.
- This case remains separate from frozen-version unseen acceptance. No public deployment claim until the overall release gates pass.

### 188：咖啡吧台通用构件验证

现已有可编辑四向弧角L吧台与台面设备，完成公开命令放置、UI组合旋转、真实走访及导出导入恢复。只是部件测试；实际Momento场景仍未开始。尺寸推断，设备仅装饰。窗台、展示架、灯饰与多图空间对应仍须落地，不能把目录齐全视为照片还原通过。

### 189：真实照片预建造标注

通过公开reference.annotate命令，将Coffee bar和Counter reverse中的八个区域保存到照片工作区：同一吧台的两个视角、同一磨豆机的两个视角、咖啡机、双窗及连续窗台、展示架、前吊灯。共享物件关系目前明确写入标注notes，尚不是机器约束的subject实体。entityId留空，待真实构件建立后绑定，不能凭空分配已建造对象。

双窗必须保留中间白砖柱；吧台曲面及台面设备跨照片仅建立一份。设备背后的隐藏连接与实际尺寸仍未知，不作测量声明。下一步：补齐外立面/相邻墙照片的区域和连接关系，再通过相同公开操作搭建外壳。证据见evidence/189-momento-observations/observations.json；浏览器导出74含八个标注，零房间零物件。

### 190：第一版实际外壳与走访（未通过保真验收）

通过公开Build commands搭建一个保留到后续迭代的Momento场景，而非新测试房。采用未测量的9×8源网格外接矩形与3格SE倒角，67.5平方格；不得将其称为67.5平方米。后墙与深度是推断。最初SW倒角从当前等距视角近乎侧对镜头，改用room.outline将场景朝向调整为两条街面可见；没有用更改隐藏状态完成调整。

南面三扇窗、东面不透明蓝门与独立玻璃入口、倒角中央封闭蓝砖标志面。封闭面没有错误地开门。吧台、磨豆机、咖啡机是3个可编辑对象，两个设备有hostId；两张照片的吧台和磨豆机分别绑定同一实体。14个照片标注，其中内部深色门及棕色面板仍未绑定，因实际构件尚未建立。

从8009,11404街道入口E开门，实际走至8007,11404，再到8004,11407吧台内侧；直接南行被吧台挡住，绕过末端到8005,11410临街窗前。22:18 Day1暂停，保留既有健康/僵尸状态。本次不是三日生活测试，也没有宣称咖啡设备能制咖啡。

命名版本：`Momento · Photo observations before shell`与`Momento · Shell and first walk · materials pending`。导出75与刷新重开76完全相同；实际恢复早期版本得到0房间/0物件/8标注，再恢复外壳版本，导出77除sceneDocument.revision外与75相同。当前editor revision363。

待修正：三扇窗过矮，间距及窗格不匹配；蓝砖太浅，粗石材不是照片的剥落砌体；墙体没有内白外蓝的独立面材质；内部隔断/台阶/帘子、窗台、货架、灯/管线/吊盆、杯壶菜单、街道铺装/矮凳、屋顶与上部外观尚未完成。此版本仅证明已开始真实搭建和可走访结构，不通过照片还原完成门槛。

### 192：三扇原创高窗，真实开窗与往返翻越

三扇临街窗已换成可复用Tall steel sash window，原opening IDs保持；不是整段墙替换成玻璃。实际N向三窗保留窗台、过梁及两侧墙，另做W向自动吸附放置后撤销。公开命令+UI完成，未修改场景文件。真实角色沿入口和吧台外侧走到窗前，验证E开窗、窗台阻挡、Nearby翻越出去再回来。新角色先前一次旧存档死亡已导出备份，新的走访又被室外僵尸伤到，11:14 Day1暂停；这不是三天居住测试。

刷新前后78/79导出完全相同，从旧窗状态导入78后80只差revision。当前editor368，命名版本`Momento · Tall sash windows · materials pending`。高窗使窗高/两扇玻璃比例更接近照片，但当前间距、砖材颜色、内外墙不同饰面、连续窗台和其余清单仍未达标。不得据此宣称完成还原。

### 193：墙材与吧台生活细部（仍未完成）

实际场景更新为原创深蓝砖、白砖和剥落灰泥露砖；规则石墙已替换。第一次灰泥视觉过于斑块化，已修正为连续抹灰与边缘露砖，但重复纹理和立面比例仍待调整。当前按墙段分材质；不得声称已实现内白外蓝的双面饰面。手冲壶/滤杯、纸杯/菜单牌两个可编辑组合已依附原吧台并绑定对应照片区域，设备仍仅装饰。

公开操作后5对象16标注；导出81/刷新82相同，从三次撤销后的旧版导入81再导出83只差revision。当前editor375，命名版本`Momento · Masonry and service details · incomplete`。实际入口仍可E开门进入。角色11:44暂停，旧伤导致健康12，后续测试需先正常处理伤势或实现明确的隔离预览，不得暗改健康后声称连续生存。

下一批重点：双面墙材质/连续窗台及墙上展示架、吊灯与管线、深色门和高差/棕色面板/帘子。必须逐项绑定照片并真实走访，不将当前空外壳视作完成。

### 194：独立内外饰面（仍未完成）

通过真实工坊目录将主房间31段墙的室内面设为白砖，室外深蓝砖/剥落灰泥维持。内外面成为独立语义数据；显式房间饰面检查视图可查看原本朝外的墙背面，退出检查回到固定相机默认面。不是运行时相机旋转。共用墙、四种斜角、门窗和复制/锁定等新增测试通过，全套525项通过。

真实UI完成材质选择、Undo/Redo、视图切换；导出84与刷新后85相同。editor378，命名版本`Momento · Independent wall faces · incomplete`。角色仍11:44暂停，本轮不含通行重测。下一步继续连续窗台/展示架、吊灯/管线和内部隔断；当前窗组间距、比例和材质重复仍不通过最终照片保真验收。

### 195：连续窗台和实际储物展示架（仍未完成）

重新对照反向吧台照片，检查已有PZ挂墙搁板贴图：已有单层/双层，无相同三层黑色样式。新增可复用N/W连续窗台段和三层展示架，经公开命令放入Momento：五段窗台覆盖当前临街窗组，展示架在左侧墙。窗台以当前高窗profile为准，照片中的实际离地高度和窗间距仍待校准，不能声称已精确还原。

展示架拥有真实容器；六份Coffee库存按六个陈列槽显示在三层板上。照片能证明包装存在，不能识别具体商品，标注明确咖啡库存属于玩法推断。展示架原有照片标注已绑定，新窗台标注绑定首段并说明其代表五段。场景11对象、5开口、4参考图17标注；库存随墙移动/撤除与混合命令次序问题均有测试。

完整530项测试通过。真实UI核对连续窗台、三层库存、合并方向的目录；公开“放库存→改墙”批次保留第七份测试库存，之后Undo恢复六份。角色仍11:44暂停，未进行本轮角色走访。尚未部署，吊灯/管线、窗台实际尺度、内部隔断和房间布局仍待继续。

### 196 — Safe repeatable workshop walkthrough

Walk through now starts an explicitly labeled temporary character in an independent world; Use as my home retains the ordinary saved-game application path. Browser inspection opened the glass entrance, walked around the service counter to the new shelf and took one of six stocked Coffee items. The original game export remained byte-identical before/after return and a reload during preview. Evidence: `evidence/196-walkthrough/`. This verifies that route and interaction only, not visual completeness, every fixture, or three-day survival. The scene itself remains revision44/editor384; all outstanding photo-fidelity work above remains open.

### 197 — Adjoining partition, service door and curtain

Five editable independent N wall segments at y11404, x8004–8008 now define the adjoining wall. A plain dark door at x8005, two umber plaster segments at x8006–8007 and a wall-mounted charcoal curtain at x8008 match the visible subject sequence. Their exact placement and the one-cell rear strip are inferred; no bathroom, concealed exit or measured dimensions are asserted. The raised threshold is still missing, so the door annotation explicitly remains an incomplete match. Conduit and lighting remain open.

The new assets are reusable and orientation-grouped, with generated surrounds/open-door states hidden from the catalog. Public commands created the partition and bound the photo's door/panel/curtain regions. Browser movement opened the normal street entrance, approached and opened the inner door, walked into the rear strip and back, closed it and confirmed renewed blocking. This temporary walkthrough is not residence acceptance. Export89 equals refresh/reopen export90, 535 tests pass, console warnings/errors empty. Saved version `version:momento-partition-checkpoint-197`, scene revision48/editor386. Evidence: `evidence/197-interior-partition/`.

### 198 — Raised service-door threshold

The dark inner door now has a charcoal threshold created through the workshop's generic
Door thresholds panel. Height 8 source-art pixels (8/96 storey), depth 0.4 cells per side
are provisional, not photo measurements. Door annotation now states that distinction.
Real temporary-character movement verified step-up, opening, passage, descent, return
and closed-door blocking. Shared surface-height report and screenshot are in
`evidence/198-door-threshold/`. All 540 Node tests pass; saved version
`version:momento-threshold-checkpoint-198`, editor388, export91 equals refreshed export92.
This resolves the missing raised-step mechanism; it does not establish overall photo
fidelity. Pendant lamps, conduit, plant and unresolved geometry remain pending.

### 199 — Surface conduit

Five wall-attached conduit pieces now run above the adjoining partition and raised door,
including an upward turn near the curtain. They are reusable N/W assets (two catalogue
choices), not scene-only geometry. A photo annotation links the first segment and marks
height/routing inferred. Editor390, 17 objects, export93; 542 tests pass and actual browser
rendering/search inspected. Ceiling-hung fixtures and plant remain next; full scene
fidelity and independent acceptance remain incomplete.

### 200 — Pendant pair and hanging planter

Two ceiling-mounted cone lights and one hanging terracotta planter are now editable
objects. A provisional flat top supplies real placement support; references explicitly
mark its construction and positions as inferred. Do not confuse the second pendant
with the small deeper wall light, which remains missing. Actual temporary-character
walkthrough reached the pendant at8003,11406 and switched it off/on; HP100. Editor392,
20 objects, export94, 545 tests passed; screenshot/report under evidence/200-ceiling-fixtures/.
Updated cafe atlas passed actual browser PNG/WebP canvas equality (0 differing bytes).
The scene's overall fidelity remains incomplete.

### 201 — Wall light and overhead conduit modules

Added the third, wall-mounted light separately from the pendant pair. Thirteen ceiling
pipe segments form an editable provisional route; source photo does not prove this
complete topology, and annotation marks it inferred. Lamp and conduit are reusable
catalogue families with physical direction variants. Actual character reached and
toggled the wall light; 546 tests pass. Editor394, 34 objects, export95; evidence under
`evidence/201-overhead-details/`. Rear wall-to-counter spacing remains too large visually
and needs a multi-photo proportion pass. No overall fidelity or release claim.

### 202 — Authoritative floor plan contradicts the photo-only layout

Revisited the project's original ArchDaily page and found the architect's published
A-01 floor plan (source URL in evidence/202-plan-correction/source.json). The text and
drawing establish two zones, bar-side entrance, exhibition-side door, stair enclosure
and bathroom. Prior one-room interpretation and door placement are not faithful; prior
fixture/collision tests remain valid feature evidence, not layout acceptance.

Saved `version:momento-before-plan-correction-202`, imported the plan through public
reference.add, rotated counter S→E, moved its full mounted assembly two cells left,
moved the front pendant left and added a three-segment divider at x8004,y11408..11411.
These are the first topology corrections, not a finished plan reconstruction. Existing
entrance/spawn and rear partition require relocation, rear work counter/service areas
must be added, piping rerouted, and fixtures rematched after layout. The plan reference
explicitly labels these pending contradictions. Printed A3 1:50 has not been treated as
verified pixel-to-metre calibration. SRE validation now requires checking the original
publication for plans/sections before settling a photo-only layout.

### 203 — Plan entrances and shared entry command

Added public `entry.set {x,y,z}` and routed the Entry point mouse tool through the same
model validation. Reject unsupported/occupied/out-of-lot floor cells and preserve spawn
through later structural operations in the same batch. Tests cover atomic failure,
undo, saved reconstruction and scene-metadata retention.

At editor revision 398, rehosted the coffee shelf to west wall 8000,11410, relocated the
main glass door to west 8000,11409 and exhibition door to east 8009,11407, preserving
opening IDs. Set spawn outside main door at 7999.5,11409.5. Public command preview and
commit succeeded. Actual keyboard walkthrough opened both doors, entered bar zone,
passed around the divider at y11407 and exited exhibition door; HP100. Report records
14 visited cells and two door events. Export97 equals export98 byte-for-byte after reload.
548 tests pass. Evidence: `evidence/203-plan-entries/`.

Remaining architectural corrections: rear work counter, stair/bathroom enclosure,
window grouping, chamfer proportions, ceiling routes and exterior context. Shelf position
is provisional; successful circulation does not establish full photo fidelity. No deployment.

### 204 — Rear bathroom and independent stair enclosure

Moved the five-edge rear partition from y11404 to y11406 through public walls.move;
its six mounted fixtures followed. Added WC west boundary at x8003, stair/WC divider
at x8005 and stair back boundary y11404. Moved the internal door to x8004,y11406,
removed its unsupported raised threshold, and added the separate exterior stair entry
at x8009,y11405. Existing catalogue sink and toilet approximate the fixtures drawn in
the plan. Dimensions are grid approximations, not a calibrated metric reconstruction.

Actual keyboard walkthrough entered WC, opened Sink · Mains water panel, exited to the
exhibition area, went outside and opened the independent stair entry. Sink drinking was
canceled by subsequent movement; no completed-drink claim. Door-jamb alignment briefly
blocked exit until character recentered in the opening; retain as UX follow-up. HP100.

Editor401/export99, 36 objects. Updated source-plan annotations to distinguish completed
entry topology from pending stair flights. No engine changes, so prior 548-test run was
not repeated. Evidence `evidence/204-rear-enclosures/`. Stair flights/upper landing,
rear work counter, new fixture positions, ceiling routes, facade and photo fidelity still
incomplete. In particular the hanging plant is now inside the stair enclosure and must
be rematched to the photographs. No deployment or whole-case acceptance.

### 205 — Preparation run and independent tabletop rehosting

Added generic tabletop support transfer to objects.rehost, shared by placement preview,
mouse UI and public commands. Selecting a table now exposes Move actions for its mounted
items. IDs persist; unsupported targets reject, locks protect the assembly, undo and saved
reconstruction pass. Actual mouse action moved the existing brew kit to the rear worktop
at 8001,11405, preserving its ID. Public commands moved espresso to 8001,11404.

Added reusable straight preparation counters and a compact 2x2 rounded L-counter using
the cafe generator. Original 3x3 recipe remains compatible. Canonical recipe/atlas/catalogue
build completed; browser compared 4,915,200 PNG/WebP RGBA bytes with zero differences.

First walkthrough exposed the oversized 3x3 counter blocking the staff route against the
rear worktop and bathroom wall. Preserved failed report; replaced it with the generic
compact variant at 8000,11407, preserving grinder/cups by rehosting before replacement.
Rebound three reference annotations to the replacement counter. Second actual walkthrough
reached 8000,11404 behind the worktop and opened its 50-capacity storage. Plant moved out
of the stair enclosure to 8002,11405. Editor405, 39 objects, export100; 549 tests pass.

Remaining: actual U-shaped stair flights and upper destination, work sink, photo proportions,
window grouping, overhead routes, facade/context and independent acceptance. Existing art
is still a grid approximation. No coffee-making interaction is claimed for decorative
espresso equipment. No release. Evidence: evidence/205-preparation-counter/.

### 206 — Return-stair movement kernel (not yet authorable)

Existing stairs represent a full rise along one straight three-cell run. Added a shared
return-stair path with two half-rise flights, a flat turning platform, four rotations and
both handedness values. World movement now consumes optional return-stair paths, retains
physical footprint checks and rejects missing upper landing support. Tests perform full
ascent/descent for all eight combinations and reject lateral shortcuts between flights.
No return staircase has been placed in the actual scene; source art, compiler/catalogue,
editor controls and real-browser traversal remain pending. These unit fixtures are not
scene or visual acceptance. Existing Momento stays at editor405/export100. Implementation
contract and remaining integration gates: RETURN-STAIR-IMPLEMENTATION.md. No deployment.

### 207 — Return-stair scene compilation and model editing

Integrated return links into compileVerticalLinks. The compiler validates supported
lower/upper approaches, the entire footprint, furniture/headroom and internal walls;
it derives the upper shaft and runtime paths without flattening the structural link.
Removing/moving the link restores the source floor. Updated stair picking, ownership,
erase and move operations to use the shape-specific entry, preserving link identity.
Synthetic-property tests exercise model placement, full World ascent, saved reconstruction,
move, erase and undo, plus atomic rejection of missing platforms and obstructions.

No return assets are installed in the real catalogue yet, so this is model/runtime evidence,
not a browser-delivered staircase. Candidate Momento run reduced from3 to2 to leave an
internal approach and upper landing within the 4x2 enclosure; four-cell stair plus external
port would otherwise require an unsupported landing outside the current footprint.
Scene remains editor405/export100. Art, editor catalogue, real staircase placement and
browser walking remain next. No deployment.

### 208 — Return-stair assets, catalogue and actual browser traversal

Generated original concrete tread/landing sprites for runs2/3, left/right return and four
orientations. Catalogue exposes four families with rotated directions grouped. Each part's
height/gradient metadata is checked against the movement path. Recipe/atlas/semantic build
completed; browser PNG/WebP canvas comparison: 11,796,480 RGBA bytes, zero differences.

Placed `stairs:return:W:left:2` at 8005,11404 through public commands (link
47b01a03-a1f6-4a4e-b182-67f706420113). Actual keyboard route: enter external stair door,
walk lower flight to half-height landing, turn, ascend to floor1 at 8008,11404, reverse and
return to floor0 at 8008,11405. Report records both levels. Updated architect-plan annotation
as approximate, not calibrated geometry. Editor407/export102 equals export103 after reload.
567 tests pass. Evidence: evidence/208-return-stair-browser/.

Visual limitation discovered: when standing on the upper floor the descending flight is
insufficiently visible. Guards are absent and the destination remains a provisional flat
roof/landing, not a recreated upper building. Stairwell curtain and conduits still require
photo reconciliation. No overall stair visual acceptance or deployment yet.

### 209 — Visibility down the return-stair shaft

Root cause: visibility only evaluated the player's current floor; lower stair cells faded
into memory and lower-level walls were excluded from nearby cutaway. Added a bounded
cross-floor view through a visible upper approach into uncovered return-stair cells.
No lower-room flood fill occurs; covered cells and obscured upper approaches stay hidden.
Shaft-adjacent walls participate in smooth cutaway, and stair solids use object depth order
instead of the flat-floor pass. Tests cover hidden rooms, distance, covered treads and
upper approach occlusion.

Actual browser climbed to floor1, visually confirmed descending treads now readable, then
returned to ground. Report and upper screenshot saved under evidence/209-stair-shaft-visibility/.
Scene unchanged at editor407/export103. Guards and upper building remain incomplete.
This is a targeted readability improvement, not full stair/architectural acceptance.

### Exterior checkpoint 211

Upper shell and window states now exist as editable scene entities (editor410). Evidence:
`evidence/211-upper-windows/facade.png`. Photo-observed film is a separate window-mounted
object. Upper floor height/interior/roof remain inferred; upper opening widths are too
narrow and need generic multi-cell operable window support. Do not count object presence
as a pass for opening proportions. See PROCESS.md for persistence and regression evidence.

### Exterior checkpoint 231

Live scene revision421/export119 retains 67 objects and return stairs. Front blue wall now
has a weathered lintel band; chamfer sides use exposed masonry with render remnants.
These are reusable procedural surfaces, applied through public wall.material commands.
`evidence/231-facade-surfaces/facade.png` records the result. Source photo supports surface
placement, not exact material dimensions. Entrance double-door width, pavement/curb level,
block openings and interior detail still need correction; current roof/upper interior are
inferred, not documented photographically. Opening IDs and interior finishes are unchanged.

### Entry checkpoint 232

Stair entry now uses a two-cell steel glazed double door (W, 8009,11404–11405). Existing
entry ID survives on the second leaf; both leaves open and admit the player independently.
Actual walkthrough16 and editor422/export120 retained under evidence/232-double-entry/.
The next exterior correction is the canopy, currently still one cell over a two-cell entry.
Door geometry/width are approximate to source-grid dimensions, not metric calibration.

### Entry canopy checkpoint 233

The stair-entry canopy now spans both door leaves as one editable two-part prefab, with
four orientations and two verified wall hosts. Public command/editor423/export121 and
facade screenshot are retained in evidence/233-wide-canopy/. Browser decoding matches
source pixels exactly for the updated cafe atlas; width remains source-grid approximation.

### Concrete block checkpoint 234

Rechecked exterior photo: three side-facing cores and continuous top surface replace the
incorrect pair of top holes. Stable existing IDs update the four scene blocks without save
migration. Evidence/234-block-cores/facade.png shows the correction and the single catalogue
card with two orientations. Concrete texture and overall dimensions remain approximations.

### Preparation sink checkpoint 235

Rear worktop now contains an operable sink at 8001,11403. Its position is supported by the
architect floor plan; cabinet/faucet appearance is inferred and annotated accordingly.
Actual entry-to-staff-aisle walk and drinking completed, recorded in walkthrough17. Scene
editor425/export123 and screenshot retained in evidence/235-preparation-sink/. Four directions
share a reusable original recipe; this does not establish metric or overall interior fidelity.

### Raised sidewalk checkpoint 257

Through public workshop import/commands, restored latest scene and applied57 rose6px
sidewalk cells,12 grey12px seating-platform cells, and8px thresholds at the blue side entry
and two steel leaves. Relative tiers follow exterior photo; exact height/width are approximate.
Walkthrough21 confirms both tiers, blue side-door crossing and second steel-leaf crossing,
with interior returning to ground height. Evidence/257-momento-platform includes export126,
request/receipt, screenshots and actual surface/interaction report. Still missing road,
drainage and shaped outer corner curb; the rectangular apron is not a finished reproduction.

### Street paving and drainage checkpoints 258–259

Reusable original interlocking concrete street paving and two-orientation drain overlay now
surround the apron. The floor-mount rule was repaired through a failed public preview and
regression. Walkthrough22 actually crosses both grates at surfaceZ0 and sidewalk6/96;
HP100. Editor444/export128 includes source-photo annotations documenting approximations
and inferred extra grate. The rectangular outer apron still needs a shaped corner curb;
this is not overall scene-fidelity acceptance.


### Current review, checkpoints260–262

Exterior apron now has a reusable straight diagonal chamfer with editable raised paving
and lower road layers; actual walking crosses both heights within one cell (260). Source
curvature and measured widths remain approximate. One user-requested baseball bat is
stored on the clear counter segment; visitors arrive empty-handed and can retrieve/store
it (261). This added object is user-directed, not evidence from the reference photographs.

Checkpoint262 checks the actual reverse-counter photo again. Outstanding visible anchors
include the dark upright display cabinet beside the product shelves, the framed menu on
the counter and ceiling spotlights. Do not count generic furniture or existing pendant
lights as those specific correspondences. Current exported authoritative scene is
[evidence261](evidence/261-empty-hands/scene.json), editor447;262 changes previews only.

### 263 — Reverse-counter detail pass

Framed tabletop menu and two independent ceiling spotlights are now editable objects and
bound to source-photo regions. Real walk toggled both lights and reached the window aisle;
evidence263-menu-spots, editor449/export132. Menu glyphs do not claim source text/prices;
position/aiming/scale remain approximate. A reusable narrow cabinet exists in the catalogue,
but its actual placement is still outstanding: west entry/shelf spacing must be corrected
against the source before fitting it. This does not pass overall fidelity.

### 264 — Correct display wall and support fixtures on its opposite face

Rechecked reverse interior photograph against the architect plan. The product shelves belong
on the cafe face of the exhibition divider, not the entrance wall. Added reusable E/S shelf
variants with explicit opposite wall side and negative projection slots. Interaction reach,
world hints and stock visibility now use the fixture face rather than the host cell center.
Solid walls still block interaction from the wrong side. Regression covers rehosting stock,
face reach, display slots, undo and redo. All636 runtime tests pass. Canonical generation and
read-only freshness pass using the documented Pillow runtime (system Python lacks Pillow).
Browser PNG/WebP comparison:15237120 RGBA bytes, zero differences.

Public request moved shelf to divider8004,11410 and placed cabinet8003,11409 (editor450).
Export133 preserves71 objects. Walked from entrance through the aisle to8002,11410, HP100;
opened the opposite-face shelf and observed inventory5/12 and shelf5/15 after taking coffee.
Issued Store and captured the scene after its transfer; report saved. Cabinet and shelf are
both reachable from the aisle. Evidence264-opposite-wall contains request, scene, screenshots,
walk report, tests and browser pixel results. Reference annotation notes still need updating
to explain the corrected wall; cabinet top display objects and final proportions remain open.
No deployment and no overall acceptance claim.

### 265 — Photo bindings, exact reload recovery, and named-save overhead

Previous264 made verified scene and implementation progress. Updated the reverse-photo shelf
annotation to explain the divider face and explicitly approximate dimensions/stock; added
a cabinet binding, then corrected its visible rectangle against the actual source image.
Public commands brought editor452. Saved named version
`version:momento-interior-checkpoint-265`. Reloaded through the main menu and reopened the
workshop: before/after exported JSON is byte-identical (evidence265-version-recovery).

During this check, named-save preview and commit stalled browser actions. Inspection found
that saving a name rebuilt/copied the entire undo history despite changing no geometry.
Named preview now exports only the current plan; named commit retains immutable history and
uses the existing queued saveEditor path. Receipts install only after durable save. Added a
regression covering a pending save, blocked competing edits, preserved live scene/history,
and idempotent retry;637 runtime tests pass. Browser preview round trip was298ms after the
change (one observation, not a percentile benchmark). Commit still caused a3s observation
timeout and later returned success; the remaining UI stall is explicitly unresolved. No
claim that this optimization completes performance acceptance.

Saved `version:momento-fast-checkpoint-265` with identical content digest, manually renamed
the house through the normal name field (453), then previewed/committed versions.restore.
The automatic pre-restore checkpoint retains the manual name. Restored export at454 differs
from the pre-reload scene only at sceneDocument.revision; entity identity, inventory,
references, host attachments and geometry are identical. No duplicate mutation was sent
after a tool observation timeout. Latest scene: evidence/265-version-recovery/after-restore.json.

Remaining: actual commit responsiveness profiling, cabinet-top objects, whole-case fidelity
and other design gates. Cantó/Warehouse and frozen independent acceptance still outstanding;
no deployment.

### 266 — Profile save work; suspend hidden modal background drawing

Previous265 produced verified code, refresh equivalence and named-version recovery. Captured
real browser CPU samples around a public named save of editor454. Major self-time included
drawImage2205ms, workshop draw1362ms, wallJoins1267ms, ground support1100ms and boundary
clipping902ms, alongside codec generation2439ms. These are samples over a32.9s capture
including idle, not the operation duration or a latency percentile.

Workshop now retains its last canvas frame while a child modal dialog is open. The RAF loop
remains active; closing the modal resumes rendering. This removes needless background
isometric work while users operate commands, references and library dialogs. Same-scene
public save after reload returned success with identical content digest;18.3s follow-up CPU
capture contains no drawImage/wall/ground render hotspots. Different capture lengths must
not be presented as an end-to-end speedup. Codec generation still accounts for2237ms of
sampled CPU; full save latency/large-workload budgets remain unaccepted.

637 tests pass. Actual UI closed the modal and switched up/down floors; screenshots verify
canvas repaint resumed. Scene revision454 and contents unchanged; saved extra immutable
profiling versions through normal commands. Evidence266-save-profile contains both raw
CPU profiles, summaries, receipts, test output and resumed canvas images. SRE performance
guidance now distinguishes concurrent UI work and profile duration from measured latency.
Next return to remaining Momento visible objects/fidelity and subsequent design cases; no
deployment or global completion claim.

### 267 — Cabinet-top circular display objects

Previous266 changed and verified modal rendering behavior; no blocker. Returned to the
remaining reverse-photo anchor: two pale circular faces on stands above the dark cabinet.
Their function/manufacturer is not established from the photo, so the catalogue calls them
Round tabletop display pair without claiming speakers or electronic behavior. Added an
original deterministic four-direction recipe to the existing cafe atlas, with table support
and one orientation family. Existing regions remain stable.

Canonical regeneration/freshness and638 tests pass, including unsupported placement
rejection, actual cabinet host binding, four host rotations and serialized reopen. Browser
compares15728640 decoded RGBA bytes with zero differences; PNG141494/WebP52054 bytes.
Public placement creates the pair on cabinet8003,11409 (455), hostId preserved in export.
Cutaway UI visually shows both discs supported on the cabinet rather than on the floor.
Photo annotation binds their actual entity and revises the cabinet note (456). Source
shape/proportions remain approximate. Evidence267-cabinet-display contains authoritative
scene, requests/receipts, screenshot, pixel result, build/freshness/tests. No new walking
claim for this purely decorative addition; prior264 covers this aisle and cabinet reach.

The scene now has72 editable objects. Remaining whole-case fidelity/proportions, architecture
review and other acceptance gates are not implied by this object count. Continue those
checks before the next development case; frozen independent acceptance and deployment
remain outstanding.

### 268 — Cross-photo audit catches a missing interior threshold

Previous267 completed a visible anchor with verified assets and scene persistence. Reopened
the architect plan and original coffee/adjoining/reverse photographs. Current export had
no threshold on momento-service-door, despite the adjoining photograph clearly showing
a raised dark step and earlier198 feature evidence. Historical feature success did not
prove the detail survived subsequent topology changes. Added an8px/.35cell dark threshold
through opening.threshold at editor457; dimensions remain approximate.

Actual entrance→counter aisle→inner door walk opens the door and crosses both directions.
Report records surfaceZ0→8/96→0 on both sides, then closed-door blocking at
x8004.42,y11406.187, HP100. No teleporting or hidden-state changes.

Current scene also had zero saved views. Added four reference-linked comparisons through
view.save, then corrected viewport from outer browser1280×720 to actual reference-docked
canvas716×572 and reduced zoom (459). Opened reverse and adjoining views through Saved
views UI; latter restores without framing mismatch. Evidence268-layout-review contains
requests, authoritative scene, route report and side-by-side reference screenshots.

Visual audit remains incomplete: the plain grey grid floor does not reproduce the observed
terrazzo grain; the dark floor strip below the brown wall/curtain is absent; brown panel
width/door relationship remains approximate. Source-relative outer proportions have not
been quantitatively calibrated. The adjoining reference's historical photo-only note still
says the room function is unknown; architect-plan evidence now needs an explicit linked
context update rather than overwriting the original observation. These are active work, not
accepted fidelity. Four saved views are now available for repeatable follow-up review.
No code changed this turn, so prior638 tests stand; this verification covers scene commands
and actual door behavior. No deployment or overall completion claim.

### 269 — Reusable authoring guidance and seeded terrazzo materials

The intervening user answer explained capability but changed no authoritative state. This
turn makes that experience reusable: ASSET-AUTHORING.md maps actual generators/primitives,
mount/collision/direction contracts, integration regressions and failure examples. AGENTS.md
and ASSET-PIPELINE.md link it; SRE domain-validation gains a general asset-learning rule.
It explicitly distinguishes source-code recipes from an unimplemented external parameter UI.

Added grey/ivory/charcoal terrazzo palettes to the registered cafe recipe. First room-scale
render exposed diagonal aggregate bands caused by correlated modular coordinate sequences.
Kept rejected-banding.png, replaced them with independent samples from a local fixed seed,
rebuilt and visually rechecked the same saved comparison view. No scene-specific code.
Public room.floor replaced Momento ground finish at460; export confirms all object/opening/
wall/stair identities and inventory unchanged. Hidden upper-floor finish left untouched.

Canonical build/freshness pass;638 runtime tests passed before the sampling-only correction.
Final browser atlas comparison15728640 RGBA bytes shows zero differences; PNG143665 and
WebP52942 bytes. Evidence269-material-authoring includes failed/final screenshots, commands,
scene, identity comparison and build checks. Material grain is a stylized approximation,
not calibrated photogrammetry. Dark floor strip, overall proportions and remaining design
gates still open; no deployment or whole-goal completion claim.
