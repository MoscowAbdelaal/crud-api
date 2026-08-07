function cleanPrice(priceText) {
    if (!priceText) return null;
    const cleaned = priceText.replace('£', '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

function cleanRating(ratingText) {
    if (!ratingText) return null;
    const ratingMap = {
        'Zero': 0, 'One': 1, 'Two': 2,
        'Three': 3, 'Four': 4, 'Five': 5
    };
    return ratingMap[ratingText] ?? null;
}

function cleanAvailability(availabilityText) {
    if (!availabilityText) return null;
    const match = availabilityText.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
}

function cleanRecord(raw) {
    return {
        title: raw.title,
        product_url: raw.product_url,
        price_text: raw.price_text,
        price_gbp: cleanPrice(raw.price_text),
        availability_text: raw.availability_text,
        availability_count: cleanAvailability(raw.availability_text),
        rating_text: raw.rating_text,
        rating_number: cleanRating(raw.rating_text),
        description: raw.description,
        source_page: raw.source_page,
        fetched_at: raw.fetched_at
    };
}

module.exports = { cleanRecord, cleanPrice, cleanAvailability, cleanRating };