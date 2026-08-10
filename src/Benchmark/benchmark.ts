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

        console.log(`Scenario: ${scenario.name} (${totalDurations.length}/${MEASURED_ITERATIONS} succeeded)`)
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

    const succeeded = allLatencies.length
    const throughput = succeeded / (totalWallMs / 1000)
    console.log(`Throughput: ${throughput.toFixed(2)} renders/sec (${succeeded}/${totalRequests} requests succeeded over ${(totalWallMs / 1000).toFixed(2)}s wall time)`)
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
