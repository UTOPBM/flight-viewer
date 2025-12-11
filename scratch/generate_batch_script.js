const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://xcdnbzyhfpphfkqjsesi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZG5ienloZnBwaGZrcWpzZXNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTgxNDgsImV4cCI6MjA3NDg3NDE0OH0.UB3D8frSL-v6gnLOJVPGDTCk0f4CL9BGOlq6Dp8HRZw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('Fetching pending URLs from DB...');

    // Fetch all products where partner_url is null or empty
    const { data, error } = await supabase
        .from('affiliate_products')
        .select('original_url')
        .or('partner_url.is.null,partner_url.eq.""')
        .order('review_count', { ascending: false, nullsFirst: false });

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No pending URLs found.');
        return;
    }

    const urls = data.map(item => item.original_url).filter(url => url);
    console.log(`Found ${urls.length} URLs to convert.`);

    // Read the template script
    const scriptPath = path.join(__dirname, 'browser_automation_script.js');
    let scriptContent = fs.readFileSync(scriptPath, 'utf8');

    // Prepare the new array string with indentation
    const urlListString = urls.map(url => `        "${url}"`).join(',\n');

    // Replace the existing array content
    // We look for "const urlsToConvert = [" and the closing "];"
    const startMarker = 'const urlsToConvert = [';
    const endMarker = '];';

    const startIndex = scriptContent.indexOf(startMarker);
    const endIndex = scriptContent.indexOf(endMarker, startIndex);

    if (startIndex === -1 || endIndex === -1) {
        console.error('Could not find urlsToConvert array in the script file.');
        return;
    }

    const newScriptContent =
        scriptContent.substring(0, startIndex + startMarker.length) +
        '\n' + urlListString + '\n    ' +
        scriptContent.substring(endIndex);

    fs.writeFileSync(scriptPath, newScriptContent);
    console.log(`Successfully updated ${scriptPath} with ${urls.length} URLs.`);
}

main();
