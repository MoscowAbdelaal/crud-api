const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '../cache');

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const USER_AGENT = 'FlyRankInternship-A9/1.0 (+https://github.com/MoscowAbdelaal/crud-api)';

async function fetchWithCache(url, cacheKey) {
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.html`);
    
    if (fs.existsSync(cachePath)) {
        const content = fs.readFileSync(cachePath, 'utf-8');
        console.log(`📁 CACHE HIT: ${cacheKey} (${content.length} bytes)`);
        return content;
    }
    
    console.log(`🌐 FETCH: ${cacheKey}`);
    
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT },
            timeout: 10000,
            validateStatus: (status) => status === 200
        });
        
        if (!response.data) {
            throw new Error('No data received');
        }
        
        fs.writeFileSync(cachePath, response.data);
        console.log(`💾 CACHE SAVED: ${cacheKey} (${response.data.length} bytes)`);
        return response.data;
        
    } catch (error) {
        if (error.response) {
            console.error(`❌ HTTP ${error.response.status}: ${url}`);
        } else if (error.code === 'ECONNABORTED') {
            console.error(`⏱️ TIMEOUT: ${url}`);
        } else {
            console.error(`❌ ERROR: ${error.message}`);
        }
        return null;
    }
}

// ============================================
// BONUS 4: RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================

async function fetchWithRetry(url, cacheKey, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await fetchWithCache(url, cacheKey);
            if (result) return result;
            
            // If fetchWithCache returned null, treat as failure
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 200, 10000);
                console.log(`⏳ Retry ${attempt}/${maxRetries} after ${Math.round(delay)}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 200, 10000);
                console.log(`⏳ Retry ${attempt}/${maxRetries} after ${Math.round(delay)}ms (${error.message})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    console.error(`❌ Failed after ${maxRetries} attempts: ${url}`);
    return null;
}

module.exports = { fetchWithCache, fetchWithRetry };