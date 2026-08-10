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
