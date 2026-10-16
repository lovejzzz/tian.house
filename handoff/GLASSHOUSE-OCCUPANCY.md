# Glasshouse occupancy acceptance

User-requested gate: after furnishing Glasshouse, have an AI resident live in it
for several game days, discover missing provisions and fix the house. This is
required before calling Glasshouse complete. Status: two diagnostic trials executed. Revised core living loop passed a fresh
72-hour trial; full livability gate remains open for unsupported systems.

## Trial

Use a separate local test save and the final exported house plan. Preserve the
user's playable save and all house editions. Run three consecutive game days:

1. Ordinary home routine: unpack/store supplies, fetch water, prepare and eat
   meals, work at the bedroom computer, read/rest, use bathroom facilities that
   exist in the simulation, sleep and move between floors and garden/garage.
2. Repeat the routine using stored supplies. Inspect missing utensils, unreachable
   containers, approach space, needless trips, fixture placement and night lighting.
3. Live from the bunker's actual stocks, using its galley, bedroom, water and
   storage; traverse both exits. Do not grant or replenish supplies invisibly.

Control the resident through ordinary game inputs. Each day must include performed
activities and observed outcomes; fast-forward alone is not occupancy evidence.
Supplement with deterministic state/consumption audits where useful, labeled as
component tests rather than authentic browser play. Unsupported hygiene, power,
air and waste behavior must be recorded as missing simulation, not counted as
successful activities. Never use teleportation or hidden state edits to bypass
blocked paths or failed interactions in the acceptance run.

## Evidence and correction

Keep per-day logs of intent, attempted action, observed result, game time, current
room, inventory/need changes, route friction and missing facilities. Export the
save through UI at day boundaries; retain screenshots for concrete findings.
Classify findings as house layout, furnishing/supply, workshop UX or game-system
issues. Fix authorized issues, improve SRE guidance when the method misses a
failure, and repeat the affected routine with the corrected plan. Preserve both
failed and successful evidence; do not change the success criterion to hide gaps.

Deliver a concise resident diary, prioritized missing-items list, fixes, remaining
limitations, final house edition and links to evidence. A three-day residence test
cannot establish one-year bunker autonomy or complete Project Zomboid parity.


## 2026-10-12 result

Occupancy001 exposed random kitchen junk, missing guaranteed opener, unclickable
speed controls and clock-jump rest. After correction, occupancy002 ran a frozen
build from Day1 09:00 to Day4 09:25 in a fresh save. Three eight-hour sleeps,
main/bunker cooked meals, real stocks, finite water, storage, reading, computer,
lighting and two exits were exercised. Final health100/hunger19/thirst7/fatigue3.
UI exports and source hashes support this result; elapsed time alone does not.

Sleep now uses ordinary time progression. Cooking completion returns to1×, and
movement/nearby danger cancel acceleration. Kitchens have explicit food/utensils;
empty curated containers stay empty and empty cookware does not gain free water.
The pre-trial Sanctuary is preserved in House library.

Full hygiene, air/waste/energy networks, annual autonomy and smoother narrow-door
approaches remain incomplete. This result is a core-loop regression pass, not full
PZ parity or a completed Glasshouse. Private evidence: runs/occupancy-001 and002;
report: process-report-108.md.
