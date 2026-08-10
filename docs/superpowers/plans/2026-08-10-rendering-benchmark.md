# Rendering Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone, code-level benchmark (`npm run benchmark`) that exercises `StickerGenerator.renderMessage` in isolation — no Telegram Bot API, no `config.json` — so rendering-speed changes can be measured repeatably.

**Architecture:** A new `src/Benchmark/` module drives the existing `StickerGenerator` with fixed synthetic scenarios, in both sequential (per-request latency) and concurrent (throughput under load, matching production's `maxConcurrency: 16`) modes. Timing data is collected via a new `TimeMeasurer` implementation (`CollectingTimeMeasurer`) that records durations in memory instead of logging them, reusing the existing per-step (`setContent`/`screenshot`) instrumentation already wired into `StickerGenerator.renderMessage`.

**Tech Stack:** TypeScript, `puppeteer-cluster` (existing), Node's built-in `performance.now()` and `assert` module — no new runtime dependencies.

## Global Constraints

- No new runtime npm dependencies — only already-present packages and Node built-ins.
- No CLI argument parsing — tunable knobs are constants at the top of `benchmark.ts`, edited by hand.
- No persisted benchmark result files — console output only, "before/after" comparison is manual.
- The benchmark must run standalone: no `config.json`, no Telegram bot token.
- This repo has no test framework configured (`npm test` is a stub). New utility code (`CollectingTimeMeasurer`, `Stats.ts`) is verified with small temporary scripts using Node's built-in `assert` module, run via `ts-node`, then deleted before committing — do not add jest/mocha/vitest.

Spec reference: `docs/superpowers/specs/2026-08-10-rendering-benchmark-design.md`

---

### Task 1: `CollectingTimeMeasurer`

**Files:**
- Create: `src/TimeMeasure/CollectingTimeMeasurer.ts`
- Temporary (delete before commit): `verify-collecting-time-measurer.ts` (repo root)

**Interfaces:**
- Consumes: `TimeMeasurer` interface (`src/TimeMeasure/TimeMeasurer.ts`) — `SetScope(scope: any): void`, `Measure<T>(stepName: string, func: () => T): T`, `MeasureAsync<T>(stepName: string, func: () => Promise<T>): Promise<T>`.
- Produces: `class CollectingTimeMeasurer implements TimeMeasurer` (default export) with an additional method `getDurations(stepName: string): number[]` — returns all recorded durations (ms) for that step name, in call order, or `[]` if the step was never recorded.

- [ ] **Step 1: Write the temporary verification script**

Create `verify-collecting-time-measurer.ts` at the repo root:

```ts
import assert from "assert"
import CollectingTimeMeasurer from "./src/TimeMeasure/CollectingTimeMeasurer"

async function main() {
    const measurer = new CollectingTimeMeasurer()

    const syncResult = measurer.Measure("syncStep", () => 42)
    assert.strictEqual(syncResult, 42)

    const asyncResult = await measurer.MeasureAsync("asyncStep", async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
        return "done"
    })
    assert.strictEqual(asyncResult, "done")

    await measurer.MeasureAsync("asyncStep", async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
    })

    const syncDurations = measurer.getDurations("syncStep")
    assert.strictEqual(syncDurations.length, 1)
    assert.ok(syncDurations[0] >= 0)

    const asyncDurations = measurer.getDurations("asyncStep")
    assert.strictEqual(asyncDurations.length, 2)
    assert.ok(asyncDurations[0] >= 15, `expected >=15ms, got ${asyncDurations[0]}`)
    assert.ok(asyncDurations[1] >= 15, `expected >=15ms, got ${asyncDurations[1]}`)

    assert.deepStrictEqual(measurer.getDurations("unknownStep"), [])

    console.log("CollectingTimeMeasurer: all checks passed")
}

main()
```

- [ ] **Step 2: Run it to confirm it fails (module doesn't exist yet)**

Run: `npx ts-node verify-collecting-time-measurer.ts`
Expected: TypeScript error — `Cannot find module './src/TimeMeasure/CollectingTimeMeasurer'`

- [ ] **Step 3: Implement `CollectingTimeMeasurer`**

Create `src/TimeMeasure/CollectingTimeMeasurer.ts`:

```ts
import TimeMeasurer from "./TimeMeasurer";

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

export default CollectingTimeMeasurer
```

- [ ] **Step 4: Run the verification script to confirm it passes**

Run: `npx ts-node verify-collecting-time-measurer.ts`
Expected: prints `CollectingTimeMeasurer: all checks passed`, exit code 0.

- [ ] **Step 5: Delete the temporary script and commit**

```bash
rm verify-collecting-time-measurer.ts
git add src/TimeMeasure/CollectingTimeMeasurer.ts
git commit -m "Feat: add CollectingTimeMeasurer for in-memory timing collection"
```

---

### Task 2: `Stats` helper

**Files:**
- Create: `src/Benchmark/Stats.ts`
- Temporary (delete before commit): `verify-stats.ts` (repo root)

**Interfaces:**
- Consumes: nothing from other tasks — pure function module.
- Produces: `type Stats = {count: number, min: number, max: number, mean: number, median: number, p95: number}`, `function computeStats(durations: number[]): Stats`, `function formatStatsRow(label: string, stats: Stats): string` (all named exports). `computeStats([])` returns `{count: 0, min: 0, max: 0, mean: 0, median: 0, p95: 0}`.

- [ ] **Step 1: Write the temporary verification script**

Create `verify-stats.ts` at the repo root:

```ts
import assert from "assert"
import {computeStats, formatStatsRow} from "./src/Benchmark/Stats"

const stats = computeStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
assert.strictEqual(stats.count, 10)
assert.strictEqual(stats.min, 1)
assert.strictEqual(stats.max, 10)
assert.strictEqual(stats.mean, 5.5)
assert.strictEqual(stats.median, 5.5)
assert.strictEqual(stats.p95, 10)

const oddStats = computeStats([5, 1, 3])
assert.strictEqual(oddStats.median, 3)
assert.strictEqual(oddStats.min, 1)
assert.strictEqual(oddStats.max, 5)

const emptyStats = computeStats([])
assert.strictEqual(emptyStats.count, 0)
assert.strictEqual(emptyStats.min, 0)
assert.strictEqual(emptyStats.max, 0)
assert.strictEqual(emptyStats.mean, 0)
assert.strictEqual(emptyStats.median, 0)
assert.strictEqual(emptyStats.p95, 0)

const row = formatStatsRow("test", stats)
assert.ok(row.includes("test"))

console.log("Stats: all checks passed")
```

- [ ] **Step 2: Run it to confirm it fails (module doesn't exist yet)**

Run: `npx ts-node verify-stats.ts`
Expected: TypeScript error — `Cannot find module './src/Benchmark/Stats'`

- [ ] **Step 3: Implement `Stats`**

Create `src/Benchmark/Stats.ts`:

```ts
type Stats = {
    count: number
    min: number
    max: number
    mean: number
    median: number
    p95: number
}

function computeStats(durations: number[]): Stats {
    if (durations.length === 0) {
        return {count: 0, min: 0, max: 0, mean: 0, median: 0, p95: 0}
    }

    const sorted = [...durations].sort((a, b) => a - b)
    const count = sorted.length
    const min = sorted[0]
    const max = sorted[count - 1]
    const mean = sorted.reduce((sum, d) => sum + d, 0) / count
    const mid = Math.floor(count / 2)
    const median = count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    const p95Index = Math.min(count - 1, Math.ceil(0.95 * count) - 1)
    const p95 = sorted[p95Index]

    return {count, min, max, mean, median, p95}
}

function formatStatsRow(label: string, stats: Stats): string {
    const fmt = (n: number) => n.toFixed(1).padStart(8)
    return `${label.padEnd(24)} n=${String(stats.count).padStart(3)}  min=${fmt(stats.min)}ms  mean=${fmt(stats.mean)}ms  median=${fmt(stats.median)}ms  p95=${fmt(stats.p95)}ms  max=${fmt(stats.max)}ms`
}

export {Stats, computeStats, formatStatsRow}
```

- [ ] **Step 4: Run the verification script to confirm it passes**

Run: `npx ts-node verify-stats.ts`
Expected: prints `Stats: all checks passed`, exit code 0.

- [ ] **Step 5: Delete the temporary script and commit**

```bash
rm verify-stats.ts
git add src/Benchmark/Stats.ts
git commit -m "Feat: add Stats helper for benchmark duration aggregation"
```

---

### Task 3: Benchmark scenarios

**Files:**
- Create: `src/Benchmark/scenarios.ts`
- Temporary (delete before commit): `verify-scenarios.ts` (repo root)

**Interfaces:**
- Consumes: `MessageParameters` type from `src/Generator/Generator.ts` (`{name: String, content: String, avatarUrl?: String, titleColor: String}`), `colorsMap` default export from `src/Styles/ColorsMap.ts`.
- Produces: `const scenarios: {name: string, params: MessageParameters}[]` (named export), containing exactly 3 entries named `"short-no-avatar"`, `"short-with-avatar"`, `"long-with-avatar"`.

- [ ] **Step 1: Write the temporary verification script**

Create `verify-scenarios.ts` at the repo root:

```ts
import assert from "assert"
import {scenarios} from "./src/Benchmark/scenarios"

assert.strictEqual(scenarios.length, 3)

const names = scenarios.map(s => s.name)
assert.deepStrictEqual(names, ["short-no-avatar", "short-with-avatar", "long-with-avatar"])

for (const scenario of scenarios) {
    assert.ok(scenario.params.name, `${scenario.name}: missing name`)
    assert.ok(scenario.params.content, `${scenario.name}: missing content`)
    assert.ok(scenario.params.titleColor, `${scenario.name}: missing titleColor`)
}

assert.strictEqual(scenarios[0].params.avatarUrl, undefined)
assert.ok(String(scenarios[1].params.avatarUrl).startsWith("data:image/png;base64,"))
assert.ok(String(scenarios[2].params.avatarUrl).startsWith("data:image/png;base64,"))
assert.ok(String(scenarios[2].params.content).length > String(scenarios[0].params.content).length)

console.log("scenarios: all checks passed")
```

- [ ] **Step 2: Run it to confirm it fails (module doesn't exist yet)**

Run: `npx ts-node verify-scenarios.ts`
Expected: TypeScript error — `Cannot find module './src/Benchmark/scenarios'`

- [ ] **Step 3: Implement `scenarios.ts`**

Create `src/Benchmark/scenarios.ts`. The avatar is the well-known minimal valid 1×1 transparent PNG data URI — deliberately tiny and guaranteed-valid rather than a hand-crafted larger image, since the benchmark targets the `<img>` layout/decode code path, not raw payload size (see spec):

```ts
import {MessageParameters} from "../Generator/Generator";
import colorsMap from "../Styles/ColorsMap";

const SYNTHETIC_AVATAR_DATA_URI =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

const shortNoAvatar: MessageParameters = {
    name: "Alice",
    content: "Hi there!",
    titleColor: colorsMap[0]
}

const shortWithAvatar: MessageParameters = {
    name: "Bob",
    content: "Hi there!",
    avatarUrl: SYNTHETIC_AVATAR_DATA_URI,
    titleColor: colorsMap[1]
}

const longWithAvatar: MessageParameters = {
    name: "Carol",
    content: "This is a much longer message meant to exercise text wrapping and the bubble's layout with a larger amount of content inside it, similar to what a verbose user might type into an inline query.",
    avatarUrl: SYNTHETIC_AVATAR_DATA_URI,
    titleColor: colorsMap[2]
}

const scenarios: {name: string, params: MessageParameters}[] = [
    {name: "short-no-avatar", params: shortNoAvatar},
    {name: "short-with-avatar", params: shortWithAvatar},
    {name: "long-with-avatar", params: longWithAvatar}
]

export {scenarios}
```

- [ ] **Step 4: Run the verification script to confirm it passes**

Run: `npx ts-node verify-scenarios.ts`
Expected: prints `scenarios: all checks passed`, exit code 0.

- [ ] **Step 5: Delete the temporary script and commit**

```bash
rm verify-scenarios.ts
git add src/Benchmark/scenarios.ts
git commit -m "Feat: add fixed benchmark scenarios"
```

---

### Task 4: `StickerGenerator.close()`

**Files:**
- Modify: `src/Generator/Generator.ts`
- Temporary (delete before commit): `verify-close.ts` (repo root)

**Interfaces:**
- Consumes: `StickerGenerator` class, its private `cluster: Cluster` field (already present).
- Produces: `public async close(): Promise<void>` method on `StickerGenerator`.

- [ ] **Step 1: Write the temporary verification script**

Create `verify-close.ts` at the repo root:

```ts
import {StickerGenerator} from "./src/Generator/Generator"

async function main() {
    console.log("launching cluster...")
    const generator = await StickerGenerator.create()
    console.log("closing cluster...")
    await generator.close()
    console.log("closed cleanly")
}

main()
```

- [ ] **Step 2: Run it to confirm it fails (method doesn't exist yet)**

Run: `npx ts-node verify-close.ts`
Expected: TypeScript error — `Property 'close' does not exist on type 'StickerGenerator'`

- [ ] **Step 3: Add the `close()` method**

In `src/Generator/Generator.ts`, add inside the `StickerGenerator` class (after `renderMessage`):

```ts
    public async close(): Promise<void> {
        await this.cluster.close()
    }
```

- [ ] **Step 4: Run the verification script to confirm it passes**

Run: `npx ts-node verify-close.ts`
Expected: prints all three lines (`launching cluster...`, `closing cluster...`, `closed cleanly`) and the process exits on its own (no hang). This also confirms `StickerGenerator.create()` still launches successfully in the dev environment.

- [ ] **Step 5: Delete the temporary script and commit**

```bash
rm verify-close.ts
git add src/Generator/Generator.ts
git commit -m "Feat: add StickerGenerator.close() for graceful shutdown"
```

---

### Task 5: Benchmark entry point + npm script

**Files:**
- Create: `src/Benchmark/benchmark.ts`
- Modify: `package.json` (add `benchmark` script)

**Interfaces:**
- Consumes: `StickerGenerator` + `MessageParameters` (`../Generator/Generator`, incl. `close()` from Task 4), `scenarios` (`./scenarios`, Task 3), `CollectingTimeMeasurer` default export (`../TimeMeasure/CollectingTimeMeasurer`, Task 1), `computeStats`/`formatStatsRow` (`./Stats`, Task 2).
- Produces: a runnable script (no exports needed — entry point only).

- [ ] **Step 1: Create `src/Benchmark/benchmark.ts`**

```ts
import {StickerGenerator} from "../Generator/Generator";
import {scenarios} from "./scenarios";
import CollectingTimeMeasurer from "../TimeMeasure/CollectingTimeMeasurer";
import {computeStats, formatStatsRow} from "./Stats";

const WARMUP_ITERATIONS = 3
const MEASURED_ITERATIONS = 20
const CONCURRENT_LEVEL = 16
const CONCURRENT_ROUNDS = 5

async function runSequential(generator: StickerGenerator): Promise<void> {
    console.log("\n=== Sequential mode ===\n")

    for (const scenario of scenarios) {
        for (let i = 0; i < WARMUP_ITERATIONS; i++) {
            try {
                await generator.renderMessage(scenario.params, new CollectingTimeMeasurer())
            } catch (e) {
                console.error(`[${scenario.name}] warmup iteration ${i} failed:`, e)
            }
        }

        const totalDurations: number[] = []
        const setContentDurations: number[] = []
        const screenshotDurations: number[] = []

        for (let i = 0; i < MEASURED_ITERATIONS; i++) {
            const timeMeasurer = new CollectingTimeMeasurer()
            const start = performance.now()
            try {
                await generator.renderMessage(scenario.params, timeMeasurer)
                totalDurations.push(performance.now() - start)
                setContentDurations.push(...timeMeasurer.getDurations("setContent"))
                screenshotDurations.push(...timeMeasurer.getDurations("screenshot"))
            } catch (e) {
                console.error(`[${scenario.name}] measured iteration ${i} failed:`, e)
            }
        }

        console.log(`Scenario: ${scenario.name}`)
        if (totalDurations.length === 0) {
            console.log("  no successful runs")
            continue
        }
        console.log("  " + formatStatsRow("total", computeStats(totalDurations)))
        console.log("  " + formatStatsRow("setContent", computeStats(setContentDurations)))
        console.log("  " + formatStatsRow("screenshot", computeStats(screenshotDurations)))
    }
}

async function runConcurrent(generator: StickerGenerator): Promise<void> {
    console.log("\n=== Concurrent mode ===\n")

    const allLatencies: number[] = []
    let totalRequests = 0
    let totalWallMs = 0

    for (let round = 0; round < CONCURRENT_ROUNDS; round++) {
        const roundStart = performance.now()
        const tasks: Promise<void>[] = []

        for (let slot = 0; slot < CONCURRENT_LEVEL; slot++) {
            const scenario = scenarios[(round * CONCURRENT_LEVEL + slot) % scenarios.length]
            tasks.push((async () => {
                const start = performance.now()
                try {
                    await generator.renderMessage(scenario.params, new CollectingTimeMeasurer())
                    allLatencies.push(performance.now() - start)
                } catch (e) {
                    console.error(`[concurrent round ${round}] request failed:`, e)
                }
            })())
        }

        await Promise.all(tasks)
        totalWallMs += performance.now() - roundStart
        totalRequests += CONCURRENT_LEVEL
    }

    const throughput = totalRequests / (totalWallMs / 1000)
    console.log(`Throughput: ${throughput.toFixed(2)} renders/sec (${totalRequests} requests over ${(totalWallMs / 1000).toFixed(2)}s wall time)`)
    console.log("  " + formatStatsRow("latency under load", computeStats(allLatencies)))
}

void async function main() {
    console.log("Starting StickerGenerator...")
    const generator = await StickerGenerator.create()

    try {
        await runSequential(generator)
        await runConcurrent(generator)
    } finally {
        await generator.close()
    }
}()
```

- [ ] **Step 2: Add the npm script**

In `package.json`, inside `"scripts"` (alongside the existing `"start"` and `"build"`):

```json
    "benchmark": "npx ts-node src/Benchmark/benchmark.ts",
```

- [ ] **Step 3: Run the benchmark end-to-end**

Run: `npm run benchmark`
Expected: `Starting StickerGenerator...`, then a `=== Sequential mode ===` section with 3 `Scenario:` blocks each showing `total`/`setContent`/`screenshot` stat rows with non-zero, non-`NaN` numbers, then a `=== Concurrent mode ===` section showing a `Throughput:` line and a `latency under load` stat row, then the process exits on its own (no hang, no leftover Chrome process needed — confirms `close()` from Task 4 is wired correctly here).

- [ ] **Step 4: Commit**

```bash
git add src/Benchmark/benchmark.ts package.json
git commit -m "Feat: add npm run benchmark for isolated rendering-speed measurement"
```

---

### Task 6: Final validation and docs

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nothing new — validates the whole feature end-to-end.
- Produces: nothing new — documentation + verification only.

- [ ] **Step 1: Type-check and build the whole project**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

Run: `npm run build`
Expected: no errors, `dist/` produced (remove `dist/` afterward — it's a build artifact, not meant to be committed, matching how the previous rendering-speed work handled it).

```bash
rm -rf dist/
```

- [ ] **Step 2: Re-run the benchmark once more as a final sanity check**

Run: `npm run benchmark`
Expected: same as Task 5 Step 3 — completes cleanly with plausible numbers in both modes.

- [ ] **Step 3: Add the benchmark command to `CLAUDE.md`**

In `CLAUDE.md`, under the `## Commands` section, add a line after the existing `npm run build` bullet:

```markdown
- `npm run benchmark` — run `src/Benchmark/benchmark.ts`: exercises `StickerGenerator.renderMessage` in isolation (no bot token/`config.json` needed) with fixed scenarios, in both sequential (per-request latency) and concurrent (throughput under `maxConcurrency`-level load) modes — use this to measure the effect of rendering-pipeline changes before/after
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "Docs: document npm run benchmark in CLAUDE.md"
```
