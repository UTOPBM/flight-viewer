const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
// path already required above
// const limit = require('p-limit'); // Removed

// Supabase credentials
const SUPABASE_URL = 'https://xcdnbzyhfpphfkqjsesi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZG5ienloZnBwaGZrcWpzZXNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTgxNDgsImV4cCI6MjA3NDg3NDE0OH0.UB3D8frSL-v6gnLOJVPGDTCk0f4CL9BGOlq6Dp8HRZw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('Starting batch update...');

    // Load JSON files
    const fullPath = path.join(__dirname, 'affiliate_links_full_result.json');
    const restPath = path.join(__dirname, 'affiliate_links_rest_result.json');

    let allItems = [];

    if (fs.existsSync(fullPath)) {
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        allItems = allItems.concat(data);
        console.log(`Loaded ${data.length} items from full list.`);
    }

    if (fs.existsSync(restPath)) {
        const data = JSON.parse(fs.readFileSync(restPath, 'utf8'));
        allItems = allItems.concat(data);
        console.log(`Loaded ${data.length} items from rest list.`);
    }

    if (allItems.length === 0) {
        console.error('No items found to update.');
        return;
    }

    console.log(`Total items to update: ${allItems.length}`);

    // Since we don't have bulk update via upsert easily (no PK), we iterate.
    // To speed up, we run in concurrent batches.

    // Chunk size for concurrency
    const CONCURRENCY_LIMIT = 20;
    let successCount = 0;
    let failCount = 0;

    // Helper to process a single item
    const updateItem = async (item, index) => {
        const { original_url, partner_url } = item;
        if (!original_url || !partner_url) return;

        // Try to update using original_url as the key
        const { error } = await supabase
            .from('affiliate_products')
            .update({ partner_url: partner_url })
            .eq('original_url', original_url);

        if (error) {
            console.error(`[${index + 1}] Failed: ${original_url}`, error.message);
            failCount++;
        } else {
            // console.log(`[${index + 1}] Updated: ${original_url}`);
            successCount++;
        }
    };

    // Process in batches
    for (let i = 0; i < allItems.length; i += CONCURRENCY_LIMIT) {
        const chunk = allItems.slice(i, i + CONCURRENCY_LIMIT);
        const promises = chunk.map((item, idx) => updateItem(item, i + idx));
        await Promise.all(promises);

        if ((i + CONCURRENCY_LIMIT) % 100 === 0) {
            console.log(`Progress: ${i + CONCURRENCY_LIMIT}/${allItems.length} (Success: ${successCount}, Fail: ${failCount})`);
        }
    }

    console.log(`Done! Success: ${successCount}, Failed: ${failCount}`);
}

main();
