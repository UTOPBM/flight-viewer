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
    console.log('WARNING: This will delete ALL data from "affiliate_products". 5 seconds to cancel...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('Deleting all products...');

    // Delete all rows where id is not null (effectively all rows)
    const { error, count } = await supabase
        .from('affiliate_products')
        .delete({ count: 'exact' })
        .neq('id', 0); // Assuming id is numeric and non-zero, or just use a condition that is always true like "id > -1"

    if (error) {
        console.error('Error clearing table:', error);
        process.exit(1);
    } else {
        console.log(`Successfully deleted ${count} products.`);
    }
}

main();
