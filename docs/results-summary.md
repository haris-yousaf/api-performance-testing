# Results Summary: API Performance Testing JSONPlaceholder

All times in milliseconds unless stated otherwise. Throughput in requests/second. P90/P95/P99 represent the response time under which that percentage of requests completed.

## Baseline (50 users, 30s ramp up, 5 loops)

| Endpoint | Samples | Average | Median | P90 | P95 | P99 | Min | Max | Error % | Throughput |
|---|---|---|---|---|---|---|---|---|---|---|
| GET All Posts | 250 | 21.79 | 12 | 42 | 47 | 58.98 | 8 | 144 | 0.00% | 8.10 |
| GET Single Post | 250 | 8.04 | 8 | 9 | 10 | 15.49 | 6 | 30 | 0.00% | 8.11 |
| Create Post | 250 | 333.47 | 331 | 334 | 339.45 | 407.21 | 329 | 474 | 0.00% | 8.03 |
| **Total** | **750** | **121.10** | **12** | **332** | **333** | **360.80** | **6** | **474** | **0.00%** | **24.03** |

## Load Test (100 users, 60s ramp up, 10 loops)

| Endpoint | Samples | Average | Median | P90 | P95 | P99 | Min | Max | Error % | Throughput |
|---|---|---|---|---|---|---|---|---|---|---|
| GET All Posts | 1,000 | 45.87 | 23.5 | 92.8 | 217.9 | 393.75 | 8 | 1,383 | 0.30% | 15.84 |
| GET Single Post | 1,000 | 22.57 | 8 | 57.9 | 82.9 | 248.92 | 6 | 1,077 | 0.10% | 15.85 |
| Create Post | 1,000 | 355.87 | 335 | 397 | 460 | 648.98 | 331 | 1,369 | 0.00% | 15.77 |
| **Total** | **3,000** | **141.43** | **32** | **338** | **381.80** | **544.99** | **6** | **1,383** | **0.13%** | **47.26** |

Note: this run showed a small, non-zero error rate (4 out of 3,000 requests). A prior load test run against the same target completed with 0% error, so this looks like transient network level noise on a public API rather than a systemic problem, but it's reported as observed rather than rounded down to zero.

## Stress Test (800 concurrent users)

Stress testing was run progressively at 200, then 400, then 800 concurrent users. The 200 and 400 user runs produced results consistent with the 800 user run below (0% to near-0% error, stable response times, throughput scaling close to linearly with user count), so only the final 800 user run is reported in detail here. Testing was capped at 800 users deliberately, JSONPlaceholder is a free, public, shared API, and continuing to push concurrency higher without a clear research need wasn't a responsible use of shared infrastructure.

| Endpoint | Samples | Average | Median | P90 | P95 | P99 | Min | Max | Error % | Throughput |
|---|---|---|---|---|---|---|---|---|---|---|
| GET All Posts | 8,000 | 26.62 | 20 | 46 | 56 | 105.98 | 8 | 1,047 | 0.025% | 126.58 |
| GET Single Post | 8,000 | 11.03 | 9 | 18 | 23 | 43.99 | 5 | 316 | 0.00% | 126.67 |
| Create Post | 8,000 | 337.41 | 329 | 344 | 367 | 560.98 | 320 | 961 | 0.00% | 126.05 |
| **Total** | **24,000** | **125.02** | **26** | **334** | **339** | **420** | **5** | **1,047** | **0.008%** | **377.73** |

No breaking point was found at 800 concurrent users. Error rate stayed effectively at zero (2 errors out of 24,000 requests) and response times remained stable.

## Spike Test

### Run 1: Initial (50 to 250 user spike)

| Endpoint | Samples | Average | Median | P90 | P95 | P99 | Min | Max | Error % | Throughput |
|---|---|---|---|---|---|---|---|---|---|---|
| GET All Posts | 27,842 | 188.44 | 92 | 282.9 | 352 | 1,167.98 | 0 | 21,377 | 25.97% | 132.41 |
| GET Single Post | 27,718 | 50.65 | 36 | 128 | 153 | 208 | 0 | 21,200 | 23.23% | 138.01 |
| Create Post | 27,652 | 310.12 | 337 | 437 | 502 | 676 | 0 | 7,709 | 21.64% | 138.15 |
| **Total** | **83,212** | **182.98** | **32** | **344** | **433** | **675.99** | **0** | **21,377** | **23.62%** | **395.75** |

Failures traced to `java.net.BindException: Address already in use` on the test machine during the spike window, client side TCP port exhaustion, not a server side failure.

### Run 2: Fixed (50 to 150 user spike, tuned HTTP client properties)

Thread schedule used for this run (jp@gc Ultimate Thread Group):

| Phase | Start Threads | Initial Delay | Startup Time | Hold For | Shutdown |
|---|---|---|---|---|---|
| Normal | 50 | 0s | 10s | 30s | 0s |
| Spike | 150 | 40s | 5s | 30s | 5s |
| Recovery | 50 | 80s | 5s | 30s | 0s |

| Endpoint | Samples | Average | Median | P90 | P95 | P99 | Min | Max | Error % | Throughput |
|---|---|---|---|---|---|---|---|---|---|---|
| GET All Posts | 14,166 | 184.81 | 67 | 142 | 177 | 1,051 | 23 | 21,347 | 0.607% | 123.47 |
| GET Single Post | 14,094 | 27.24 | 19 | 60 | 74.25 | 109.05 | 5 | 419 | 0.00% | 122.88 |
| Create Post | 14,089 | 413.41 | 358 | 605 | 693.5 | 898.30 | 323 | 1,493 | 0.00% | 122.06 |
| **Total** | **42,349** | **208.42** | **70** | **441** | **596** | **905** | **5** | **21,347** | **0.20%** | **366.72** |

