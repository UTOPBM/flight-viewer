const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

async function createTables() {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
        console.error("DATABASE_URL or POSTGRES_URL not found in .env.local");
        console.log("Please ensure your .env.local contains the connection string.");
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Supabase usually requires SSL
    });

    try {
        await client.connect();
        console.log("Connected to database.");

        const sqlPath = path.resolve(__dirname, '../../scratch/create_affiliate_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        await client.query(sql);
        console.log("Tables created successfully.");

    } catch (err) {
        console.error("Error creating tables:", err);
    } finally {
        await client.end();
    }
}

createTables();
