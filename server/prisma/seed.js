// Run: node prisma/seed.js
// Idempotent: skips users/halls if already seeded (upsert)

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding CampusFlow database...');

    // Create system settings
    await prisma.systemSettings.upsert({
        where: { id: 'singleton' },
        update: {},
        create: { id: 'singleton', registrationEnabled: true, maxAdmins: 20 },
    });

    // Create Super Admin
    const superAdminEmail = 'superadmin@campus.edu';
    const existing = await prisma.user.findUnique({ where: { email: superAdminEmail } });

    if (!existing) {
        const hash = await bcrypt.hash('SuperAdmin@123', 12);
        await prisma.user.create({
            data: {
                name: 'Super Admin',
                email: superAdminEmail,
                passwordHash: hash,
                role: 'SUPER_ADMIN',
                isApproved: true,
            },
        });
        console.log('✅ Super Admin created: superadmin@campus.edu / SuperAdmin@123');
    } else {
        console.log('ℹ️  Super Admin already exists.');
    }

    // Create demo halls
    const halls = [
        { name: 'Main Auditorium', capacity: 800, location: 'Block A, Ground Floor', description: 'Primary venue for large events and ceremonies' },
        { name: 'Seminar Hall 1', capacity: 120, location: 'Block B, Floor 2', description: 'Mid-sized hall for seminars and workshops' },
        { name: 'Seminar Hall 2', capacity: 80, location: 'Block B, Floor 3', description: 'Smaller hall for workshops and meetings' },
        { name: 'Open Amphitheatre', capacity: 500, location: 'Campus Ground', description: 'Outdoor venue for cultural events' },
        { name: 'Conference Room A', capacity: 40, location: 'Admin Block, Floor 1', description: 'Boardroom-style for Faculty meetings' },
    ];

    for (const hall of halls) {
        const existing = await prisma.hall.findFirst({ where: { name: hall.name } });
        if (!existing) {
            await prisma.hall.create({ data: hall });
            console.log(`✅ Hall created: ${hall.name}`);
        }
    }

    // Create a demo admin
    const demoEmail = 'admin@campus.edu';
    const demoAdmin = await prisma.user.findUnique({ where: { email: demoEmail } });
    if (!demoAdmin) {
        const hash = await bcrypt.hash('Admin@1234', 12);
        await prisma.user.create({
            data: {
                name: 'Demo Admin',
                email: demoEmail,
                passwordHash: hash,
                role: 'ADMIN',
                isApproved: true,
            },
        });
        console.log('✅ Demo Admin created: admin@campus.edu / Admin@1234');
    }

    console.log('\n🚀 Seed complete! You can now start the server.');
    console.log('📧 Super Admin: superadmin@campus.edu / SuperAdmin@123');
    console.log('📧 Demo Admin:  admin@campus.edu / Admin@1234');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
