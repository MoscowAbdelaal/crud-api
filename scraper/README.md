```markdown
# Books to Scrape - Polite Scraper

A polite web scraper for the Books to Scrape sandbox site.

---

## Target Classification

- **Site:** Books to Scrape (https://books.toscrape.com/)
- **Purpose:** Practice sandbox for learning web scraping
- **Scope:** First 3 catalogue pages only (~60 books)
- **Data:** Title, price, rating, description, availability, URL
- **Robots.txt:** https://books.toscrape.com/robots.txt — allows scraping
- **Ethics:** I will not reuse this code on another site without checking its rules and terms first.

---

## Installation

```bash
npm install
```

---

## Usage

```bash
node src/index.js
```

---

## Output

- `output/books.json` - Validated book records
- `output/errors.json` - Records that failed validation
- `output/run-report.json` - Run statistics

---

## Politeness Rules

- User-Agent: `FlyRankInternship-A9/1.0`
- Delay: 500ms between requests
- Timeout: 10 seconds
- Cache: Saves HTML to disk

---

## Schema

| Field | Type | Description |
|-------|------|-------------|
| title | string | Book title |
| product_url | string | Canonical URL |
| price_text | string | Raw price (e.g. "£51.77") |
| price_gbp | number | Clean price (e.g. 51.77) |
| availability_text | string | Raw availability text |
| availability_count | number | Available stock count |
| rating_text | string | Text rating (e.g. "Three") |
| rating_number | number | Numeric rating (0-5) |
| description | string | Book description |
| source_page | string | Source URL |
| fetched_at | string | ISO timestamp |

---

## Sample Run Report

```json
{
  "start_time": "2026-08-07T10:00:00.000Z",
  "duration_seconds": 45.2,
  "catalogue_pages": 3,
  "book_urls_found": 60,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0,
  "cache_used": true
}
```

---

## Why No Browser?

The data is already in the HTML the server sends. A browser would only add cost and complexity.

---

## Ethics Note

- Use an official API when one exists
- Never bypass logins, paywalls, or blocks
- Collect only what you need
- Respect robots.txt