Error rate dropped from 23.62% to 0.20% after reducing spike intensity from 250 to 150 concurrent users and tuning `httpclient4.time_to_live` and `httpclient4.idletimeout` in JMeter's `user.properties`. Notably, all 86 remaining errors are concentrated entirely in the GET All Posts endpoint (0.607% error rate there specifically), while GET Single Post and Create Post both completed at 0.00% error. The single 21,347ms outlier also belongs to GET All Posts. This points to one specific slow or hung connection during the spike window rather than a systemic issue across the test.

---

## v2 Results (Gaussian Random Timer + Throughput Controllers)

All v2 tests use a Gaussian Random Timer (500ms constant delay, 200ms deviation) and Throughput Controllers splitting traffic 60% GET All Posts / 30% GET Single Post / 10% Create Post. Response time averages are higher than v1 by approximately 500ms across the board due to think time being included in JMeter's sampler elapsed time. This is expected behavior, not degradation.

Duration Assertions were removed for v2. Response Assertions (HTTP status code checks) remain active.

### v2 Baseline (50 users, 30s ramp-up, 5 loops, 250 total samples)

| Endpoint | Samples | Average | Median | P90 | P95 | P99 | Min | Max | Error % | Throughput |
|---|---|---|---|---|---|---|---|---|---|---|
| GET All Posts | 150 | 778ms | 746ms | 907ms | 1,174ms | 2,008ms | 257 | 2,198 | 0.00% | 4.24 |
| GET Single Post | 75 | 698ms | 714ms | 771ms | 814ms | 1,639ms | 230 | 1,639 | 0.00% | 2.20 |
| Create Post | 25 | 787ms | 808ms | 880ms | 918ms | 924ms | 331 | 924 | 0.00% | 0.77 |
| **Total** | **250** | **755ms** | **740ms** | **860ms** | **951ms** | **1,776ms** | **230** | **2,198** | **0.00%** | **7.02** |

Sample split confirms 60/30/10 Throughput Controller distribution is working correctly.

### v2 Load Test (100 users, 60s ramp-up, 10 loops, 1,000 total samples)

| Endpoint | Samples | Average | Median | P90 | P95 | P99 | Min | Max | Error % | Throughput |
|---|---|---|---|---|---|---|---|---|---|---|
| GET All Posts | 600 | 726ms | 736ms | 784ms | 959ms | 1,587ms | 257 | 1,924 | 0.00% | 8.22 |
| GET Single Post | 300 | 696ms | 710ms | 748ms | 867ms | 1,648ms | 227 | 1,718 | 0.00% | 4.15 |
| Create Post | 100 | 794ms | 807ms | 836ms | 989ms | 1,551ms | 324 | 1,553 | 0.00% | 1.42 |
| **Total** | **1,000** | **724ms** | **732ms** | **812ms** | **957ms** | **1,587ms** | **227** | **1,924** | **0.00%** | **13.49** |

0% error rate. Response times flat compared to v2 baseline, throughput nearly doubled in line with user count doubling.

### v2 Stress Test (200 users, 60s ramp-up — incomplete run)

| Endpoint | Samples | Average | Median | P90 | P95 | P99 | Min | Max | Error % | Throughput |
|---|---|---|---|---|---|---|---|---|---|---|
| GET All Posts | 1,186 | 3,840ms | 734ms | 952ms | 1,675ms | 47,309ms | 9 | 786,440 | 0.51% | 1.41 |
| GET Single Post | 593 | 1,105ms | 707ms | 810ms | 1,268ms | 21,070ms | 7 | 53,668 | 0.17% | 5.03 |
| Create Post | 198 | 1,023ms | 801ms | 834ms | 1,008ms | 21,315ms | 248 | 21,324 | 0.00% | 1.71 |
| **Total** | **1,977** | **2,738ms** | **726ms** | **927ms** | **1,399ms** | **21,083ms** | **7** | **786,440** | **0.35%** | **2.34** |

This run was force-stopped before completion. See v2 findings for full explanation. Results are included for transparency but should not be treated as a definitive stress test outcome.

### v2 Spike Test (50 base / 150 spike, with Gaussian timer)

Thread schedule:

| Phase | Start Threads | Initial Delay | Startup Time | Hold | Shutdown |
|---|---|---|---|---|---|
| Normal | 50 | 0s | 10s | 100s | 0s |
| Spike | 150 | 40s | 5s | 30s | 5s |

| Endpoint | Samples | Average | Median | P90 | P95 | P99 | Min | Max | Error % | Throughput |
|---|---|---|---|---|---|---|---|---|---|---|
| GET All Posts | 8,408 | 495ms | 42ms | 502ms | 520ms | 1,096ms | 24 | 402,450 | 0.10% | 19.15 |
| GET Single Post | 4,181 | 299ms | 35ms | 477ms | 493ms | 1,062ms | 6 | 402,143 | 0.14% | 9.53 |
| Create Post | 1,362 | 410ms | 279ms | 572ms | 594ms | 1,314ms | 246 | 23,523 | 0.07% | 12.77 |
| **Total** | **13,951** | **428ms** | **42ms** | **497ms** | **523ms** | **1,096ms** | **6** | **402,450** | **0.11%** | **31.77** |

0.11% error rate. The extreme max values (402,450ms) are single outlier connections, not representative of typical behaviour. Median of 42ms confirms the majority of requests completed quickly.
