const crypto = require('crypto');

function hashRecord(record) {
    const str = JSON.stringify({
        title: record.title,
        price_gbp: record.price_gbp,
        availability_count: record.availability_count,
        rating_number: record.rating_number,
        description: record.description
    });
    return crypto.createHash('md5').update(str).digest('hex');
}

function detectChanges(oldRecords, newRecords) {
    const oldMap = {};
    oldRecords.forEach(r => { oldMap[r.product_url] = hashRecord(r); });
    
    const changes = { new: 0, changed: 0, unchanged: 0, gone: 0 };
    const newMap = {};
    newRecords.forEach(r => { newMap[r.product_url] = hashRecord(r); });
    
    for (const [url, hash] of Object.entries(newMap)) {
        if (!oldMap[url]) changes.new++;
        else if (oldMap[url] !== hash) changes.changed++;
        else changes.unchanged++;
    }
    for (const url of Object.keys(oldMap)) {
        if (!newMap[url]) changes.gone++;
    }
    return changes;
}

module.exports = { hashRecord, detectChanges };