# Tian House — 当前完整 goal

2026-10-14 更新。用于更新现有 goal 的完整目标文本；不是另建任务或宣布旧目标完成。
执行范围以 ACTIVE-GOAL-V2.md 为准，视觉验收遵循 STATIC-HOUR-VISUAL-TARGET.md，
同时保留 PHOTO-TO-SCENE-DESIGN.md、WORKSHOP-DESIGN.md、PHOTO-REFERENCE-EXAMPLES.md
及 HAWKES-BAY-FINAL-EXAM.md 的完整要求。各项冲突时遵循用户最新指示。

## 目标

将 Tian House 升级为浏览器中的完整三维建筑工坊：用户提供一张或多张参考照片，
AI 使用与用户相同的公开建造工具，搭出可继续编辑、可实际走访、可保存的场景。
建筑、家具和道具具有真实体积；工坊操作以《The Sims 4》为可用性参考，光影、
道具细节、材质和室内氛围以用户提供的四张《Static Hour》图片为主要质量基准，
《Desperados III》为补充环境质感参考。最终完成全部验收并上线 tian.house。

## 实施顺序

1. 完成一个有完整内饰、灯光和院子的三维住宅样例，通过真实编辑、走访、
   日夜对照、保存恢复和目标 MacBook 性能验证。优先形成完整体验，集中发现并
   修复问题，不无限停留在单件道具或诊断界面。这只是阶段验收，不是最终完成。
2. 完善通用建筑工具：实体墙及门窗洞口、楼板、楼梯、地下室、多层、屋顶、
   地形、外景、植被、车辆、泳池；完善放置、吸附、自动/手动旋转、多选组合、
   支撑、碰撞、内容物、交互、存档和版本恢复。操作清晰顺滑，界面默认英文。
3. 全量盘点素材，按几何家族、材质、状态、方向和组合关系批量迁移。配方负责
   复用，压缩交付负责体积，语义目录负责理解；覆盖网格、贴图、LOD、碰撞、
   支撑和交互。缺少素材自主制作并入库，保留来源和稳定 ID。未迁移项明确列出，
   不用缩小素材范围来声称完成。材质和光照随真实几何正确工作。
4. 完成照片分析与建造工作流，区分观察、推断和近似。先盘点整组参考和所需
   素材，再批量制作、放置和走访。完成 Momento Brewers Café、Cantó House、
   Warehouse Morinha 三个开发案例并逐项对照；既有二维证据不能替代三维验收。
5. 冻结工具和管线，用未参与开发的新照片进行独立验收。禁止添加场景专用
   代码或修改隐藏状态绕过功能。若需通用修复，保留失败证据，修复并重新冻结，
   再使用新的未见案例验收。
6. 完成已知参考的期末项目：HITMAN Nightcall 的 Alma Reynard 海滨住宅，
   包括全部房间、家具道具、可用暗室、周围海滩与夜景。提前进行研究和工具准备，
   按参考追求 1:1，记录无法确认的尺寸和细节；不能把推断说成精确还原。
   这个已知案例不能取代独立未见照片验收。
7. 完成新版本三天游戏内居住测试、回归、性能和视觉验收，再部署 tian.house，
   实际验证线上资源、工坊、游戏和本地持久化。

## 完成标准

- 一份权威场景数据驱动画面、碰撞、支撑、选择及交互；人和 AI 使用相同公开
  编辑能力。主要构件和内容物可继续编辑，不用第二份不可编辑场景或专用演示。
- 保留旧住宅、用户存档、正常游戏、主菜单无缝进入住宅、卧室电脑及项目 OS。
  Folio University、Surge Method、Bebop Puzzle 项目介绍与房屋美学一致；本地存档。
- 保存、刷新、重开、导入导出、版本恢复、撤销重做均验证；实际角色检查门、
  楼梯、地下室、楼上、窄通道和家具设施，不能用临时无生存走访替代三天居住。
- 建筑比例、空间功能、动线、材质和关键道具有合理依据。真实浏览器中按正常
  游玩距离及近景，对照白天、夜晚、开灯和关灯。阴影、冷暖、细节和生活用品
  摆放达到参考审美；纯色模型、全局滤镜、单张好看的截图不算视觉验收。
- 在实际 MacBook/浏览器上明确并验证帧时间、内存、启动、交互延迟和传输体积
  预算。测试数量、压缩率或“使用三维”本身不代表性能和画质达标。
- 完整记录实现、困难、失败、修复、截图对照、测试和剩余差距；将可复用的
  方法和 SRE 不足改进到仓库，保留经验给后续项目使用。
- 交付代码、设计文档、素材配方与语义目录、参考资料、可编辑场景存档、验收
  证据和线上版本。只有全部要求真实成立才将 goal 标记完成。

持续自主推进已授权工作，不要求用户反复说继续。保持完整目标，不将局部进展
冒充完成；只有真实外部依赖导致无法继续时，说明证据和最小所需输入。


## User visual correction — 2026-10-14

Preserve PZ authored material detail while adding true volume. Generic smooth boxes and
procedural replacement textures do not satisfy the target. Follow
[SOURCE-MATERIAL-AND-GI.md](SOURCE-MATERIAL-AND-GI.md) for source color/painted-light separation,
whole-room comparisons and visibility-aware indirect-light experiments. Explore a custom
browser-appropriate GI pipeline; do not claim UE5/Lumen parity without evidence. This adds
visual requirements and does not reduce any existing scope or completion criteria.

### 2026-10-14 user-directed residential sample

Prioritize Hearth Studio (COZY-STUDIO.md) as the next complete single-resident visual sample.
Preserve Courtyard Studio and old saves. Batch all requested furniture and props, then inspect
actual circulation and day/night lighting together. Integrated batch351 is a first layout with
35 objects, not final source-material/Static Hour acceptance; broader goal remains intact.
