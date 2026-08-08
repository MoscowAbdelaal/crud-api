const { fetchWithCache, fetchWithRetry } = require('./fetch');
const { parseBookPage } = require('./parse');
const { cleanRecord } = require('./clean');
const { validateRecord } = require('./validate');
const { detectChanges } = require('./hash');
const { enrichWithAI } = require('./enrich');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

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
        const html = await fetchWithRetry(currentUrl, cacheKey);
        
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
    const enrichedRecords = [];
    const errors = [];
    
    try {
        const catalogueUrls = await getCataloguePages();
        console.log(`📑 Found ${catalogueUrls.length} catalogue pages\n`);
        
        const allBookLinks = [];
        for (const url of catalogueUrls) {
            const cacheKey = `catalogue-page-${catalogueUrls.indexOf(url) + 1}`;
            const html = await fetchWithRetry(url, cacheKey);
            if (html) {
                const links = await getBookLinks(html, url);
                allBookLinks.push(...links);
            }
        }
        
        const uniqueLinks = [...new Set(allBookLinks)];
        
        const fakeUrl = 'https://books.toscrape.com/catalogue/this-page-does-not-exist.html';
        const testLinks = [...uniqueLinks, fakeUrl];
        
        console.log(`📖 Discovered ${uniqueLinks.length} unique book links`);
        console.log(`🧪 Testing with ${testLinks.length} links (including 1 fake URL)\n`);
        
        for (let i = 0; i < testLinks.length; i++) {
            const url = testLinks[i];
            const cacheKey = `book-${i + 1}`;
            
            try {
                const html = await fetchWithRetry(url, cacheKey);
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
        
        // ============================================
        // BONUS 5: AI ENRICHMENT
        // ============================================
        console.log('\n🤖 Enriching with AI...');
        for (let i = 0; i < validRecords.length; i++) {
            const record = validRecords[i];
            try {
                const enriched = await enrichWithAI(record.description, record.title);
                enrichedRecords.push({
                    ...record,
                    ai_category: enriched.category,
                    ai_summary: enriched.summary
                });
                console.log(`✅ [${i + 1}/${validRecords.length}] ${record.title} → ${enriched.category}`);
            } catch (error) {
                enrichedRecords.push({
                    ...record,
                    ai_category: 'Error',
                    ai_summary: 'AI enrichment failed'
                });
                console.log(`❌ [${i + 1}/${validRecords.length}] ${record.title} → AI Error`);
            }
            // Rate limit AI calls (optional)
            if (i < validRecords.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        // ============================================
        // CHANGE DETECTION (Bonus 2)
        // ============================================
        const oldPath = path.join(OUTPUT_DIR, 'books.json');
        let oldRecords = [];
        if (fs.existsSync(oldPath)) {
            try {
                oldRecords = JSON.parse(fs.readFileSync(oldPath, 'utf-8'));
            } catch (e) {
                oldRecords = [];
            }
        }
        
        const changes = detectChanges(oldRecords, validRecords);
        console.log(`\n📊 Change Detection:`);
        console.log(`   New: ${changes.new}`);
        console.log(`   Changed: ${changes.changed}`);
        console.log(`   Unchanged: ${changes.unchanged}`);
        console.log(`   Gone: ${changes.gone}`);
        
        // ============================================
        // SAVE OUTPUTS
        // ============================================
        fs.writeFileSync(path.join(OUTPUT_DIR, 'books.json'), JSON.stringify(validRecords, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, 'books-enriched.json'), JSON.stringify(enrichedRecords, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, 'errors.json'), JSON.stringify(errors, null, 2));
        
        // ============================================
        // CSV EXPORT (Bonus 1)
        // ============================================
        if (enrichedRecords.length > 0) {
            const csvWriter = createCsvWriter({
                path: path.join(OUTPUT_DIR, 'books-enriched.csv'),
                header: [
                    { id: 'title', title: 'Title' },
                    { id: 'product_url', title: 'URL' },
                    { id: 'price_gbp', title: 'Price (GBP)' },
                    { id: 'rating_number', title: 'Rating' },
                    { id: 'availability_count', title: 'Stock' },
                    { id: 'ai_category', title: 'Category' },
                    { id: 'ai_summary', title: 'AI Summary' }
                ]
            });
            await csvWriter.writeRecords(enrichedRecords);
            console.log(`📁 CSV saved: books-enriched.csv (${enrichedRecords.length} records)`);
        }
        
        const duration = (Date.now() - startTime) / 1000;
        const report = {
            start_time: new Date(startTime).toISOString(),
            duration_seconds: duration,
            catalogue_pages: catalogueUrls.length,
            book_urls_found: uniqueLinks.length,
            valid_records: validRecords.length,
            enriched_records: enrichedRecords.length,
            invalid_records: errors.filter(e => e.record).length,
            failed_pages: errors.filter(e => e.error).length,
            cache_used: true,
            changes: changes
        };
        fs.writeFileSync(path.join(OUTPUT_DIR, 'run-report.json'), JSON.stringify(report, null, 2));
        
        console.log(`\n📊 SUMMARY:`);
        console.log(`   Catalogue pages: ${catalogueUrls.length}`);
        console.log(`   Book URLs found: ${uniqueLinks.length}`);
        console.log(`   Valid records: ${validRecords.length}`);
        console.log(`   Enriched records: ${enrichedRecords.length}`);
        console.log(`   Invalid records: ${report.invalid_records}`);
        console.log(`   Failed pages: ${report.failed_pages}`);
        console.log(`   Duration: ${duration}s`);
        console.log(`\n📁 Outputs:`);
        console.log(`   books.json: ${validRecords.length} records`);
        console.log(`   books-enriched.json: ${enrichedRecords.length} records`);
        console.log(`   books-enriched.csv: ${enrichedRecords.length} records`);
        console.log(`   errors.json: ${errors.length} errors`);
        console.log(`   run-report.json: ${Object.keys(report).length} metrics`);
        
    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
        process.exit(1);
    }
}

main();
