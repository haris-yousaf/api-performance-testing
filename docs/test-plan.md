# Test Plan: API Performance Testing JSONPlaceholder

## 1. Objective

Evaluate the performance characteristics of a public REST API under varying load conditions using Apache JMeter, and build hands on competency in the core categories of performance testing: load, stress, and spike.

## 2. Scope

**In scope**

- GET `/posts` (collection read)
- GET `/posts/1` (single resource read)
- POST `/posts` (write operation)
- Response time, throughput, and error rate analysis across all four test types
- Use of assertions to validate functional correctness alongside performance
- Use of CSV parameterization to vary request payloads across virtual users

**Out of scope**

- Authentication / authorization flows (JSONPlaceholder has none)
- Database level performance analysis (JSONPlaceholder does not persist writes)
- Soak / endurance testing (multi hour runs), covered conceptually but not executed in this project

## 3. Test Environment

| Item | Detail |
|---|---|
| Target | `https://jsonplaceholder.typicode.com` |
| Test tool | Apache JMeter 5.6, run locally |
| Load generator location | Single local machine (Windows) |
| Network | Standard residential internet connection |

A single local machine as the load generator is a known limitation: at high concurrency, the generating machine's own resources (CPU, available TCP ports) can become the bottleneck before the target server does. This is discussed directly in the spike test findings.

## 4. Tools Used

- Apache JMeter
- jp@gc Ultimate Thread Group plugin, used for the spike test to define a ramp up, hold, spike, recover pattern in a single thread group
- HTTP Header Manager
- CSV Data Set Config
- Response Assertion and Duration Assertion
- View Results Tree, Summary Report, and Aggregate Report listeners during test design
- jp@gc Active Threads Over Time, Response Times Over Time, and Transactions per Second listeners during the spike test, to visually inspect behaviour before, during, and after the spike (the Aggregate Report alone does not show this)

## 5. Test Types and Design

### 5.1 Baseline

Purpose: establish a reference point for normal, low concurrency performance before any load is applied.

| Setting | Value |
|---|---|
| Threads (users) | 50 |
| Ramp up period | 30 seconds |
| Loop count | 5 |
| Total requests per endpoint | 250 |

### 5.2 Load Test

Purpose: confirm the system handles expected peak concurrent traffic without errors or meaningful degradation.

| Setting | Value |
|---|---|
| Threads (users) | 100 |
| Ramp up period | 60 seconds |
| Loop count | 10 |
| Total requests per endpoint | 1,000 |

### 5.3 Stress Test

Purpose: incrementally increase load to identify the point at which error rate rises above 5% or P95 response time exceeds 2,000ms.

Run in three sequential steps, each a clean run with cleared listeners:

| Run | Threads | Ramp up | Loop count | Requests per endpoint |
|---|---|---|---|---|
| Run 1 | 200 | 60s | 10 | 2,000 |
| Run 2 | 400 | 60s | 10 | 4,000 |
| Run 3 | 800 | 60s | 10 | 8,000 |

The 200 and 400 user runs produced results consistent with the 800 user run (stable response times, error rate effectively zero), so this repo reports the 800 user run in full and summarizes the lower concurrency runs rather than including three near identical result sets. Testing was capped at 800 users deliberately, given JSONPlaceholder is shared public infrastructure.

### 5.4 Spike Test

Purpose: simulate a sudden, short surge in traffic (5x normal) and observe whether the system recovers cleanly once the surge ends.

Built using the jp@gc Ultimate Thread Group plugin since a standard Thread Group cannot express a ramp-hold-spike-drop-hold pattern in a single run.

**Run 1 (initial)**

| Phase | Start Threads | Initial Delay | Startup Time | Hold | Shutdown |
|---|---|---|---|---|---|
| Normal | 50 | 0s | 30s | 60s | 0 |
| Spike | 250 | 90s | 5s | 30s | 5s |
| Recovery | 50 | 0s | 10s | 60s | 0 |

Result: 23.62% error rate, root caused to client side TCP port exhaustion (`java.net.BindException`), documented in `findings.md`.

**Run 2 (corrected)**

Same ramp-hold-spike-recover shape, with two changes made after diagnosing Run 1:

- Spike peak reduced from 250 to 150 concurrent threads, since the original spike size exceeded what a single local machine could reliably generate
- `httpclient4.time_to_live=1000` and `httpclient4.idletimeout=1000` added to `user.properties` to free up connections faster

| Phase | Start Threads | Initial Delay | Startup Time | Hold | Shutdown |
|---|---|---|---|---|---|
| Normal | 50 | 0s | 10s | 30s | 0 |
| Spike | 150 | 40s | 5s | 30s | 5s |
| Recovery | 50 | 80s | 5s | 30s | 0 |

