const { fetchWithCache } = require('./fetch');

const BASE_URL = 'https://books.toscrape.com';
const CATALOGUE_URL = `${BASE_URL}/catalogue/page-1.html`;

async function main() {
    console.log('📚 Books to Scrape - Polite Scraper\n');
    
    try {
        // Fetch page 1
        const html = await fetchWithCache(CATALOGUE_URL, 'catalogue-page-1');
        console.log(`✅ Page 1 loaded (${html.length} bytes)\n`);
        
        console.log('✅ Scraping complete!');
        console.log('📁 Check cache/ for cached HTML files');
    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
        process.exit(1);
    }
}

main();