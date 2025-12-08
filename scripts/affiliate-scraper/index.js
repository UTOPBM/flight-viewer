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
            const results = [];
            // Broader selectors: check for offers AND products
            const cards = Array.from(document.querySelectorAll('a[href*="/offers/"], a[href*="/products/"]'));

            const seenUrls = new Set();

            for (const card of cards) {
                // No limit on fetching

                const url = card.href;
                const cleanUrl = url.split('?')[0];

                if (seenUrls.has(cleanUrl)) continue;

                // Title
                const titleEl = card.querySelector('.product-title, [class*="Title"], p > span, .name');

                // Image
                const imgEl = card.querySelector('img');

                // Price
                const priceEl = card.querySelector('[class*="price"], [class*="Price"], strong');

                // Rating
                const ratingEl = card.querySelector('[class*="rating"]');
                const reviewCountEl = card.querySelector('[class*="review"], [color*="gray"]');

                if (titleEl && imgEl) {
                    results.push({
                        title: titleEl.innerText.trim(),
                        original_url: cleanUrl,
                        image_url: imgEl.src,
                        price: priceEl ? priceEl.innerText.replace(/[^0-9]/g, '') : '0',
                        rating: ratingEl ? parseFloat(ratingEl.innerText) : 0,
                        review_count: reviewCountEl ? parseInt(reviewCountEl.innerText.replace(/[^0-9]/g, '')) || 0 : 0
                    });
                    seenUrls.add(cleanUrl);
                }
            }
            return results;
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
    const cities = parseCities(CITIES_FILE);
    console.log(`Loaded ${cities.length} active cities.`);

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
