const { fetchWithCache } = require('./fetch');
const { parseBookPage } = require('./parse');
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
    const records = [];
    
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
        console.log(`📖 Discovered ${allBookLinks.length} book links, ${uniqueLinks.length} unique\n`);
        
        for (let i = 0; i < uniqueLinks.length; i++) {
            const url = uniqueLinks[i];
            const cacheKey = `book-${i + 1}`;
            
            try {
                const html = await fetchWithCache(url, cacheKey);
                if (html) {
                    const record = parseBookPage(html, url);
                    records.push(record);
                    console.log(`✅ [${i + 1}/${uniqueLinks.length}] ${record.title || 'Unknown title'}`);
                }
            } catch (error) {
                console.error(`❌ Failed to fetch book ${i + 1}: ${url}`);
            }
            
            if (i < uniqueLinks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        const outputPath = path.join(OUTPUT_DIR, 'books-raw.json');
        fs.writeFileSync(outputPath, JSON.stringify(records, null, 2));
        
        const duration = (Date.now() - startTime) / 1000;
        console.log(`\n📊 Summary:`);
        console.log(`   Catalogue pages: ${catalogueUrls.length}`);
        console.log(`   Book links found: ${uniqueLinks.length}`);
        console.log(`   Records extracted: ${records.length}`);
        console.log(`   Duration: ${duration}s`);
        console.log(`\n📁 Output saved to: ${outputPath}`);
        
    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
        process.exit(1);
    }
}

main();