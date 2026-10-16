# Studio performance acceptance

These are proposed engineering acceptance budgets for the current furnished Studio, not claims that they already pass. Visual fidelity must be maintained; do not remove required assets or lights just to pass.

## Target and protocol

Use the actual user MacBook/browser. Record machine model/chip, browser build, power state, CSS viewport, canvas CSS size and drawing-buffer size. Test1440×900 CSS and the normal user window. A modal canvas smaller than the viewport must be reported separately. Repeat three60-second runs after loading: walking, orbit/edit/place, and Game clock with periodic indirect lighting. Include day/night and lamps on/off. Preserve resident save; use visitor only for rendering tests. Three-day survival requires the real resident separately.

## Budgets

- Normal-play cadence: median ≤16.7ms, p95 ≤20ms, p99 ≤33.34ms. Record max and frames>50ms; no repeated>100ms stalls from periodic lighting. These permit occasional missed60Hz refresh, not a guaranteed60fps claim.
- Input-to-visible response: p95≤100ms for movement, selection and placement; save feedback≤500ms. Include first interaction after focus return.
- Cold usable entry≤8s on a declared50Mbps/50ms network profile; warm entry≤3s. Initial compressed transfer≤25MiB; load catalog/assets on demand. Measure production, not localhost.
- Combined app memory target≤512MiB after the Studio settles; growth≤32MiB across ten open/edit/close cycles after cleanup. Record what the browser can measure. JS heap and resource counts alone do not prove total GPU/browser memory. Unsupported measurements remain unverified.

## Current evidence

428:625×886viewport, fixed Daylight,15-second visitor sample cadencep95=16.7ms.
429: same small viewport after duplicate moving-frame render fix, cadencep95=10.3ms. Single paired sample only.
430:1440×900viewport, actual canvas1046×540 CSS /2092×1080 buffer, Game clock,15-second sample1179frames, cadencep50=15.1ms/p95=17ms/max=33.3ms, CPUworkp95=13.6ms,0frames>33.34ms. Indirect capture visibly ran before/after measurement, but receipt has no capture counter and cannot quantify exact capture overlap. Per-render2464draws/550032triangles. Resource counts374geometries/52textures are not bytes.

No complete performance acceptance yet: missing repeated60s runs, p99, explicit capture overlap, target hardware/browser metadata, input latency, memorybytes and production loading/transfer. Evidence430 is meaningful baseline, not final pass.

484: Mac16,5 / Apple M4 Max / macOS26.5.1(25F80), AC attached76%, Codex IAB
(browser engine build not recorded). Resident stationary in shower/bathroom, Game clock,
lamps on,625×886CSS canvas1250×1772buffer,DPR2. Actual60008ms/3565frames;
cadencep50=16.7,p95=25.3,p99=33.4,max50.1ms,1frame>50ms,0>100ms.
Four captures started and completed within sample, none busy at endpoints.
CPUframeworkp95=18.4ms;3073draws,771069triangles inlastframe;434geometries,
102textures(notbytes). Evidence apps/pz-browser/evidence/484/live-60s.json.
**FAIL** p95≤20ms budget and p99≤33.34ms; this stationary small-window run is not
walking/editing or three repeated full-size runs. Keep memory/startup/latency gates open.

485: same small-window stationary resident viewpoint after compatible normal-map batching.
60005.7ms/3745frames; cadencep50=16.7,p95=25,p99=33.3,max42.9ms;0>50ms.
CPUworkp95=17.5ms. Lastframe2043draws795509triangles;289geometries132textures.
Four captures started/completed, busy at both endpoints (transient resources included).
Day16 dawn versus484predawn; no controlled pixel-identical comparison. p95 still FAILS.
Normal-map parts now batch by map/type/scale without changing UVs or normals.
