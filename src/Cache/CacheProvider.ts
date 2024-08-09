interface CacheProvider<TKey, TValue> {
    get(key: TKey): TValue | null;
    set(key: TKey, value: TValue): void;
}

export default CacheProvider;