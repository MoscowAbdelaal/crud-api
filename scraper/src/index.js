const { fetchWithCache } = require('./fetch');
const cheerio = require('cheerio');

const BASE_URL = 'https://books.toscrape.com';
const CATALOGUE_URL = `${BASE_URL}/catalogue/page-1.html`;

async function getCataloguePages() {
    const catalogueUrls = [];
    let currentUrl = CATALOGUE_URL;
    const visited = new Set();
    
    while (currentUrl && catalogueUrls.length < 3) {
        const cacheKey = `catalogue-page-${catalogueUrls.length + 1}`;
        const html = await fetchWithCache(currentUrl, cacheKey);
        const $ = cheerio.load(html);
        
        catalogueUrls.push(currentUrl);
        visited.add(currentUrl);
        
        // Find next page link
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
        
        // Polite delay (only for real fetches, not cache)
        if (catalogueUrls.length < 3) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    return catalogueUrls;
}

async function getBookLinks(html, pageUrl) {
    const $ = cheerio.load(html);
    const links = [];
    
    $('.product_pod a').each((_, element) => {
        const href = $(element).attr('href');
        if (href && !href.includes('#')) {
            const absoluteUrl = new URL(href, pageUrl).href;
            links.push(absoluteUrl);
        }
    });
    
    return links;
}

async function main() {
    console.log('📚 Books to Scrape - Polite Scraper\n');
    
    try {
        // 1. Get all catalogue pages
        const catalogueUrls = await getCataloguePages();
        console.log(`📑 Found ${catalogueUrls.length} catalogue pages\n`);
        
        // 2. Get all book links
        const allBookLinks = [];
        for (const url of catalogueUrls) {
            const cacheKey = `catalogue-page-${catalogueUrls.indexOf(url) + 1}`;
            const html = await fetchWithCache(url, cacheKey);
            const links = await getBookLinks(html, url);
            allBookLinks.push(...links);
        }
        
        // Remove duplicates
        const uniqueLinks = [...new Set(allBookLinks)];
        console.log(`📖 Discovered ${allBookLinks.length} book links, ${uniqueLinks.length} unique`);
        
        console.log('\n✅ Discovery complete!');
    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
        process.exit(1);
    }
}

main();