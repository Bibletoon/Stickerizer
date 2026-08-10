# Rendering Benchmark — Design

## Context

The sticker-rendering pipeline (`StickerGenerator.renderMessage`, `src/Generator/Generator.ts`)
was recently optimized (avatar as base64 data URI, `CONCURRENCY_PAGE`, `domcontentloaded`,
per-step timing via `TimeMeasurer`). There is currently no repeatable, code-level way to measure
rendering speed in isolation — the only signal is manual debug-log reading while running the full
bot against a real Telegram token. This makes it slow and error-prone to verify whether future
changes to the rendering pipeline actually help or hurt.

Goal: a standalone, code-level benchmark that exercises `StickerGenerator.renderMessage` directly,
with no dependency on the Telegram Bot API or `config.json`, so rendering-speed changes can be
measured in isolation, quickly, and repeatably (run before a change, run after, compare numbers by
eye).

## Scope

In scope: benchmarking `StickerGenerator.renderMessage` only (HTML template + puppeteer-cluster
screenshot). Out of scope: `AvatarLoader`'s real Bot API calls, `bot.sendSticker` upload,
`answerInlineQuery` — these depend on live Telegram credentials and are not part of "rendering
speed."

## Architecture

New module `src/Benchmark/`, run via a dedicated npm script (`npm run benchmark` →
`ts-node src/Benchmark/benchmark.ts`). No config file, no bot token required — the script
constructs a `StickerGenerator` directly (`StickerGenerator.create()`, same factory `index.ts`
uses) and drives it with synthetic input.

## Components

### 1. `src/TimeMeasure/CollectingTimeMeasurer.ts`

A second implementation of the existing `TimeMeasurer` interface (`src/TimeMeasure/TimeMeasurer.ts`),
alongside `LocalTimeMeasurer`. Instead of logging step durations to pino, it collects them in memory:

```ts
class CollectingTimeMeasurer implements TimeMeasurer {
    private readonly durations: Map<string, number[]> = new Map()

    SetScope(_scope: any): void {}

    Measure<T>(stepName: string, func: () => T): T {
        const start = performance.now()
        const result = func()
        this.record(stepName, performance.now() - start)
        return result
    }

    async MeasureAsync<T>(stepName: string, func: () => Promise<T>): Promise<T> {
        const start = performance.now()
        const result = await func()
        this.record(stepName, performance.now() - start)
        return result
    }

    getDurations(stepName: string): number[] {
        return this.durations.get(stepName) ?? []
    }

    private record(stepName: string, duration: number): void {
        const arr = this.durations.get(stepName) ?? []
        arr.push(duration)
        this.durations.set(stepName, arr)
    }
}
```

Passed into `StickerGenerator.renderMessage(params, timeMeasurer)` — since that method already
measures `setContent` and `screenshot` as named sub-steps (from the prior rendering-speed work),
the benchmark gets that breakdown for free, in addition to timing the overall call itself.

### 2. `src/Benchmark/Stats.ts`

Pure statistics helper, no dependencies:

```ts
type Stats = { count: number, min: number, max: number, mean: number, median: number, p95: number }

function computeStats(durations: number[]): Stats
function formatStatsRow(label: string, stats: Stats): string
```

`p95` computed on the sorted array as `sorted[Math.ceil(0.95 * n) - 1]` (clamped to valid index for
small `n`).

### 3. `src/Benchmark/scenarios.ts`

Three fixed `MessageParameters` (`src/Generator/Generator.ts`) scenarios, defined as constants:

- `shortNoAvatar` — short text, no `avatarUrl` (exercises the initial-letter fallback path)
- `shortWithAvatar` — short text, `avatarUrl` set to an embedded synthetic PNG data URI
- `longWithAvatar` — long text (multi-sentence), same synthetic avatar

The avatar is a small synthetic PNG (not a real downloaded photo) embedded as a base64 constant in
this file. This benchmarks the cost of the `<img class="avatar">` layout/paint path (50×50 box per
the template CSS) and the data-URI decode step — not the effect of exact photo byte size, since the
network-fetch cost this was previously sensitive to has already been eliminated (avatars are now
always local data URIs by the time `renderMessage` runs, both in production and in this benchmark).

### 4. `src/Benchmark/benchmark.ts`

Entry point. Constants at the top of the file (no CLI arg parsing — kept simple, edit-and-rerun):

```ts
const WARMUP_ITERATIONS = 3
const MEASURED_ITERATIONS = 20
const CONCURRENT_LEVEL = 16   // matches production maxConcurrency
const CONCURRENT_ROUNDS = 5
```

Flow:
1. `const generator = await StickerGenerator.create()`
2. **Sequential mode** — for each scenario in `scenarios.ts`:
   - Run `WARMUP_ITERATIONS` renders, discard results/timings.
   - Run `MEASURED_ITERATIONS` renders sequentially (one at a time, awaited), each with a fresh
     `CollectingTimeMeasurer`; wrap the whole `renderMessage` call in `performance.now()` timing too
     (total wall time per render, independent of the sub-step breakdown).
   - Print a console table for this scenario: total render time and the `setContent`/`screenshot`
     sub-steps, each as a `computeStats` row.
3. **Concurrent mode** — `CONCURRENT_ROUNDS` rounds of `CONCURRENT_LEVEL` simultaneous
   `renderMessage` calls (`Promise.all`), cycling through the three scenarios round-robin. Measure
   wall-clock time per round to compute throughput (renders/sec), and aggregate per-request
   latency across all rounds into `computeStats` for an overall "under load" latency table.
4. Call `generator.close()` (new method, see below) and exit.

### 5. `StickerGenerator.close()` (new method on existing class)

**File:** `src/Generator/Generator.ts`

```ts
public async close(): Promise<void> {
    await this.cluster.close()
}
```

Needed so the benchmark process can shut down the puppeteer-cluster and exit on its own; the
running bot (`index.ts`) never calls this, which is fine — it's a normal lifecycle method that was
simply never needed until now.

## Error handling

If a single render within a scenario/round throws, the benchmark logs which scenario and iteration
failed (via `console.error`, not swallowed silently) and continues with the remaining iterations —
one failed render should not abort the whole benchmark run. If a scenario ends up with zero
successful measured iterations, its stats table row is printed as "no successful runs" rather than
computing stats on an empty array.

## Testing / verification

No automated test suite exists in this repo (confirmed: `npm test` is a stub). Verification is
manual:

1. `npm run benchmark` locally — confirm it runs to completion without a Telegram token or
   `config.json`, and prints readable tables for all 3 scenarios in both sequential and concurrent
   modes.
2. `npx tsc --noEmit` / `npm run build` — must compile cleanly.
3. Sanity-check the numbers are plausible (non-zero, non-`NaN`, `setContent` + `screenshot` roughly
   sum to the total render time per scenario).