Result: 0.20% error rate, with remaining errors isolated entirely to the GET All Posts endpoint. An intermediate attempt between these two runs reduced the error rate to roughly 6% without a recorded configuration; it is not included in this repo since it could not be reliably reproduced or reported. See `findings.md` for the full diagnostic narrative.

## 6. Assertions Used

Applied to every HTTP request in the Load, Stress, and Spike thread groups:

- **Response Assertion**: response code must equal `200` for GET requests, `201` for the POST request. Without this, JMeter treats any HTTP response (including error pages) as a pass.
- **Duration Assertion**: response time must be under 2,000ms for GET requests, under 1,000ms for the POST request, based on observed baseline performance with reasonable headroom.

## 7. Parameterization

A CSV file (`test-data.csv`) feeds varying `firstname`, `lastname`, and `totalprice` values into the POST `/posts` request body, so that virtual users send distinct payloads rather than 100 identical requests. Configured via CSV Data Set Config with `Recycle on EOF` enabled, since the dataset (5 rows) is smaller than the thread count.

## 8. Pass / Fail Criteria

| Test | Pass condition |
|---|---|
| Load Test | Error rate at or near 0% (low single-digit failures attributable to transient public-network noise are acceptable), P95 response time within baseline range |
| Stress Test | Error rate stays under 5% and P95 stays under 2,000ms at the given user count; breaking point is the first run where either threshold is crossed |
| Spike Test | System returns to baseline level response times after the spike ends, error rate during/after spike attributable to a clearly identified root cause |

---

## 9. v2 Enhancements

After completing the initial test suite, the test plan was updated to introduce three additional JMeter elements that make the simulation more realistic and demonstrate a wider range of tool capability.

### What changed and why

**Gaussian Random Timer**

Added at Thread Group level so it applies to all requests in every Thread Group.

| Setting | Value |
|---|---|
| Constant Delay | 500ms |
| Deviation | 200ms |

This means each virtual user waits between 300ms and 700ms before firing each request. The v1 tests had zero think time, every thread fired requests back to back as fast as the server could respond. Real users don't behave that way. The timer introduces the pause between actions that makes concurrent load simulation meaningful.

Direct consequence: all v2 response time averages are higher than v1 by roughly 500ms. This is expected and correct, not a regression. The timer delay is included in JMeter's sampler elapsed time, so it inflates averages relative to v1. The important comparison is error rate and relative degradation across test types, not absolute response time vs v1.

**Throughput Controller (Percent Executions mode)**

Three Throughput Controllers replace the flat equal-split request structure from v1:

| Controller | Endpoints covered | Weight |
|---|---|---|
| Throughput Controller 1 | GET All Posts | 60% |
| Throughput Controller 2 | GET Single Post | 30% |
| Throughput Controller 3 | Create Post | 10% |

This reflects a realistic API traffic distribution: collection reads are the most common operation, single resource reads are moderately common, and write operations are the minority. In v1 all three endpoints received equal traffic regardless of realistic usage patterns.

Sample count verification: at 50 users / 5 loops (250 total samples), the split produces 150 / 75 / 25 samples per endpoint, confirming the 60/30/10 distribution is working correctly.

**Duration Assertion removal**

The Duration Assertions from v1 (2,000ms threshold on GET, 1,000ms on POST) were removed for v2. With a 500ms Gaussian timer added to every request, any server response taking more than 1,500ms would trigger the assertion even if the server itself responded well within acceptable time. This would produce misleading failures attributable to test design rather than server behaviour. Response Assertions (HTTP status code checks) were kept, as these remain valid regardless of think time.

### v2 Thread Group Configurations

**Baseline:** 50 users, 30s ramp-up, 5 loops (250 total samples at 60/30/10 split)

**Load Test:** 100 users, 60s ramp-up, 10 loops (1,000 total samples per endpoint group)

**Stress Test:** 200 users, 60s ramp-up, 10 loops. Note: this run was force-stopped before completion due to thread queue buildup at 200 users with think time active. See findings for full explanation.

**Spike Test (jp@gc Ultimate Thread Group):**

| Phase | Start Threads | Initial Delay | Startup Time | Hold | Shutdown |
|---|---|---|---|---|---|
| Normal | 50 | 0s | 10s | 100s | 0s |
| Spike | 150 | 40s | 5s | 30s | 5s |

| Test | Pass condition |
|---|---|
| Load Test | Error rate at or near 0% (low single-digit failures attributable to transient public-network noise are acceptable), P95 response time within baseline range |
| Stress Test | Error rate stays under 5% and P95 stays under 2,000ms at the given user count; breaking point is the first run where either threshold is crossed |
| Spike Test | System returns to baseline level response times after the spike ends, error rate during/after spike attributable to a clearly identified root cause |
