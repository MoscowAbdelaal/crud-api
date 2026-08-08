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

// ============================================
// AUTO-GENERATE DASHBOARD
// ============================================
function generateDashboard(books) {
    const templatePath = '/Users/moscow/FlyRank/Assignment 2 - my-crud-api/scraper/dashboard-template.html';
    const dashboardPath = '/Users/moscow/FlyRank/Assignment 2 - my-crud-api/scraper/dashboard.html';

    // Check if template exists
    if (!fs.existsSync(templatePath)) {
        console.log('⚠️ dashboard-template.html not found, creating from inline template');
        // Create inline template
        const inlineTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Books Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
        h1 { color: #333; }
        .stats { display: flex; gap: 20px; flex-wrap: wrap; margin: 20px 0; }
        .stat { background: white; padding: 20px 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex: 1; min-width: 120px; text-align: center; }
        .stat .number { font-size: 32px; font-weight: bold; color: #2c3e50; display: block; }
        .stat .label { color: #7f8c8d; font-size: 14px; }
        .controls { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
        .controls input, .controls select { padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        th { background: #2c3e50; color: white; padding: 12px; text-align: left; }
        td { padding: 10px 12px; border-bottom: 1px solid #eee; }
        tr:hover { background: #f8f9fa; }
        .low-stock { background: #ffebee; }
        .high-stock { background: #e8f5e9; }
        .rating { color: #f39c12; }
        .last-updated { color: #7f8c8d; font-size: 14px; margin-top: 20px; }
        .btn { padding: 10px 20px; background: #2196f3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
        .btn:hover { background: #1976d2; }
    </style>
</head>
<body>
    <h1>📚 Books Dashboard</h1>
    <div id="stats" class="stats"></div>
    <div class="controls">
        <input type="text" id="search" placeholder="Search by title..." oninput="filterTable()">
        <select id="ratingFilter" onchange="filterTable()">
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
        </select>
        <button class="btn" onclick="location.reload()">🔄 Refresh</button>
    </div>
    <table>
        <thead><tr><th>#</th><th>Title</th><th>Price</th><th>Rating</th><th>Stock</th></tr></thead>
        <tbody id="booksBody"></tbody>
    </table>
    <div id="lastUpdated" class="last-updated"></div>

    <script>
        const books = __DATA_PLACEHOLDER__;

        function renderStats() {
            const total = books.length;
            const inStock = books.filter(b => b.availability_count > 0).length;
            const avgPrice = books.length ? (books.reduce((s, b) => s + (b.price_gbp || 0), 0) / books.length).toFixed(2) : 0;
            const avgRating = books.length ? (books.reduce((s, b) => s + (b.rating_number || 0), 0) / books.length).toFixed(1) : 0;
            document.getElementById('stats').innerHTML = \`
                <div class="stat"><span class="number">\${total}</span><span class="label">Total Books</span></div>
                <div class="stat"><span class="number">£\${avgPrice}</span><span class="label">Average Price</span></div>
                <div class="stat"><span class="number">\${avgRating} ⭐</span><span class="label">Average Rating</span></div>
                <div class="stat"><span class="number">\${inStock}</span><span class="label">In Stock</span></div>
            \`;
        }

        function renderTable(data) {
            const tbody = document.getElementById('booksBody');
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">No books match your filters</td></tr>';
                return;
            }
            tbody.innerHTML = data.map((b, i) => {
                let stockClass = '';
                if (b.availability_count < 5) stockClass = 'low-stock';
                else if (b.availability_count > 20) stockClass = 'high-stock';
                const stars = '⭐'.repeat(Math.min(b.rating_number || 0, 5));
                return \`<tr class="\${stockClass}">
                    <td>\${i + 1}</td>
                    <td><a href="\${b.product_url}" target="_blank">\${b.title || 'N/A'}</a></td>
                    <td>£\${b.price_gbp !== null ? b.price_gbp.toFixed(2) : 'N/A'}</td>
                    <td class="rating">\${stars}</td>
                    <td>\${b.availability_count !== null ? b.availability_count : 'N/A'}</td>
                </tr>\`;
            }).join('');
        }

        function filterTable() {
            const search = document.getElementById('search').value.toLowerCase();
            const rating = parseInt(document.getElementById('ratingFilter').value) || null;
            const filtered = books.filter(b => {
                const matchTitle = b.title && b.title.toLowerCase().includes(search);
                const matchRating = rating ? b.rating_number === rating : true;
                return matchTitle && matchRating;
            });
            renderTable(filtered);
        }

        renderStats();
        renderTable(books);
        document.getElementById('lastUpdated').textContent = '📅 Last updated: ' + new Date().toLocaleString();
    </script>
</body>
</html>`;
        let html = inlineTemplate;
        html = html.replace('__DATA_PLACEHOLDER__', JSON.stringify(books, null, 2));
        fs.writeFileSync(dashboardPath, html);
        console.log(`📁 Dashboard auto-generated with ${books.length} books`);
        return;
    }

    // If template exists, use it
    let html = fs.readFileSync(templatePath, 'utf-8');
    const dataScript = `<script>\n    const EMBEDDED_DATA = ${JSON.stringify(books, null, 2)};\n</script>`;
    html = html.replace('<!-- DATA_PLACEHOLDER -->', dataScript);
    fs.writeFileSync(dashboardPath, html);
    console.log(`📁 Dashboard auto-generated with ${books.length} books`);
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
        // AUTO-GENERATE DASHBOARD (Bonus 3)
        // ============================================
        generateDashboard(validRecords);
        
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
        console.log(`   dashboard.html: auto-generated with ${validRecords.length} books`);
        console.log(`   errors.json: ${errors.length} errors`);
        console.log(`   run-report.json: ${Object.keys(report).length} metrics`);
        
    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
        process.exit(1);
    }
}

main();