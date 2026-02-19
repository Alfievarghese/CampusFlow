import { defineConfig } from 'prisma/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    earlyAccess: true,
    schema: path.join(__dirname, 'prisma/schema.prisma'),
    migrate: {
        adapter: async () => {
            const { PrismaLibSQL } = await import('@prisma/adapter-libsql');
            const { createClient } = await import('@libsql/client');
            const dbUrl = process.env.DATABASE_URL || `file:${path.join(__dirname, 'prisma/campusflow.db')}`;
            const client = createClient({ url: dbUrl });
            return new PrismaLibSQL(client);
        },
    },
});
