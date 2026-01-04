/**
 * Entrada do cache com valor, timestamp e TTL
 */
interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttlMs: number;
}

/**
 * Cache genérico com TTL (Time To Live)
 * Permite armazenar valores com expiração automática
 * Cada entrada pode ter seu próprio TTL
 */
export default class Cache<T> {
    private cache: Map<string, CacheEntry<T>>;

    constructor() {
        this.cache = new Map<string, CacheEntry<T>>();
    }

    /**
     * Verifica se uma entrada do cache ainda é válida
     */
    private isEntryValid(entry: CacheEntry<T>): boolean {
        const now = Date.now();
        return (now - entry.timestamp) < entry.ttlMs;
    }

    /**
     * Limpa entradas expiradas do cache
     */
    private cleanExpiredEntries(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if ((now - entry.timestamp) >= entry.ttlMs) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Obtém um valor do cache
     * @param key - Chave do cache
     * @returns Valor se existir e for válido, undefined caso contrário
     */
    get(key: string): T | undefined {
        this.cleanExpiredEntries();
        
        const entry = this.cache.get(key);
        if (entry && this.isEntryValid(entry)) {
            return entry.value;
        }

        // Remove entrada expirada se existir
        if (entry) {
            this.cache.delete(key);
        }

        return undefined;
    }

    /**
     * Armazena um valor no cache
     * @param key - Chave do cache
     * @param value - Valor a ser armazenado
     * @param ttlMs - Tempo de vida do cache em milissegundos para esta entrada
     */
    set({key, value, ttlMs}: {key: string, value: T, ttlMs: number}): void {
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttlMs,
        });
    }

    /**
     * Verifica se uma chave existe no cache e é válida
     * @param key - Chave do cache
     * @returns true se a chave existe e é válida, false caso contrário
     */
    has(key: string): boolean {
        this.cleanExpiredEntries();
        const entry = this.cache.get(key);
        return entry !== undefined && this.isEntryValid(entry);
    }

    /**
     * Remove uma entrada específica do cache
     * @param key - Chave do cache
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Limpa todo o cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Retorna o tamanho atual do cache (após limpar expirados)
     */
    size(): number {
        this.cleanExpiredEntries();
        return this.cache.size;
    }
}

