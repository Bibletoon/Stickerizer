import CacheProvider from "./CacheProvider";
import {CacheClass} from "memory-cache";

class InMemoryCacheProvider<TKey, TValue> implements CacheProvider<TKey, TValue> {
    private readonly cache : CacheClass<TKey, TValue> = require("memory-cache");
    private readonly ttl = 60 * 60 * 1000;
    
    get(key: TKey): TValue | null {
        return this.cache.get(key);
    }
    set(key: TKey, value: TValue): void {
        this.cache.put(key, value, this.ttl);
    }
    
}

export default InMemoryCacheProvider;