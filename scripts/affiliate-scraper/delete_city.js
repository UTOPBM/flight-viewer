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

async function main() {
    const city = process.argv[2];
    if (!city) {
        console.error('Please provide a city name');
        process.exit(1);
    }

    console.log(`Deleting products for city: ${city}...`);

    const { error } = await supabase
        .from('affiliate_products')
        .delete()
        .eq('city', city);

    if (error) {
        console.error('Error deleting data:', error);
    } else {
        console.log(`Successfully deleted products for ${city}`);
    }
}

main();
