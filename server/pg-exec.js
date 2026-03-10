require('dotenv').config();
const { Client } = require('pg');

const sql = `
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrgMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Hall" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConflictRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RSVP" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InviteRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
`;

// Remove pgbouncer query param for pg compatibility
const connectionString = process.env.DATABASE_URL.split('?')[0];

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        await client.connect();
        console.log("Connected to Supabase via IPv4 pooler. Enabling RLS...");
        await client.query(sql);
        console.log("RLS Successfully Enabled on all tables!");
    } catch (e) {
        console.error("Failed:", e);
    } finally {
        await client.end();
    }
}

main();
