const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            let scrolls = 0;
            const maxScrolls = 30;

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

async function scrapeCity(browser, cityNameForDb, searchQuery) {
    const page = await browser.newPage();
    try {
        const query = encodeURIComponent(searchQuery);
        const url = `https://www.myrealtrip.com/search?tab=tour&q=${query}&extra=`;
        console.log(`Scraping ${cityNameForDb} using query "${searchQuery}" (${url})...`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await autoScroll(page);
        await new Promise(r => setTimeout(r, 2000));

        const products = await page.evaluate(() => {
            const results = [];
            const cards = Array.from(document.querySelectorAll('a[href*="/offers/"], a[href*="/products/"]'));
            const seenUrls = new Set();

            for (const card of cards) {
                const url = card.href;
                const cleanUrl = url.split('?')[0];

                if (seenUrls.has(cleanUrl)) continue;

                const titleEl = card.querySelector('.product-title, [class*="Title"], p > span, .name');
                const imgEl = card.querySelector('img');
                const priceEl = card.querySelector('[class*="price"], [class*="Price"], strong');
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
        console.error(`Error scraping ${cityNameForDb}:`, e);
        return [];
    } finally {
        await page.close();
    }
}

async function main() {
    const browser = await puppeteer.launch({
        headless: "new",
        protocolTimeout: 180000,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const targets = [
        { dbName: '몰디브(말레)', query: '몰디브' },
        { dbName: '발리(덴파사르)', query: '발리' }
    ];

    for (const target of targets) {
        // First, delete existing bad data for these cities if necessary?
        // User said "22 wrong items". It's safer to delete them to avoid mixing bad data.
        const { error: delError } = await supabase
            .from('affiliate_products')
            .delete()
            .eq('city', target.dbName);

        if (delError) console.error(`Error clearing old data for ${target.dbName}:`, delError);
        else console.log(`Cleared old data for ${target.dbName}`);

        const products = await scrapeCity(browser, target.dbName, target.query);
        console.log(`Saving ${products.length} products for ${target.dbName}`);

        for (const p of products) {
            const { error } = await supabase.from('affiliate_products').upsert({
                city: target.dbName,
                title: p.title,
                image_url: p.image_url,
                price: p.price,
                rating: p.rating,
                review_count: p.review_count,
                original_url: p.original_url,
            }, { onConflict: 'original_url' });

            if (error) console.error(`Failed to save ${p.title}:`, error);
        }
    }

    await browser.close();
    console.log("Fix complete!");
}

main();
