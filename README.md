# API Performance Testing JSONPlaceholder

Performance testing project covering load, stress, and spike testing of a public REST API, built with Apache JMeter as part of a self-directed SQA performance testing roadmap.

This project was built independently outside of my day to day SQA internship work, where performance testing isn't currently part of the team's scope. The goal was to build a working understanding of performance testing methodology from the ground up and produce evidence of it, not just claim it on a resume.

## Target API

[JSONPlaceholder](https://jsonplaceholder.typicode.com) a free, public, CDN backed mock REST API. Chosen specifically because it has no authentication and no rate limiting, which removes noise from the results and keeps the focus on JMeter mechanics and performance analysis rather than fighting a flaky test server.

Endpoints tested:

| Endpoint | Method | Purpose |
|---|---|---|
| `/posts` | GET | Read a collection |
| `/posts/1` | GET | Read a single resource |
| `/posts` | POST | Write operation |

## Versions

This repo documents two iterations of the same test suite:

- **v1**: baseline, load, stress (3 runs up to 800 users), spike. Covers the core test types with assertions and CSV parameterization.
- **v2**: same test types with a Gaussian Random Timer (think time), Throughput Controllers (realistic traffic distribution), and Duration Assertions removed. Documents what changes when you make a simulation more realistic and what new constraints that introduces.

Both versions are documented in `docs/` under clearly labelled sections rather than separate files.

## Tools

- Apache JMeter 5.6
- jp@gc Ultimate Thread Group plugin (for the spike test ramp-spike-recover pattern)
- CSV Data Set Config (request parameterization)
- JMeter CLI HTML Dashboard Report generator

## Test types covered

| Test Type | Question it answers |
|---|---|
| Baseline | What does normal single-pass performance look like? |
| Load Test | Does the system handle expected concurrent traffic cleanly? |
| Stress Test | At what point, if any, does the system start to degrade or fail? |
| Spike Test | What happens when traffic suddenly surges and then drops back to normal? |

Full methodology, thread group configuration, and pass/fail criteria for each are documented in [`docs/test-plan.md`](docs/test-plan.md).

## Key findings

**v2 (with think time and traffic distribution)**

- Gaussian Random Timer (500ms ± 200ms) raised average response times by ~500ms vs v1 across all endpoints, as expected, since timer delay is included in JMeter's elapsed time measurement.
- Throughput Controllers confirmed working correctly: 60/30/10 sample split verified against total sample counts on every run.
- Stress test at 200 users with think time active caused thread queue buildup and was force-stopped. Documented honestly rather than omitted: adding think time changes what concurrency levels are feasible on a single local machine against a public API.
- Spike test completed at 0.11% error rate, cleaner than v1's initial spike run, partly because think time spreads concurrent connection demand more naturally across the spike window.

**v1 (baseline)**

- Load test at 100 concurrent users ran with a 0.13% error rate (4 failed requests out of 3,000), most likely transient network noise against a public API rather than a systemic issue, and is reported as observed rather than rounded down to zero.
- Stress testing scaled from 200 to 800 concurrent users with throughput scaling almost linearly and no breaking point found. Documented as a property of JSONPlaceholder's CDN backed infrastructure rather than a finding about the test methodology.
- Spike testing initially returned a 22% error rate. Root cause analysis traced this to local TCP port exhaustion on the test machine (`java.net.BindException`), not server side failure. After tuning HTTP client connection properties and adjusting spike intensity, the re run dropped error rate to 0.37%. Both runs are kept in this repo deliberately. The full diagnostic story is in [`docs/findings.md`](docs/findings.md).

Full numbers for every run are in [`docs/results-summary.md`](docs/results-summary.md).

## Repo structure

```
api-performance-testing/
├── jmeter/        JMeter test plans (.jmx files)
├── reports/       Generated HTML dashboard reports and raw .jtl result files
├── docs/
│   ├── test-plan.md         Methodology, scope, thread group configs, pass/fail criteria
│   ├── results-summary.md   Full metrics tables for every test run
│   └── findings.md          Analysis, the spike test diagnostic story, recommendations
└── README.md
```

## How to reproduce

1. Install [Apache JMeter](https://jmeter.apache.org/download_jmeter.cgi) and the [jp@gc Ultimate Thread Group plugin](https://jmeter-plugins.org/) via the Plugins Manager.
2. Open any `.jmx` file from `jmeter/` in JMeter.
3. Run the test plan. Results write to `reports/`.
4. To generate an HTML dashboard from a result file:
   ```bash
   jmeter -g reports/<result-file>.jtl -o reports/<output-folder-name>
   ```

## What I'd do differently on a real production system

JSONPlaceholder's stability is also its limitation. It's intentionally hard to break, which means the stress test couldn't surface a true breaking point and the spike test's main finding ended up being about the test machine rather than the server. Against a real backend with a database and authentication, I'd expect to see actual degradation curves, connection pool exhaustion, and response time cliffs. That comparison is exactly why the next project in this series tests a real authenticated web app instead of a mock API. See [haris-yousaf/web-app-performance-testing](#) (link added once published).
