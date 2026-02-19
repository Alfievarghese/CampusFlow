const prisma = require('../lib/prisma');

async function auditLog(userId, action, targetId = null, details = null) {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                targetId,
                details: details ? JSON.stringify(details) : null,
            },
        });
    } catch (err) {
        console.error('[AUDIT LOG ERROR]', err.message);
    }
}

module.exports = { auditLog };
