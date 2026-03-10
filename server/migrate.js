require('dotenv').config();
const { Pool } = require('pg');

async function migrate() {
    const pool = new Pool({ connectionString: process.env.DIRECT_URL });
    
    try {
        // User.id is TEXT, so all FKs must be TEXT and we'll generate UUIDs in app code
        console.log('1. Dropping old Organization table if exists (from failed migration)...');
        await pool.query(`DROP TABLE IF EXISTS "OrgMember" CASCADE`);
        await pool.query(`DROP TABLE IF EXISTS "EventReport" CASCADE`);
        await pool.query(`DROP TABLE IF EXISTS "Organization" CASCADE`);
        console.log('   OK');

        console.log('2. Creating Organization table (TEXT ids)...');
        await pool.query(`
            CREATE TABLE "Organization" (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                "logoUrl" TEXT,
                "isActive" BOOLEAN DEFAULT true,
                "createdAt" TIMESTAMPTZ DEFAULT now()
            )
        `);
        console.log('   OK');
        
        console.log('3. Creating OrgMember table...');
        await pool.query(`
            CREATE TABLE "OrgMember" (
                id TEXT PRIMARY KEY,
                "userId" TEXT NOT NULL REFERENCES "User"(id),
                "organizationId" TEXT NOT NULL REFERENCES "Organization"(id),
                role TEXT DEFAULT 'MEMBER',
                permissions TEXT DEFAULT '[]',
                "createdAt" TIMESTAMPTZ DEFAULT now(),
                UNIQUE("userId", "organizationId")
            )
        `);
        console.log('   OK');
        
        console.log('4. Adding organizationId to Event table...');
        await pool.query(`ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "organizationId" TEXT REFERENCES "Organization"(id)`);
        console.log('   OK');

        console.log('5. Adding host contact fields to Event table...');
        await pool.query(`ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "hostEmail" TEXT`);
        await pool.query(`ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "hostPhone" TEXT`);
        console.log('   OK');

        console.log('6. Creating EventReport table...');
        await pool.query(`
            CREATE TABLE "EventReport" (
                id TEXT PRIMARY KEY,
                "eventId" TEXT UNIQUE NOT NULL REFERENCES "Event"(id),
                "createdById" TEXT NOT NULL REFERENCES "User"(id),
                responses TEXT NOT NULL,
                "reportFileUrl" TEXT,
                status TEXT DEFAULT 'DRAFT',
                "createdAt" TIMESTAMPTZ DEFAULT now()
            )
        `);
        console.log('   OK');
        
        console.log('\nAll migrations completed successfully!');
    } catch (err) {
        console.error('Migration error:', err.message);
        console.error('Stack:', err.stack?.split('\n').slice(0, 3).join('\n'));
    }
    
    await pool.end();
}

migrate();
