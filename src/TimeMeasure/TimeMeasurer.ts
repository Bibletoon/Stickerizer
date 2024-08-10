interface TimeMeasurer {
    SetScope(scope: any): void;
    Measure<T>(stepName: string, func : () => T) : T
    MeasureAsync<T>(stepName: string, func : () => Promise<T>) : Promise<T>
}

export default TimeMeasurer;