const crypto = require('crypto');

class LLMCache {
    constructor() {
        this.cache = new Map();
        this.maxSize = 100;
        this.hits = 0;
        this.misses = 0;
        this.ttl = 3600000; // 1 hour in milliseconds
    }

    getKey(input, promptVersion) {
        const str = `${input}|${promptVersion}`;
        return crypto.createHash('md5').update(str).digest('hex');
    }

    get(input, promptVersion) {
        const key = this.getKey(input, promptVersion);
        const entry = this.cache.get(key);
        
        if (entry && Date.now() - entry.timestamp < this.ttl) {
            this.hits++;
            console.log(`📦 Cache HIT: ${key.slice(0, 8)}...`);
            return entry.data;
        }
        
        if (entry && Date.now() - entry.timestamp >= this.ttl) {
            this.cache.delete(key);
            console.log(`📦 Cache EXPIRED: ${key.slice(0, 8)}...`);
        }
        
        this.misses++;
        console.log(`📦 Cache MISS: ${key.slice(0, 8)}...`);
        return null;
    }

    set(input, promptVersion, data) {
        const key = this.getKey(input, promptVersion);
        
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            console.log(`📦 Cache EVICTED: ${firstKey.slice(0, 8)}...`);
        }
        
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        console.log(`📦 Cache SET: ${key.slice(0, 8)}...`);
    }

    getStats() {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? `${Math.round((this.hits / total) * 100)}%` : '0%',
            size: this.cache.size,
            maxSize: this.maxSize,
            ttl: this.ttl / 1000 + 's'
        };
    }

    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
        console.log('📦 Cache cleared');
    }
}

module.exports = new LLMCache();
