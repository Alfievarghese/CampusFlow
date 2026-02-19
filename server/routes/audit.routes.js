const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/audit - Get audit logs (Super Admin only)
router.get('/', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const { page = 1, limit = 50, userId, action } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action };

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            include: { user: { select: { name: true, email: true } } },
            orderBy: { timestamp: 'desc' },
            skip,
            take: parseInt(limit),
        }),
        prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
});

module.exports = router;
