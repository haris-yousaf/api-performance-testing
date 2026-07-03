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
