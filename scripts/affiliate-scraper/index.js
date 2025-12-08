const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY; // Use service key if available for RLS bypass

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const CITIES_FILE = '/Users/kimjaehyeon/.gemini/antigravity/scratch/cities.md';

function parseCities(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const cities = [];

    // Skip header lines (first 2 lines based on file view)
    // Line 2 starts with "ID..."

    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by tab or multiple spaces? File view showed tabs/aligned. 
        // Let's regex split by tab or 2+ spaces
        const parts = line.split(/\t+/);

        if (parts.length < 7) continue;

        // ID	한글명	영어명	공항코드	국가	설명	상태	작업
        const [id, name_ko, name_en, airport_code, country, desc, status] = parts;

        if (status && status.trim() === '활성') {
            cities.push({
                id: id.trim(),
                name_ko: name_ko.trim(),
                name_en: name_en.trim(),
                airport_code: airport_code.trim(),
                country: country.trim()
            });
        }
    }
    return cities;
}

// Ensure tables exist (Basic check/creation logic could go here, but assumes tables created via SQL)
// We will upsert into city_mappings along the way

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            let scrolls = 0;
            const maxScrolls = 30; // Safety limit to prevent timeouts

            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                scrolls++;

                if (totalHeight >= scrollHeight - window.innerHeight || scrolls >= maxScrolls) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
}

async function scrapeCity(browser, city) {
    const page = await browser.newPage();
    try {
        const query = encodeURIComponent(city.name_ko);
        const url = `https://www.myrealtrip.com/search?tab=tour&q=${query}&extra=`;
        console.log(`Scraping ${city.name_ko} (${url})...`);

        // Increase page navigation timeout
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Auto-scroll to trigger lazy loading
        await autoScroll(page);

        // Wait a bit more for final items
        await new Promise(r => setTimeout(r, 2000));

        const products = await page.evaluate(() => {
            const items = [];
            // Selectors for product cards - try multiple common patterns
            const cards = document.querySelectorAll('a[href*="/products/"], a[href*="/offers/"]');

            cards.forEach(card => {
                try {
                    // 1. Title Extraction
                    let title = '';
                    const titleSelectors = [
                        'div > p:nth-of-type(1) > span',
                        '.product-title',
                        '[class*="Title"]',
                        'h2',
                        'h3'
                    ];
                    for (const sel of titleSelectors) {
                        const el = card.querySelector(sel);
                        if (el && el.innerText.trim().length > 0) {
                            title = el.innerText.trim();
                            break;
                        }
                    }

                    // 2. Image Extraction
                    let image_url = '';
                    const imgEl = card.querySelector('img');
                    if (imgEl) {
                        image_url = imgEl.src || imgEl.getAttribute('data-src') || '';
                    }

                    // 3. Price Extraction
                    let price = '0';
                    const priceSelectors = [
                        'div > p:nth-of-type(3) > span', // Standard with rating
                        'div > p:nth-of-type(2) > span', // No rating or different layout
                        '[class*="price"]',
                        '[class*="Price"]'
                    ];
                    for (const sel of priceSelectors) {
                        const el = card.querySelector(sel);
                        if (el && el.innerText.includes('원')) {
                            price = el.innerText.replace(/[^0-9]/g, '');
                            break;
                        }
                    }

                    // 4. Rating & Review Extraction
                    let rating = 0;
                    let review_count = 0;

                    // User feedback: Rating is "4.7" and Review is "(1,210)" in spans.
                    // Scan all spans for these patterns.
                    const spans = Array.from(card.querySelectorAll('span'));
                    for (const span of spans) {
                        const text = span.innerText.trim();

                        // Rating: matches 4.7
                        if (!rating && /^\d{1}\.\d{1}$/.test(text)) {
                            rating = parseFloat(text);
                            continue;
                        }

                        // Review: matches (1,210) or (12)
                        if (!review_count && /^\([\d,]+\)$/.test(text)) {
                            review_count = parseInt(text.replace(/[(),]/g, ''));
                            continue;
                        }
                    }

                    // Fallback to Star search if pattern not found (older cards?)
                    if (rating === 0) {
                        const ratingContainerSelectors = [
                            'div > p:nth-of-type(2)',
                            '[class*="rating"]',
                            '[class*="Rating"]'
                        ];

                        for (const sel of ratingContainerSelectors) {
                            const container = card.querySelector(sel);
                            if (container && container.innerText.includes('★')) {
                                const text = container.innerText;
                                const ratingMatch = text.match(/★\s*([\d.]+)/);
                                const reviewMatch = text.match(/\(([\d,]+)\)/);

                                if (ratingMatch) rating = parseFloat(ratingMatch[1]);
                                if (reviewMatch) review_count = parseInt(reviewMatch[1].replace(/,/g, ''));
                                break;
                            }
                        }
                    }

                    // Link
                    let original_url = card.href;
                    if (original_url.startsWith('/')) {
                        original_url = 'https://www.myrealtrip.com' + original_url;
                    }

                    if (title && price !== '0') {
                        items.push({
                            title,
                            image_url,
                            price,
                            rating,
                            review_count,
                            original_url
                        });
                    }
                } catch (e) {
                    // console.error('Error parsing card', e);
                }
            });
            return items;
        });

        return products;

    } catch (e) {
        console.error(`Error scraping ${city.name_ko}:`, e);
        return [];
    } finally {
        await page.close();
    }
}

async function main() {
    let cities = parseCities(CITIES_FILE);

    const targetCity = process.argv[2];
    if (targetCity) {
        console.log(`Filtering for city: ${targetCity}`);
        cities = cities.filter(c => c.name_en.toLowerCase() === targetCity.toLowerCase() || c.name_ko === targetCity);
    }

    console.log(`Found ${cities.length} cities to scrape.`);

    if (cities.length === 0) {
        console.log("No cities to process.");
        return;
    }

    // Launch browser with headerless mode
    // Need to bypass detection sometimes, but default might work for simple search
    const browser = await puppeteer.launch({
        headless: "new",
        protocolTimeout: 180000, // Increase protocol timeout to 3 minutes
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create mappings first
    for (const city of cities) {
        await supabase.from('city_mappings').upsert({
            airport_code: city.airport_code,
            city_name_ko: city.name_ko,
            city_name_en: city.name_en,
            country: city.country
        });
    }
    console.log("City mappings updated.");

    // Scrape loop
    for (let i = 0; i < cities.length; i++) {
        const city = cities[i];
        const products = await scrapeCity(browser, city);

        // Save ALL products (User request: "Get all raw values")
        console.log(`Saving ${products.length} products for ${city.name_ko}`);

        for (const p of products) {
            // Upsert product
            const { data, error } = await supabase.from('affiliate_products').upsert({
                city: city.name_ko,
                title: p.title,
                image_url: p.image_url,
                price: p.price,
                rating: p.rating,
                review_count: p.review_count,
                original_url: p.original_url,
                // partner_url logic can be added here or later. For now just save generic.
            }, { onConflict: 'original_url' });

            if (error) console.error(`Failed to save ${p.title}:`, error);
        }

        // Rate limit
        if (i < cities.length - 1) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    await browser.close();
    console.log("Done!");
}

main();
