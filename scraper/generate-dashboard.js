const fs = require('fs');
const path = require('path');

const booksPath = path.join(__dirname, 'output', 'books.json');

if (!fs.existsSync(booksPath)) {
    console.error('❌ books.json not found. Run node src/index.js first.');
    process.exit(1);
}

const books = JSON.parse(fs.readFileSync(booksPath, 'utf-8'));
const templatePath = path.join(__dirname, 'dashboard-template.html');
const dashboardPath = path.join(__dirname, 'dashboard.html');

// Read template
let html = fs.readFileSync(templatePath, 'utf-8');

// Replace placeholder with actual data
const dataScript = `<script>\n    const EMBEDDED_DATA = ${JSON.stringify(books, null, 2)};\n</script>`;
html = html.replace('<!-- DATA_PLACEHOLDER -->', dataScript);

fs.writeFileSync(dashboardPath, html);
console.log(`✅ Dashboard generated with ${books.length} books`);
console.log(`📁 Open: ${dashboardPath}`);