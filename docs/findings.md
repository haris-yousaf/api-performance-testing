# Findings: API Performance Testing JSONPlaceholder

## Load Test: Pass, with a minor honest caveat

At 100 concurrent users, error rate came in at 0.13% (4 failed requests out of 3,000). A separate load test run against the same target previously completed at 0% error, so this isn't being treated as a systemic issue, most likely transient network level noise against a public API rather than anything in the test design or the target's handling of concurrency. It's reported here rather than rounded down to zero, because a performance report that quietly drops inconvenient numbers isn't a useful one.

Response times at 100 users were noticeably more variable than the 50 user baseline (P95 of 217.9ms vs 47ms on GET All Posts), which is a real signal worth more investigation in a longer engagement, though within this project's scope it didn't cross into failing territory.

## Stress Test: No Breaking Point Found at 800 Users

Stress testing progressed through 200, 400, and 800 concurrent users. The 200 and 400 user runs produced results consistent with the 800 user run, stable response times, error rate effectively at zero, so only the 800 user run is reported in full in this repo. At 800 users: 0.008% error rate (2 failures out of 24,000 requests), throughput of 377.73 req/s, and P95 of 339ms, in line with lower concurrency runs.

Testing was deliberately capped at 800 users. JSONPlaceholder is free, public, shared infrastructure, and pushing concurrency higher without a specific question to answer wasn't a responsible use of it. The absence of a breaking point here is a property of testing a CDN backed mock API, not a finding that would necessarily hold against a production system with a real database and write path. That's flagged explicitly as a limitation below.

## Spike Test: A Diagnostic Sequence, Not a Single Result

This is the part of the project that actually involved debugging, and it's worth documenting as a sequence rather than presenting a single clean number.

**Initial run.** Spiked from 50 to 250 concurrent users over 5 seconds, held for 30 seconds, dropped back to 50. Result: 23.62% error rate. Opening failed samples in View Results Tree showed the cause wasn't server side at all:

```
java.net.BindException: Address already in use: connect
```

This is a client side error, the local machine generating the load ran out of available TCP ports to open new outbound connections fast enough to keep up with 250 simultaneous connection attempts. The jp@gc visual listeners (Active Threads Over Time, Response Times Over Time, Transactions per Second) confirmed this story: failures clustered exactly in the spike window, and response times for requests that did succeed stayed stable throughout, including during the spike itself. If the server were the bottleneck, response times for successful requests would be expected to climb under pressure, not stay flat next to a wall of connection failures.

**Fix applied.** Two changes together: reduced the spike size from 250 to 150 concurrent threads (250 simultaneous new connections from a single consumer machine was beyond what the local environment could reliably generate, independent of what the server could handle), and added `httpclient4.time_to_live=1000` and `httpclient4.idletimeout=1000` to `user.properties` so connections release and get reused faster instead of sitting idle and holding ports open.

**Result after the fix:** error rate dropped from 23.62% to 0.20%, a 99% reduction in failures. The remaining errors are not spread evenly across the test, all 86 failures, and the only remaining 21-second outlier, are isolated to the GET All Posts endpoint specifically. GET Single Post and Create Post both completed this run at 0.00% error. That pattern points to one specific slow or hung connection during the spike window for that endpoint, rather than the port exhaustion issue persisting in a diluted form.

**Why this matters more than a clean result would have.** Between these two runs there was an intermediate attempt that adjusted the thread schedule and reduced the error rate partway (to roughly 6%) without fully resolving it. That run isn't included in this repo because the exact configuration used wasn't recorded at the time, a process gap worth naming directly. The lesson taken from it: when a fix only partially works, the instinct should be to question whether the fix was applied correctly and completely before declaring it a smaller version of the same problem. The version of the fix that's documented here, reduced spike size plus the connection property changes, applied together and verified against a clean thread schedule, is the one that actually resolved the issue.

## Limitations of This Project

