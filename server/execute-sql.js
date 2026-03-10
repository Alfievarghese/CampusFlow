const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function main() {
    try {
        console.log("Enabling RLS on all tables...");
        await prisma.$executeRawUnsafe(sql);
        console.log("RLS Successfully Enabled!");
    } catch (e) {
        console.error("Failed to enable RLS:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
