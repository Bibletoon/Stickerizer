import TimeMeasurer from "./TimeMeasurer";
import {Logger} from "pino"

class LocalTimeMeasurer implements TimeMeasurer {
    private scope: any = {}
    
    constructor(private readonly logger: Logger) {}
    
    SetScope(scope: any): void {
         this.scope = scope
    }
    Measure<T>(stepName: string, func: () => T): T {
        const startTime = performance.now();
        const result = func()
        const duration = performance.now() - startTime
        this.logger.info(this.scope, "Step %s took %s ms", stepName, duration);
        return result
    }
    async MeasureAsync<T>(stepName: string, func: () => Promise<T>): Promise<T> {
        const startTime = performance.now()
        const result = await func()
        const duration = performance.now() - startTime
        this.logger.info(this.scope, "Step %s took %s ms", stepName, duration);
        return result
    }
}

export default LocalTimeMeasurer