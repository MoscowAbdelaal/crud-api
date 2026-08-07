const cheerio = require('cheerio');

function parseBookPage(html, url) {
    const $ = cheerio.load(html);
    
    const title = $('.product_main h1').text().trim() || null;
    const price_text = $('.price_color').first().text().trim() || null;
    const availability_text = $('.instock.availability').text().trim() || null;
    const rating_text = $('.star-rating').attr('class')?.replace('star-rating ', '') || null;
    const description = $('#product_description + p').text().trim() || null;
    
    return {
        title,
        product_url: url,
        price_text,
        availability_text,
        rating_text,
        description,
        source_page: url,
        fetched_at: new Date().toISOString()
    };
}

module.exports = { parseBookPage };