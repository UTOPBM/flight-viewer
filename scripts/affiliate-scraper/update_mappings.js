const fs = require('fs');
const path = require('path');
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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const CITIES_FILE = '/Users/kimjaehyeon/.gemini/antigravity/scratch/cities.md';

function parseCities(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const cities = [];

    // Skip header (line 0 and 1 usually)
    // Header: ID	한글명	영어명	공항코드	국가	설명	상태	작업

    for (const line of lines) {
        if (!line.trim()) continue;
        if (line.startsWith('ID')) continue;

        const parts = line.split('\t').map(s => s.trim());
        if (parts.length < 5) continue;

        // Check status
        const status = parts[6];
        if (status !== '활성') continue;

        cities.push({
            id: parts[0],
            name_ko: parts[1],
            name_en: parts[2],
            airport_code: parts[3],
            country: parts[4]
        });
    }
    return cities;
}

async function main() {
    const cities = parseCities(CITIES_FILE);
    console.log(`Found ${cities.length} active cities in cities.md`);

    for (const city of cities) {
        const { error } = await supabase.from('city_mappings').upsert({
            airport_code: city.airport_code,
            city_name_ko: city.name_ko,
            city_name_en: city.name_en,
            country: city.country
        });

        if (error) console.error(`Error updating ${city.name_ko}:`, error);
        else console.log(`Updated mapping for ${city.name_ko} (${city.airport_code})`);
    }
    console.log("Mapping update complete.");
}

main();
