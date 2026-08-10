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