- **Single local load generator.** All tests ran from one machine. At very high concurrency the generator itself can become a bottleneck before the target system does, which is exactly what the initial spike test demonstrated. A more rigorous setup would distribute load generation across multiple machines or use a cloud based injector.
- **Target API has no real backend cost.** JSONPlaceholder doesn't persist writes or enforce authentication, so POST requests don't carry the database write cost, lock contention, or session overhead a real API would. Response times here represent a best case scenario.
- **No sustained soak test.** Memory leaks and slow resource exhaustion only show up over hours of sustained load, which wasn't practical to run against shared public infrastructure for this project.
- **Configuration tracking gap.** The intermediate spike test attempt (discussed above) wasn't recorded in enough detail to reproduce or report. Lesson taken forward into later projects: save or screenshot the exact thread group configuration alongside every results export, not just the final one.

## Recommendations (if this were a real production system)

- Re-run the stress test against a staging environment with a real database to find an actual breaking point, since none was found here.
- Re-run the spike test from a cloud based load injector to remove the client side bottleneck entirely and get a true picture of server side spike behavior at higher intensities than 150 concurrent users.
- Investigate the isolated GET All Posts failures and the recurring ~21 second outlier specifically, rather than treating the overall 0.20% error rate as fully explained.
- Add a soak test (4+ hours at moderate load) to check for gradual degradation or memory leaks, which none of the tests in this project were designed to catch.

---

## v2 Findings: Think Time and Traffic Distribution

### What v2 was testing

The v2 update introduced two meaningful changes to the test design: a Gaussian Random Timer (500ms ± 200ms) between requests to simulate real user think time, and Throughput Controllers distributing traffic 60/30/10 across GET All Posts, GET Single Post, and Create Post respectively. The goal was to make the simulation more realistic and demonstrate a wider range of JMeter capability, not to produce a better result than v1.

### Baseline and Load Test: Clean

Both v2 baseline (50 users) and v2 load test (100 users) completed at 0% error rate. Response time averages are approximately 500ms higher than their v1 equivalents across all endpoints. This is entirely attributable to the Gaussian timer delay being included in JMeter's sampler elapsed time measurement, not to any change in server behaviour. The meaningful comparison within v2 is between test types, not against v1 absolute numbers.

Throughput at 100 users (13.49 req/s total) is lower than v1's 47.64 req/s at the same user count, again because each thread now spends time waiting between requests rather than firing continuously. Lower throughput with think time active is the correct and expected result.

### Stress Test: Incomplete, but Instructive

The 200-user stress run was force-stopped before completion. The visible symptoms were thread queue buildup and a test that appeared to stall after accumulating 1,977 samples. The numbers that did complete tell an interesting story: median response time was 726ms (close to baseline) while the mean was 2,738ms, and the max was 786,440ms (13 minutes). The extreme divergence between median and mean means the majority of requests completed normally, but a small number of threads hung for very long periods before timing out.

The root cause is the interaction between high concurrency and think time. At 200 users with a 500ms timer on every request, threads hold connections for longer than in v1. On a public API with variable server-side latency, some connections queue up behind slow responses rather than cycling quickly. At 100 users this self-resolves within the test run. At 200 users on this particular public target the queuing compounded until the test became practically unrunnable without a force stop.

This is a real and useful finding. It shows that adding think time to a test doesn't just make results more realistic, it also changes what thread counts are feasible on a given machine against a given target. In a production performance testing engagement this would lead to either distributing load across multiple generators or tuning thread counts down and running longer to achieve the same total request volume.

The stress test results are included in this repo for transparency with this explanation attached, rather than omitted to preserve a clean narrative.

### Spike Test: Cleaner Than v1 Despite Outliers

The v2 spike test completed with 0.11% error rate across 13,951 samples. The extreme max response times (402,450ms for GET All Posts and GET Single Post) are single outlier connections, almost certainly one hung thread per endpoint during the spike window. The median of 42ms across the total tells the real story: the vast majority of requests during the spike completed quickly, and the Gaussian timer actually helped here by spreading request timing slightly rather than every thread firing simultaneously at the spike boundary.

The lower error rate compared to v1's initial spike run (0.11% vs 23.62%) is partly explained by the think time spreading concurrent connection demand more naturally across the spike window, reducing the port exhaustion pressure that caused v1's failures.
