const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '../cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Polite user-agent
const USER_AGENT = 'FlyRankInternship-A9/1.0 (+https://github.com/MoscowAbdelaal/crud-api)';

async function fetchWithCache(url, cacheKey) {
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.html`);
    
    // Check cache first
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
        // Return null instead of throwing
        return null;
    }
}

module.exports = { fetchWithCache };