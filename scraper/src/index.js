const { fetchWithCache } = require('./fetch');
const { parseBookPage } = require('./parse');
const { cleanRecord } = require('./clean');
const { validateRecord } = require('./validate');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://books.toscrape.com';
const CATALOGUE_URL = `${BASE_URL}/catalogue/page-1.html`;
const OUTPUT_DIR = path.join(__dirname, '../output');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function getCataloguePages() {
    const catalogueUrls = [];
    let currentUrl = CATALOGUE_URL;
    const visited = new Set();
    
    while (currentUrl && catalogueUrls.length < 3) {
        const cacheKey = `catalogue-page-${catalogueUrls.length + 1}`;
        const html = await fetchWithCache(currentUrl, cacheKey);
        
        if (!html) break;
        
        const $ = cheerio.load(html);
        catalogueUrls.push(currentUrl);
        visited.add(currentUrl);
        
        const nextLink = $('.next a').attr('href');
        if (nextLink) {
            const nextUrl = new URL(nextLink, currentUrl).href;
            if (!visited.has(nextUrl) && catalogueUrls.length < 3) {
                currentUrl = nextUrl;
            } else {
                currentUrl = null;
            }
        } else {
            currentUrl = null;
        }
        
        if (catalogueUrls.length < 3) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    return catalogueUrls;
}

async function getBookLinks(html, pageUrl) {
    if (!html) return [];
    
    const $ = cheerio.load(html);
    const links = [];
    
    $('.product_pod a').each((_, element) => {
        const href = $(element).attr('href');
        if (href && !href.includes('#')) {
            try {
                const absoluteUrl = new URL(href, pageUrl).href;
                links.push(absoluteUrl);
            } catch (e) {}
        }
    });
    
    return links;
}

async function main() {
    console.log('📚 Books to Scrape - Polite Scraper\n');
    const startTime = Date.now();
    const rawRecords = [];
    const validRecords = [];
    const errors = [];
    
    try {
        const catalogueUrls = await getCataloguePages();
        console.log(`📑 Found ${catalogueUrls.length} catalogue pages\n`);
        
        const allBookLinks = [];
        for (const url of catalogueUrls) {
            const cacheKey = `catalogue-page-${catalogueUrls.indexOf(url) + 1}`;
            const html = await fetchWithCache(url, cacheKey);
            if (html) {
                const links = await getBookLinks(html, url);
                allBookLinks.push(...links);
            }
        }
        
        const uniqueLinks = [...new Set(allBookLinks)];
        
        // FAKE URL TO TEST FAILURE HANDLING (Stage 5)
        const fakeUrl = 'https://books.toscrape.com/catalogue/this-page-does-not-exist.html';
        const testLinks = [...uniqueLinks, fakeUrl];
        
        console.log(`📖 Discovered ${uniqueLinks.length} unique book links`);
        console.log(`🧪 Testing with ${testLinks.length} links (including 1 fake URL)\n`);
        
        for (let i = 0; i < testLinks.length; i++) {
            const url = testLinks[i];
            const cacheKey = `book-${i + 1}`;
            
            try {
                const html = await fetchWithCache(url, cacheKey);
                if (!html) {
                    errors.push({ url, error: 'No HTML received' });
                    console.error(`❌ [${i + 1}/${testLinks.length}] No HTML: ${url}`);
                    continue;
                }
                
                const raw = parseBookPage(html, url);
                rawRecords.push(raw);
                
                const cleaned = cleanRecord(raw);
                const result = validateRecord(cleaned);
                
                if (result.valid) {
                    validRecords.push(result.data);
                    console.log(`✅ [${i + 1}/${testLinks.length}] ${raw.title || 'Unknown title'}`);
                } else {
                    errors.push({
                        url,
                        errors: result.errors,
                        record: cleaned
                    });
                    console.log(`⚠️ [${i + 1}/${testLinks.length}] ${raw.title || 'Unknown title'} - INVALID`);
                }
            } catch (error) {
                errors.push({
                    url,
                    error: error.message
                });
                console.error(`❌ [${i + 1}/${testLinks.length}] Failed: ${url}`);
            }
            
            if (i < testLinks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        fs.writeFileSync(path.join(OUTPUT_DIR, 'books.json'), JSON.stringify(validRecords, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, 'errors.json'), JSON.stringify(errors, null, 2));
        
        const duration = (Date.now() - startTime) / 1000;
        const report = {
            start_time: new Date(startTime).toISOString(),
            duration_seconds: duration,
            catalogue_pages: catalogueUrls.length,
            book_urls_found: uniqueLinks.length,
            valid_records: validRecords.length,
            invalid_records: errors.filter(e => e.record).length,
            failed_pages: errors.filter(e => e.error).length,
            cache_used: true
        };
        fs.writeFileSync(path.join(OUTPUT_DIR, 'run-report.json'), JSON.stringify(report, null, 2));
        
        console.log(`\n📊 SUMMARY:`);
        console.log(`   Catalogue pages: ${catalogueUrls.length}`);
        console.log(`   Book URLs found: ${uniqueLinks.length}`);
        console.log(`   Valid records: ${validRecords.length}`);
        console.log(`   Invalid records: ${report.invalid_records}`);
        console.log(`   Failed pages: ${report.failed_pages}`);
        console.log(`   Duration: ${duration}s`);
        console.log(`\n📁 Outputs:`);
        console.log(`   books.json: ${validRecords.length} records`);
        console.log(`   errors.json: ${errors.length} errors`);
        console.log(`   run-report.json: ${Object.keys(report).length} metrics`);
        
    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
        process.exit(1);
    }
}

main();