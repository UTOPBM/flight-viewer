const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Same credentials as before
const SUPABASE_URL = 'https://xcdnbzyhfpphfkqjsesi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZG5ienloZnBwaGZrcWpzZXNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTgxNDgsImV4cCI6MjA3NDg3NDE0OH0.UB3D8frSL-v6gnLOJVPGDTCk0f4CL9BGOlq6Dp8HRZw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('Fetching remaining pending URLs (offset 1000+) from DB...');

    // Fetch products starting from index 1000
    const { data, error } = await supabase
        .from('affiliate_products')
        .select('original_url')
        .or('partner_url.is.null,partner_url.eq.""')
        .order('review_count', { ascending: false, nullsFirst: false })
        .range(1000, 2500); // Fetch the rest (assuming total < 2500)

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No remaining pending URLs found.');
        return;
    }

    const urls = data.map(item => item.original_url).filter(url => url);
    console.log(`Found ${urls.length} leftover URLs to convert.`);

    // Read the template script (use the main one as template)
    const templatePath = path.join(__dirname, 'browser_automation_script.js');
    // Output file
    const outputPath = path.join(__dirname, 'browser_automation_script_rest.js');

    let scriptContent = fs.readFileSync(templatePath, 'utf8');

    // Clean up the template: remove existing URL list if it has one, or just use the logic
    // Actually, `browser_automation_script.js` HAS the 1000 items in it now.
    // We need to replace that huge list with the new small list.

    // Regex or simple string matching. The list starts with `const urlsToConvert = [`
    const startMarker = 'const urlsToConvert = [';
    const endMarker = '];';

    const startIndex = scriptContent.indexOf(startMarker);
    const endIndex = scriptContent.indexOf(endMarker, startIndex);

    if (startIndex === -1 || endIndex === -1) {
        console.error('Could not find urlsToConvert array in the template.');
        return;
    }

    const urlListString = urls.map(url => `        "${url}"`).join(',\n');

    const newScriptContent =
        scriptContent.substring(0, startIndex + startMarker.length) +
        '\n' + urlListString + '\n    ' +
        scriptContent.substring(endIndex);

    // Also change the filename in the instructions comments to avoid confusion
    const finalContent = newScriptContent.replace('affiliate_links_full_result.json', 'affiliate_links_rest_result.json');

    fs.writeFileSync(outputPath, finalContent);
    console.log(`Successfully created ${outputPath} with ${urls.length} URLs.`);
}

main();
